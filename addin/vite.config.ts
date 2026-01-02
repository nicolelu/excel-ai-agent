import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Find SSL certs from office-addin-dev-certs or local certs folder
function getSSLPaths() {
  const homeDir = homedir();
  const officeCertsDir = `${homeDir}/.office-addin-dev-certs`;

  // Check for office-addin-dev-certs location first
  if (existsSync(`${officeCertsDir}/localhost.key`)) {
    return {
      key: `${officeCertsDir}/localhost.key`,
      cert: `${officeCertsDir}/localhost.crt`,
    };
  }

  // Fallback to local certs folder
  return {
    key: process.env.SSL_KEY_PATH || './certs/localhost-key.pem',
    cert: process.env.SSL_CERT_PATH || './certs/localhost.pem',
  };
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 3000,
    https: getSSLPaths(),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'taskpane.html'),
      },
    },
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
  },
});
