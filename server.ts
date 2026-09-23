import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './src/db/client.ts';
import { projects } from './src/db/schema.ts';
import { eq, or, like, and, sql, desc } from 'drizzle-orm';
import {
  parseExcelBuffer,
  generateSampleExcelBuffer,
  EXPECTED_HEADERS,
} from './src/lib/excelMapping.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable JSON body parser with generous limit for base64 Excel files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize DB schema on boot
await initDatabase();

// -------------------------------------------------------------
// Note: Automatic demo seeding is disabled to preserve real imported user projects.
// Demo projects can still be manually seeded via POST /api/seed if desired.
// -------------------------------------------------------------

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

/**
 * GET /api/dashboard/summary
 * Returns aggregated { supervisor, status, count }[] computed live from Turso DB.
 * Also returns overall metric highlights.
 */
app.get('/api/dashboard/summary', async (req: Request, res: Response) => {
  try {
    // 1. Grouped counts: supervisor x status
    const groupResults = await db
      .select({
        supervisor: projects.supervisor,
        status: projects.status,
        count: sql<number>`count(*)`,
      })
      .from(projects)
      .groupBy(projects.supervisor, projects.status)
      .orderBy(projects.supervisor, desc(sql`count(*)`));

    // 2. Metrics summary
    const statsResult = await db
      .select({
        totalProjects: sql<number>`count(*)`,
        totalSupervisors: sql<number>`count(distinct ${projects.supervisor})`,
        totalStatuses: sql<number>`count(distinct ${projects.status})`,
        avgProgress: sql<number>`avg(${projects.progress_percent})`,
        totalCostReplanned: sql<number>`sum(${projects.total_cost_replanned})`,
        totalCostExecuted: sql<number>`sum(${projects.total_cost_executed})`,
      })
      .from(projects);

    const stats = statsResult[0] || {
      totalProjects: 0,
      totalSupervisors: 0,
      totalStatuses: 0,
      avgProgress: 0,
      totalCostReplanned: 0,
      totalCostExecuted: 0,
    };

    // Transform into supervisor card groups:
    // supervisor -> { supervisor, total, statuses: [{ status, count }] }
    const supervisorMap = new Map<string, { supervisor: string; total: number; statuses: { status: string; count: number }[] }>();

    for (const row of groupResults) {
      const sup = row.supervisor || 'Unassigned';
      const count = Number(row.count || 0);
      const st = row.status || 'Unassigned';

      if (!supervisorMap.has(sup)) {
        supervisorMap.set(sup, {
          supervisor: sup,
          total: 0,
          statuses: [],
        });
      }
      const supData = supervisorMap.get(sup)!;
      supData.total += count;
      supData.statuses.push({ status: st, count });
    }

    // Sort statuses within each supervisor card descending by count
    const supervisors = Array.from(supervisorMap.values()).map((s) => ({
      ...s,
      statuses: s.statuses.sort((a, b) => b.count - a.count),
    }));

    // Sort supervisor cards descending by total projects
    supervisors.sort((a, b) => b.total - a.total);

    return res.json({
      success: true,
      stats: {
        totalProjects: Number(stats.totalProjects || 0),
        totalSupervisors: Number(stats.totalSupervisors || 0),
        totalStatuses: Number(stats.totalStatuses || 0),
        avgProgress: Math.round(Number(stats.avgProgress || 0)),
        totalCostReplanned: Number(stats.totalCostReplanned || 0),
        totalCostExecuted: Number(stats.totalCostExecuted || 0),
      },
      supervisors,
      rawGroups: groupResults.map((r) => ({
        supervisor: r.supervisor,
        status: r.status,
        count: Number(r.count),
      })),
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/projects
 * List all projects, optional filters: supervisor, status, search
 */
app.get('/api/projects', async (req: Request, res: Response) => {
  try {
    const { supervisor, status, search } = req.query;

    const conditions: any[] = [];

    if (supervisor && typeof supervisor === 'string') {
      conditions.push(eq(projects.supervisor, supervisor));
    }

    if (status && typeof status === 'string') {
      conditions.push(eq(projects.status, status));
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          like(projects.job_id, q),
          like(projects.substation_name, q),
          like(projects.po_number, q),
          like(projects.supervisor, q),
          like(projects.contractor, q)
        )
      );
    }

    let query = db.select().from(projects);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    // @ts-ignore
    const list = await query.orderBy(desc(projects.updated_at), projects.id);

    return res.json({ success: true, count: list.length, projects: list });
  } catch (err: any) {
    console.error('Error fetching projects:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/projects/:id
 * Single project by ID or job_id
 */
app.get('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const numId = parseInt(idParam, 10);

    let result;
    if (!isNaN(numId)) {
      result = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
    }

    if (!result || result.length === 0) {
      result = await db.select().from(projects).where(eq(projects.job_id, idParam)).limit(1);
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    return res.json({ success: true, project: result[0] });
  } catch (err: any) {
    console.error('Error fetching project:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/projects/:id
 * Update project fields by id or job_id
 */
app.patch('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const updates = { ...req.body };

    // Disallow altering internal ID
    delete updates.id;
    delete updates.created_at;

    updates.updated_at = new Date().toISOString();

    const numId = parseInt(idParam, 10);
    const condition = !isNaN(numId)
      ? eq(projects.id, numId)
      : eq(projects.job_id, idParam);

    await db.update(projects).set(updates).where(condition);

    const updated = await db.select().from(projects).where(condition).limit(1);
    if (!updated || updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found to update' });
    }

    return res.json({ success: true, project: updated[0] });
  } catch (err: any) {
    console.error('Error updating project:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project by id or job_id
 */
app.delete('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const numId = parseInt(idParam, 10);
    const condition = !isNaN(numId)
      ? eq(projects.id, numId)
      : eq(projects.job_id, idParam);

    const existing = await db.select().from(projects).where(condition).limit(1);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await db.delete(projects).where(condition);
    return res.json({ success: true, message: `Project ${idParam} deleted successfully` });
  } catch (err: any) {
    console.error('Error deleting project:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/projects/import
 * Bulk upsert from parsed Excel rows or base64 file data
 * Parsed in the API route using xlsx as specified.
 */
app.post('/api/projects/import', async (req: Request, res: Response) => {
  try {
    const { fileBase64, overwriteBlankFields } = req.body;

    if (!fileBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing fileBase64 in request body. Please provide base64-encoded Excel file content.',
      });
    }

    const cleanBase64 = fileBase64.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Parse with SheetJS inside API route
    const {
      rowsToUpsert,
      presentFields,
      skippedRows,
      duplicateJobIds,
      unmappedHeaders,
      missingHeaders,
    } = parseExcelBuffer(buffer, { overwriteBlankFields: !!overwriteBlankFields });

    let added = 0;
    let updated = 0;

    for (const [jobId, rowData] of rowsToUpsert.entries()) {
      // Check if job_id already exists in DB
      const existing = await db
        .select()
        .from(projects)
        .where(eq(projects.job_id, jobId))
        .limit(1);

      if (existing.length > 0) {
        // Exists: update mapped fields
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        for (const field of presentFields) {
          if (field === 'id' || field === 'job_id') continue;
          const val = rowData[field];

          if (val !== undefined && val !== null && val !== '') {
            updatePayload[field] = val;
          } else if (overwriteBlankFields) {
            updatePayload[field] = null;
          }
          // If val is blank and overwriteBlankFields is false, leave existing value untouched
        }

        await db.update(projects).set(updatePayload).where(eq(projects.job_id, jobId));
        updated++;
      } else {
        // Does not exist: insert as new project
        const insertPayload: Record<string, any> = {
          ...rowData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.insert(projects).values(insertPayload as any);
        added++;
      }
    }

    return res.json({
      success: true,
      summary: {
        totalProcessed: rowsToUpsert.size + skippedRows.length,
        added,
        updated,
        skipped: skippedRows.length,
        skippedDetails: skippedRows,
        warnings: [
          ...(unmappedHeaders.length > 0
            ? [`Unmapped headers ignored: ${unmappedHeaders.join(', ')}`]
            : []),
          ...(missingHeaders.length > 0
            ? [`Missing expected headers: ${missingHeaders.join(', ')}`]
            : []),
          ...(duplicateJobIds.length > 0
            ? [`Duplicate Job IDs in file (last occurrence used): ${duplicateJobIds.join(', ')}`]
            : []),
        ],
        duplicates: duplicateJobIds,
        unmappedHeaders,
        missingHeaders,
      },
    });
  } catch (err: any) {
    console.error('Error during Excel import:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/sample-excel
 * Download a real sample Excel template ready to be imported
 */
app.get('/api/sample-excel', (req: Request, res: Response) => {
  try {
    const buffer = generateSampleExcelBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="project_tracking_sample.xlsx"'
    );
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error generating sample excel:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/seed
 * Manually trigger seed data
 */
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    const sampleBuffer = generateSampleExcelBuffer();
    const { rowsToUpsert } = parseExcelBuffer(sampleBuffer);

    let count = 0;
    for (const [jobId, rowData] of rowsToUpsert.entries()) {
      const existing = await db
        .select()
        .from(projects)
        .where(eq(projects.job_id, jobId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(projects).values(rowData as any);
        count++;
      }
    }

    return res.json({ success: true, seededCount: count });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Vite integration for development / production serving
// -------------------------------------------------------------
async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ProjectFlow Server running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
