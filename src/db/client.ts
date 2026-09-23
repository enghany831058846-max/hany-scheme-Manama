import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

function resolveTursoCredentials() {
  let dbUrl = (process.env.TURSO_DATABASE_URL || '').trim();
  let authToken = (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined;

  // Auto-detect if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN were swapped in environment configuration
  const isUrlActuallyToken = dbUrl.startsWith('eyJ') || (dbUrl.length > 80 && !dbUrl.includes('://'));
  const isTokenActuallyUrl = authToken && (authToken.startsWith('libsql://') || authToken.startsWith('https://') || authToken.startsWith('http://'));

  if (isUrlActuallyToken && isTokenActuallyUrl) {
    console.log('[Database] Detected swapped TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Automatically swapping them.');
    const temp = dbUrl;
    dbUrl = authToken!;
    authToken = temp;
  } else if (isUrlActuallyToken && !authToken) {
    console.warn('[Database] TURSO_DATABASE_URL contains a JWT token instead of a database URL. Defaulting to file:local.db');
    authToken = dbUrl;
    dbUrl = 'file:local.db';
  }

  // Fallback to local SQLite if URL is empty or invalid
  if (!dbUrl || (!dbUrl.startsWith('libsql://') && !dbUrl.startsWith('https://') && !dbUrl.startsWith('http://') && !dbUrl.startsWith('file:'))) {
    console.warn(`[Database] Database URL "${dbUrl.slice(0, 20)}..." is not a valid protocol. Falling back to local file:local.db`);
    dbUrl = 'file:local.db';
  }

  return { dbUrl, authToken };
}

const { dbUrl, authToken } = resolveTursoCredentials();

export const client = createClient({
  url: dbUrl,
  authToken,
});

export const db = drizzle(client, { schema });

// Ensure table exists on initialization
export async function initDatabase() {
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
}
