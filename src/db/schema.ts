import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  job_id: text('job_id').notNull().unique(),
  job_type: text('job_type'),
  status: text('status').notNull(),
  phase_workflow: text('phase_workflow'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  supervisor: text('supervisor').notNull(),
  progress_percent: real('progress_percent'),
  zone: text('zone'),
  block: text('block'),
  contractor: text('contractor'),
  project_type: text('project_type'),
  project_subtype: text('project_subtype'),
  last_shutdown: text('last_shutdown'),
  construction_engineer: text('construction_engineer'),
  workflow_entry_state_date: text('workflow_entry_state_date'),
  po_number: text('po_number'),
  work_order: text('work_order'),
  supervisor_job: text('supervisor_job'),
  substation_no: text('substation_no'),
  substation_name: text('substation_name'),
  ss_depot: text('ss_depot'),
  ss_block: text('ss_block'),
  po_status: text('po_status'),
  total_cost_replanned: real('total_cost_replanned'),
  total_cost_executed: real('total_cost_executed'),
  total_cost_audited: real('total_cost_audited'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
