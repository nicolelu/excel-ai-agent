/**
 * Ledger types for idempotency and reconciliation
 */

export interface LedgerEntry {
  id: string;
  workbookFingerprint: string;
  actionType: LedgerActionType;
  normalizedArgs: string;
  artifactId: string;
  artifactName: string;
  createdAt: number;
  lastVerifiedAt: number;
  metadata?: Record<string, unknown>;
}

export type LedgerActionType =
  | 'createSheet'
  | 'createTable'
  | 'createChart'
  | 'createPivotTable'
  | 'addNamedRange';

export interface LedgerQuery {
  workbookFingerprint?: string;
  actionType?: LedgerActionType;
  normalizedArgs?: string;
}

export interface WorkbookFingerprint {
  workbookName: string;
  sheetNamesHash: string;
  computed: string;
}

export interface ReconciliationResult {
  exists: boolean;
  entry?: LedgerEntry;
  verified: boolean;
  needsRecreation: boolean;
}
