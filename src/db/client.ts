import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import * as schema from './schema.ts';

// Extract and normalize Turso DB credentials (defensively handle swapped env vars)
let rawUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
let rawToken = process.env.TURSO_AUTH_TOKEN || undefined;

let url = rawUrl;
let authToken = rawToken;

// Check if credentials were inadvertently swapped in the environment:
// e.g. TURSO_DATABASE_URL has JWT ("eyJ...") and TURSO_AUTH_TOKEN has "libsql://..."
if (url.startsWith('eyJ') && (authToken?.startsWith('libsql://') || authToken?.startsWith('https://') || authToken?.startsWith('http://'))) {
  const temp = url;
  url = authToken;
  authToken = temp;
} else if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('file:') && authToken?.startsWith('libsql://')) {
  const temp = url;
  url = authToken;
  authToken = temp;
}

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

// Ensure table exists on initialization and sync local records if needed
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
    console.log(`[Database] Initialized using: ${url.startsWith('file:') ? 'local SQLite (file:local.db)' : 'Turso libSQL Cloud'}`);

    // If using remote Turso and it's empty, seamlessly migrate data from local.db if present
    if (!url.startsWith('file:') && fs.existsSync('local.db')) {
      const countRes = await client.execute('SELECT COUNT(*) as count FROM projects');
      const count = Number(countRes.rows[0]?.count || 0);
      if (count === 0) {
        console.log('[Database] Remote Turso is empty. Migrating existing projects from local.db...');
        try {
          const localClient = createClient({ url: 'file:local.db' });
          const localData = await localClient.execute('SELECT * FROM projects');
          if (localData.rows.length > 0) {
            // Batch in chunks of 50 for quick transmission
            const chunkSize = 50;
            for (let i = 0; i < localData.rows.length; i += chunkSize) {
              const chunk = localData.rows.slice(i, i + chunkSize);
              const statements = chunk.map((row) => {
                const keys = Object.keys(row).filter((k) => k !== 'id');
                const placeholders = keys.map(() => '?').join(', ');
                const values = keys.map((k) => row[k]);
                return {
                  sql: `INSERT OR IGNORE INTO projects (${keys.join(', ')}) VALUES (${placeholders})`,
                  args: values,
                };
              });
              await client.batch(statements, 'write');
            }
            console.log(`[Database] Successfully migrated ${localData.rows.length} projects to remote Turso database!`);
          }
        } catch (migrationErr) {
          console.error('[Database] Notice: Migration from local.db error:', migrationErr);
        }
      }
    }
  } catch (err) {
    console.error('[Database] Error initializing table:', err);
  }
}
