/**
 * Ledger Service - Handles idempotency tracking via IndexedDB
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  LedgerEntry,
  LedgerQuery,
  WorkbookFingerprint,
  ReconciliationResult,
} from '@shared/types';

interface LedgerDB extends DBSchema {
  entries: {
    key: string;
    value: LedgerEntry;
    indexes: {
      'by-fingerprint': string;
      'by-action': string;
      'by-fingerprint-action': [string, string];
    };
  };
}

const DB_NAME = 'excel-ai-agent-ledger';
const DB_VERSION = 1;

class LedgerService {
  private dbPromise: Promise<IDBPDatabase<LedgerDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<LedgerDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<LedgerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('by-fingerprint', 'workbookFingerprint');
          store.createIndex('by-action', 'actionType');
          store.createIndex('by-fingerprint-action', ['workbookFingerprint', 'actionType']);
        },
      });
    }
    return this.dbPromise;
  }

  async getWorkbookFingerprint(): Promise<WorkbookFingerprint> {
    return Excel.run(async (context) => {
      const workbook = context.workbook;
      workbook.load('name');

      const sheets = workbook.worksheets;
      sheets.load('items/name');

      await context.sync();

      const sheetNames = sheets.items.map(s => s.name).sort();
      const sheetNamesHash = this.hashString(sheetNames.join('|'));

      return {
        workbookName: workbook.name,
        sheetNamesHash,
        computed: `${workbook.name}:${sheetNamesHash}`,
      };
    });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async recordEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'lastVerifiedAt'>): Promise<LedgerEntry> {
    const db = await this.getDB();

    const fullEntry: LedgerEntry = {
      id: `${entry.actionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      lastVerifiedAt: Date.now(),
      ...entry,
    };

    await db.put('entries', fullEntry);
    return fullEntry;
  }

  async findEntry(query: LedgerQuery): Promise<ReconciliationResult> {
    const db = await this.getDB();

    if (query.workbookFingerprint && query.actionType) {
      const entries = await db.getAllFromIndex(
        'entries',
        'by-fingerprint-action',
        [query.workbookFingerprint, query.actionType]
      );

      // Filter by normalized args if provided
      const matches = query.normalizedArgs
        ? entries.filter(e => e.normalizedArgs === query.normalizedArgs)
        : entries;

      if (matches.length > 0) {
        const entry = matches[0];
        const verified = await this.verifyEntry(entry);

        return {
          exists: true,
          entry,
          verified,
          needsRecreation: !verified,
        };
      }
    }

    return {
      exists: false,
      verified: false,
      needsRecreation: false,
    };
  }

  private async verifyEntry(entry: LedgerEntry): Promise<boolean> {
    try {
      return await Excel.run(async (context) => {
        switch (entry.actionType) {
          case 'createSheet': {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            return sheets.items.some(s => s.name === entry.artifactName);
          }

          case 'createChart': {
            const sheets = context.workbook.worksheets;
            sheets.load('items');
            await context.sync();

            for (const sheet of sheets.items) {
              const charts = sheet.charts;
              charts.load('items/name');
              await context.sync();
              if (charts.items.some(c => c.name === entry.artifactName)) {
                return true;
              }
            }
            return false;
          }

          case 'createPivotTable': {
            const sheets = context.workbook.worksheets;
            sheets.load('items');
            await context.sync();

            for (const sheet of sheets.items) {
              const pivots = sheet.pivotTables;
              pivots.load('items/name');
              await context.sync();
              if (pivots.items.some(p => p.name === entry.artifactName)) {
                return true;
              }
            }
            return false;
          }

          case 'createTable': {
            const tables = context.workbook.tables;
            tables.load('items/name');
            await context.sync();
            return tables.items.some(t => t.name === entry.artifactName);
          }

          default:
            return true;
        }
      });
    } catch (e) {
      console.warn('Failed to verify ledger entry:', e);
      return false;
    }
  }

  async updateVerification(entryId: string): Promise<void> {
    const db = await this.getDB();
    const entry = await db.get('entries', entryId);

    if (entry) {
      entry.lastVerifiedAt = Date.now();
      await db.put('entries', entry);
    }
  }

  async getEntriesForWorkbook(fingerprint: string): Promise<LedgerEntry[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('entries', 'by-fingerprint', fingerprint);
  }

  async clearEntriesForWorkbook(fingerprint: string): Promise<void> {
    const db = await this.getDB();
    const entries = await this.getEntriesForWorkbook(fingerprint);

    const tx = db.transaction('entries', 'readwrite');
    for (const entry of entries) {
      tx.store.delete(entry.id);
    }
    await tx.done;
  }

  async generateUniqueName(baseName: string, existingNames: string[]): Promise<string> {
    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    let counter = 2;
    let newName = `${baseName} (${counter})`;

    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }

    return newName;
  }
}

export const ledgerService = new LedgerService();
