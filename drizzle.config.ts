import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const DEFAULT_TURSO_URL = 'libsql://manama-dashboard-hanyhamed.aws-ap-south-1.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAyNzQ5NTMsImlkIjoiMDFhMGNmOTMtMTUwMS03MGMzLThjNTAtZjdhYTIyNzZmYmYwIiwia2lkIjoiazVkZDVaUjdaV0VTSmppYmZSWXFlYS1CM09YaW5Jb29Jd3g2cnBfaFdPcyIsInJpZCI6ImM2OTc0MjBkLTQ4NmItNGIyMy05NWU1LTZiMGQyMDkwMzM4YiJ9.PLO1SD6DQw5V4xbX4g_QvmI9k8V-95ilIez1JxFkLEV_dgK5WcGggDeaHGJrlEvVmyf9Wg_f-Q1OwCPYWoSEDw';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_AUTH_TOKEN,
  },
});
