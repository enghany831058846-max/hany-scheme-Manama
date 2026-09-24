import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export const DEFAULT_TURSO_URL = 'libsql://manama-dashboard-hanyhamed.aws-ap-south-1.turso.io';
export const DEFAULT_TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAyNzQ5NTMsImlkIjoiMDFhMGNmOTMtMTUwMS03MGMzLThjNTAtZjdhYTIyNzZmYmYwIiwia2lkIjoiazVkZDVaUjdaV0VTSmppYmZSWXFlYS1CM09YaW5Jb29Jd3g2cnBfaFdPcyIsInJpZCI6ImM2OTc0MjBkLTQ4NmItNGIyMy05NWU1LTZiMGQyMDkwMzM4YiJ9.PLO1SD6DQw5V4xbX4g_QvmI9k8V-95ilIez1JxFkLEV_dgK5WcGggDeaHGJrlEvVmyf9Wg_f-Q1OwCPYWoSEDw';

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function resolveTursoCredentials() {
  let dbUrl = cleanEnv(process.env.TURSO_DATABASE_URL);
  let authToken = cleanEnv(process.env.TURSO_AUTH_TOKEN) || undefined;

  // Auto-detect if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN were swapped in environment configuration
  const isUrlActuallyToken = dbUrl.startsWith('eyJ') || (dbUrl.length > 80 && !dbUrl.includes('://'));
  const isTokenActuallyUrl = authToken && (authToken.startsWith('libsql://') || authToken.startsWith('https://') || authToken.startsWith('http://'));

  if (isUrlActuallyToken && isTokenActuallyUrl) {
    console.log('[Database] Detected swapped TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Automatically swapping them.');
    const temp = dbUrl;
    dbUrl = authToken!;
    authToken = temp;
  } else if (isUrlActuallyToken && !authToken) {
    authToken = dbUrl;
    dbUrl = DEFAULT_TURSO_URL;
  } else if (!dbUrl && authToken) {
    dbUrl = DEFAULT_TURSO_URL;
  }

  // If no DB URL provided, use the default Turso URL
  if (!dbUrl) {
    dbUrl = DEFAULT_TURSO_URL;
  }

  // If using default Turso or manama-dashboard and no auth token provided, use default token
  if (!authToken && dbUrl.includes('manama-dashboard')) {
    authToken = DEFAULT_TURSO_AUTH_TOKEN;
  }

  // Protocol validation fallback
  if (!dbUrl.startsWith('libsql://') && !dbUrl.startsWith('https://') && !dbUrl.startsWith('http://') && !dbUrl.startsWith('file:')) {
    console.warn(`[Database] Database URL "${dbUrl.slice(0, 20)}..." has unsupported protocol. Falling back to default Turso cloud DB.`);
    dbUrl = DEFAULT_TURSO_URL;
    authToken = DEFAULT_TURSO_AUTH_TOKEN;
  }

  return { dbUrl, authToken };
}

export const { dbUrl, authToken } = resolveTursoCredentials();

export const client = createClient({
  url: dbUrl,
  authToken,
});

export const db = drizzle(client, { schema });

// Ensure table exists on initialization (cached single-flight promise)
let initPromise: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await client.execute(`
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL UNIQUE,
            job_type TEXT,
            status TEXT NOT NULL,
            phase_workflow TEXT,
            start_date TEXT,
            end_date TEXT,
            supervisor TEXT NOT NULL,
            progress_percent REAL,
            zone TEXT,
            block TEXT,
            contractor TEXT,
            project_type TEXT,
            project_subtype TEXT,
            last_shutdown TEXT,
            construction_engineer TEXT,
            workflow_entry_state_date TEXT,
            po_number TEXT,
            work_order TEXT,
            supervisor_job TEXT,
            substation_no TEXT,
            substation_name TEXT,
            ss_depot TEXT,
            ss_block TEXT,
            po_status TEXT,
            total_cost_replanned REAL,
            total_cost_executed REAL,
            total_cost_audited REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log(`[Database] Initialized using: ${dbUrl.startsWith('file:') ? 'local SQLite (file:local.db)' : `Turso Cloud (${dbUrl.split('.turso.io')[0]}.turso.io)`}`);
      } catch (err) {
        console.error('[Database] Error initializing table:', err);
      }
    })();
  }
  return initPromise;
}
