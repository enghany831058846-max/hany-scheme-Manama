# ProjectFlow - Full-Stack Enterprise Project Tracking & Dispatch Dashboard

A high-performance, full-stack project tracking web application built with **Turso (libSQL)**, **Drizzle ORM**, **SheetJS (xlsx)**, **React / Next.js / Express**, **Tailwind CSS**, and **shadcn/ui** components.

---

## 🌟 Key Features

1. **Dynamic Supervisor Dispatch Cards**:
   - Grid of cards dynamically driven by distinct values of `supervisor` (`Project Supervisor`).
   - No hardcoded statuses anywhere: statuses are dynamically computed live from whatever values currently exist in the database (supports Arabic and English simultaneously, e.g. "قيد التنفيذ: 5", "متأخر: 2").
   - Statuses inside each supervisor card are sorted descending by count.
   - Deterministic color hashing: dynamically generated statuses are automatically assigned harmonious, high-contrast badge colors without hardcoding.

2. **Excel Import Engine (SheetJS / xlsx)**:
   - File picker restricted to `.xlsx` and `.xls`.
   - Exact case-insensitive header matching with whitespace trimming based on the enterprise schema specification.
   - Upsert logic on `forms.jobDetails.job` (`job_id`): updates existing records, inserts new ones, and never deletes missing projects.
   - Configurable "Overwrite blank fields" option (default OFF).
   - Duplicate `job_id` handling (applies the last occurrence in file and flags in summary).
   - Summary panel detailing Added, Updated, Skipped (with specific reasons), Duplicates, and warnings for missing or unmapped columns.
   - Pre-built downloadable sample Excel template for instantaneous testing.

3. **Slide-Over & Project Details with Inline Editing**:
   - Click any status row or supervisor to view all associated projects with columns: `job_id`, `job_type`, `status`, `progress_percent`, `end_date`, `substation_name`, `po_number`.
   - Click any project to open a complete 27-field inspection & edit view.
   - Save updates via `PATCH /api/projects/:id` which automatically updates Turso libSQL and immediately re-aggregates dashboard metrics.

4. **Global Search & Filter Bar**:
   - Filter cards by supervisor name or search projects by `job_id`, `substation_name`, `po_number`, or contractor.
   - Dynamic status filter dropdown and quick-filter chips.

---

## 🏗️ Architecture & Database Schema

### Table `projects` (Drizzle ORM / Turso libSQL)

| DB Column | Source Excel Header | Type | Notes |
|---|---|---|---|
| `id` | — | `INTEGER PK` | Autoincrement internal ID |
| `job_id` | `forms.jobDetails.job` | `TEXT UNIQUE NOT NULL` | Unique matching key for upsert |
| `job_type` | `Job type` | `TEXT` | Job category/type |
| `status` | `Status` | `TEXT NOT NULL` | Dynamic status string |
| `phase_workflow` | `forms.jobDetails.phaseWorkflow`| `TEXT` | Workflow phase |
| `start_date` | `Start date` | `TEXT (date)` | Project start |
| `end_date` | `End date` | `TEXT (date)` | Project completion target |
| `supervisor` | `Project Supervisor` | `TEXT NOT NULL` | Primary grouping key for cards |
| `progress_percent`| `Progress (%)` | `REAL` | 0-100% completion |
| `zone` | `Zone` | `TEXT` | Geographical zone |
| `block` | `Block` | `TEXT` | Block identifier |
| `contractor` | `Contractor` | `TEXT` | Executing contractor |
| `project_type` | `Type project` | `TEXT` | Project primary type |
| `project_subtype` | `Subtype project` | `TEXT` | Project subtype |
| `last_shutdown` | `Last shutdown` | `TEXT` | Last shutdown record |
| `construction_engineer` | `Construction Engineer` | `TEXT` | Engineer assigned |
| `workflow_entry_state_date` | `Workflow Entry State Date` | `TEXT (date)` | Entry state timestamp |
| `po_number` | `PO Number` | `TEXT` | Purchase order reference |
| `work_order` | `Work order` | `TEXT` | Work order reference |
| `supervisor_job` | `Supervisor Job` | `TEXT` | Supervisor's title/job |
| `substation_no` | `Substation No.` | `TEXT` | Substation numeric ID |
| `substation_name` | `Substation Name` | `TEXT` | Substation title |
| `ss_depot` | `SS Depot` | `TEXT` | Depot depot |
| `ss_block` | `SS Block` | `TEXT` | Depot block |
| `po_status` | `PO Status` | `TEXT` | PO workflow status |
| `total_cost_replanned` | `Total cost replanned` | `REAL` | Replanned cost |
| `total_cost_executed` | `Total cost executed` | `REAL` | Executed cost |
| `total_cost_audited` | `Total cost audited` | `REAL` | Audited cost |
| `created_at` | — | `TEXT / TIMESTAMP` | Default `CURRENT_TIMESTAMP` |
| `updated_at` | — | `TEXT / TIMESTAMP` | Updated on every edit |

---

## 🚀 API Routes

- `GET /api/dashboard/summary` — Returns `{ supervisor, total, statuses: [{ status, count }] }[]` computed live from database with aggregate KPIs.
- `GET /api/projects` — Lists projects with optional filters: `?supervisor=...&status=...&search=...`.
- `GET /api/projects/:id` — Fetches a single project by numeric ID or `job_id`.
- `PATCH /api/projects/:id` — Updates project fields and sets `updated_at`.
- `POST /api/projects/import` — Parses base64 Excel spreadsheet via SheetJS in the route, validates columns, executes upsert by `job_id`, and returns a detailed summary.
- `GET /api/sample-excel` — Generates and downloads a valid `.xlsx` spreadsheet matching all expected headers.

---

## 🛠️ Connecting Turso (libSQL)

### 1. Install Turso CLI & Create Database
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up / Log in
turso auth signup
turso auth login

# Create a database
turso db create projectflow-db

# Get the Database URL
turso db show projectflow-db --url
# Outputs e.g.: libsql://projectflow-db-yourorg.turso.io

# Create an authentication token
turso db tokens create projectflow-db
```

### 2. Configure Environment Variables
Create or update `.env`:
```env
TURSO_DATABASE_URL="libsql://projectflow-db-yourorg.turso.io"
TURSO_AUTH_TOKEN="your-turso-jwt-token"
```

> **Zero-Config Local Mode**: If `TURSO_DATABASE_URL` is omitted or empty, the application automatically uses `file:local.db` via libSQL embedded engine, allowing instant out-of-the-box local development!

### 3. Generate & Push Schema Migrations
```bash
npm run db:generate
npm run db:push
```

---

## ☁️ Deploying to Vercel

### Option A: Standard Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Link and deploy
vercel

# Add Turso environment variables to Vercel project
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub & Vercel Dashboard
1. Push your repository to GitHub / GitLab.
2. In the Vercel Dashboard, click **Add New...** -> **Project**.
3. Import the repository.
4. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL`: Your Turso DB URL (e.g. `libsql://projectflow-db.turso.io`)
   - `TURSO_AUTH_TOKEN`: Your Turso Auth Token
5. Click **Deploy**.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (runs full-stack Express API + Vite frontend)
npm run dev

# 3. Open in your browser
# http://localhost:3000
```
