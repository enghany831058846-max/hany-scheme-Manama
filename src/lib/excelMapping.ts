import * as XLSX from 'xlsx';

// Expected Excel header -> DB column name
export const EXCEL_HEADER_MAP: Record<string, string> = {
  'forms.jobdetails.job': 'job_id',
  'job type': 'job_type',
  'status': 'status',
  'forms.jobdetails.phaseworkflow': 'phase_workflow',
  'start date': 'start_date',
  'end date': 'end_date',
  'project supervisor': 'supervisor',
  'progress (%)': 'progress_percent',
  'zone': 'zone',
  'block': 'block',
  'contractor': 'contractor',
  'type project': 'project_type',
  'subtype project': 'project_subtype',
  'last shutdown': 'last_shutdown',
  'construction engineer': 'construction_engineer',
  'workflow entry state date': 'workflow_entry_state_date',
  'po number': 'po_number',
  'work order': 'work_order',
  'supervisor job': 'supervisor_job',
  'substation no.': 'substation_no',
  'substation no': 'substation_no',
  'substation name': 'substation_name',
  'ss depot': 'ss_depot',
  'ss block': 'ss_block',
  'po status': 'po_status',
  'total cost replanned': 'total_cost_replanned',
  'total cost executed': 'total_cost_executed',
  'total cost audited': 'total_cost_audited',
};

// Canonical list of standard headers for export and reference
export const EXPECTED_HEADERS: { header: string; field: string; type: 'text' | 'number' }[] = [
  { header: 'forms.jobDetails.job', field: 'job_id', type: 'text' },
  { header: 'Job type', field: 'job_type', type: 'text' },
  { header: 'Status', field: 'status', type: 'text' },
  { header: 'forms.jobDetails.phaseWorkflow', field: 'phase_workflow', type: 'text' },
  { header: 'Start date', field: 'start_date', type: 'text' },
  { header: 'End date', field: 'end_date', type: 'text' },
  { header: 'Project Supervisor', field: 'supervisor', type: 'text' },
  { header: 'Progress (%)', field: 'progress_percent', type: 'number' },
  { header: 'Zone', field: 'zone', type: 'text' },
  { header: 'Block', field: 'block', type: 'text' },
  { header: 'Contractor', field: 'contractor', type: 'text' },
  { header: 'Type project', field: 'project_type', type: 'text' },
  { header: 'Subtype project', field: 'project_subtype', type: 'text' },
  { header: 'Last shutdown', field: 'last_shutdown', type: 'text' },
  { header: 'Construction Engineer', field: 'construction_engineer', type: 'text' },
  { header: 'Workflow Entry State Date', field: 'workflow_entry_state_date', type: 'text' },
  { header: 'PO Number', field: 'po_number', type: 'text' },
  { header: 'Work order', field: 'work_order', type: 'text' },
  { header: 'Supervisor Job', field: 'supervisor_job', type: 'text' },
  { header: 'Substation No.', field: 'substation_no', type: 'text' },
  { header: 'Substation Name', field: 'substation_name', type: 'text' },
  { header: 'SS Depot', field: 'ss_depot', type: 'text' },
  { header: 'SS Block', field: 'ss_block', type: 'text' },
  { header: 'PO Status', field: 'po_status', type: 'text' },
  { header: 'Total cost replanned', field: 'total_cost_replanned', type: 'number' },
  { header: 'Total cost executed', field: 'total_cost_executed', type: 'number' },
  { header: 'Total cost audited', field: 'total_cost_audited', type: 'number' },
];

export interface ImportResult {
  totalProcessed: number;
  added: number;
  updated: number;
  skipped: number;
  skippedDetails: string[];
  warnings: string[];
  duplicates: string[];
  unmappedHeaders: string[];
  missingHeaders: string[];
}

export function normalizeHeader(header: string): string {
  return header ? header.trim().toLowerCase() : '';
}

/**
 * Format Excel dates (numbers or strings) cleanly to YYYY-MM-DD or readable string
 */
export function formatExcelValue(val: unknown, fieldType: 'text' | 'number'): string | number | null {
  if (val === undefined || val === null || val === '') {
    return null;
  }

  if (fieldType === 'number') {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  }

  // Handle Excel serial date numbers if they appear for date columns
  if (typeof val === 'number') {
    // If it's a date serial like 45123
    if (val > 25000 && val < 60000) {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
          const m = String(dateObj.m).padStart(2, '0');
          const d = String(dateObj.d).padStart(2, '0');
          return `${dateObj.y}-${m}-${d}`;
        }
      } catch {
        // fallback
      }
    }
    return String(val);
  }

  return String(val).trim();
}

/**
 * Parses an Excel file buffer into structured project records matching DB columns
 */
export function parseExcelBuffer(
  buffer: Buffer,
  options: { overwriteBlankFields?: boolean } = {}
): {
  rowsToUpsert: Map<string, Record<string, any>>;
  presentFields: Set<string>;
  skippedRows: string[];
  duplicateJobIds: string[];
  unmappedHeaders: string[];
  missingHeaders: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with headers
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  });

  if (!rawData || rawData.length === 0) {
    throw new Error('The uploaded Excel file contains no data or empty sheets.');
  }

  // Header row
  const headerRow = (rawData[0] as any[]) || [];
  const columnMapping: { [colIndex: number]: { field: string; type: 'text' | 'number' } } = {};
  const presentFields = new Set<string>();
  const unmappedHeaders: string[] = [];

  headerRow.forEach((colHeader, index) => {
    if (!colHeader) return;
    const norm = normalizeHeader(String(colHeader));
    const field = EXCEL_HEADER_MAP[norm];
    if (field) {
      const isNumberField = [
        'progress_percent',
        'total_cost_replanned',
        'total_cost_executed',
        'total_cost_audited',
      ].includes(field);
      columnMapping[index] = { field, type: isNumberField ? 'number' : 'text' };
      presentFields.add(field);
    } else {
      unmappedHeaders.push(String(colHeader).trim());
    }
  });

  // Check which expected headers are missing
  const missingHeaders: string[] = [];
  for (const expected of EXPECTED_HEADERS) {
    if (!presentFields.has(expected.field)) {
      missingHeaders.push(expected.header);
    }
  }

  const rowsToUpsert = new Map<string, Record<string, any>>();
  const skippedRows: string[] = [];
  const duplicateJobIds: string[] = [];
  const seenJobIds = new Set<string>();

  // Process data rows
  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r] as any[];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip entirely empty rows
    }

    const rowObj: Record<string, any> = {};
    for (const [colIndexStr, mapping] of Object.entries(columnMapping)) {
      const colIndex = parseInt(colIndexStr, 10);
      const rawVal = row[colIndex];
      const val = formatExcelValue(rawVal, mapping.type);
      rowObj[mapping.field] = val;
    }

    const jobId = rowObj['job_id'] ? String(rowObj['job_id']).trim() : '';

    if (!jobId) {
      skippedRows.push(`Row ${r + 1}: Missing or empty 'forms.jobDetails.job' (job_id)`);
      continue;
    }

    // Default status if empty
    if (!rowObj['status']) {
      rowObj['status'] = 'Unassigned';
    }

    // Default supervisor if empty
    if (!rowObj['supervisor']) {
      rowObj['supervisor'] = 'Unassigned';
    }

    if (seenJobIds.has(jobId)) {
      if (!duplicateJobIds.includes(jobId)) {
        duplicateJobIds.push(jobId);
      }
    } else {
      seenJobIds.add(jobId);
    }

    // Store in map: last occurrence wins as per specification
    rowsToUpsert.set(jobId, rowObj);
  }

  return {
    rowsToUpsert,
    presentFields,
    skippedRows,
    duplicateJobIds,
    unmappedHeaders,
    missingHeaders,
  };
}

/**
 * Generate a realistic sample Excel file containing projects with supervisors,
 * dynamic English and Arabic statuses, costs, substations, and progress.
 */
export function generateSampleExcelBuffer(): Buffer {
  const sampleData = [
    // Header row
    EXPECTED_HEADERS.map((h) => h.header),
    // Row 1
    [
      'JOB-2024-001',
      'Cable Laying',
      'قيد التنفيذ', // In Progress
      'Phase 2 - Execution',
      '2024-01-15',
      '2024-06-30',
      'Eng. Tariq Al-Mansoor',
      75,
      'North Zone',
      'Block 12',
      'Al-Fanar Contracting',
      'Distribution',
      '11kV Underground',
      '2024-03-01',
      'Ahmed Youssef',
      '2024-01-10',
      'PO-889021',
      'WO-4401',
      'Lead Electrical Engineer',
      'SS-104',
      'Al-Malqa Primary 132/11kV',
      'Central Depot',
      'Zone B-2',
      'Approved',
      450000.0,
      337500.0,
      320000.0,
    ],
    // Row 2
    [
      'JOB-2024-002',
      'Transformer Replacement',
      'متأخر', // Delayed
      'Phase 1 - Procurement',
      '2024-02-01',
      '2024-05-15',
      'Eng. Tariq Al-Mansoor',
      30,
      'North Zone',
      'Block 08',
      'Siemens Energy Tech',
      'Substation Overhaul',
      'Power Transformer 67MVA',
      '2024-02-20',
      'Khalid Al-Ghamdi',
      '2024-01-25',
      'PO-889045',
      'WO-4402',
      'Senior Project Manager',
      'SS-208',
      'King Fahd District Substation',
      'North Depot',
      'Zone A-1',
      'Pending Approval',
      1200000.0,
      360000.0,
      0.0,
    ],
    // Row 3
    [
      'JOB-2024-003',
      'Substation Automation',
      'مكتمل', // Completed
      'Phase 4 - Commissioning & Handover',
      '2023-09-01',
      '2024-02-28',
      'Eng. Tariq Al-Mansoor',
      100,
      'Central Zone',
      'Block 03',
      'Schneider Electric',
      'SCADA Integration',
      'RTU Modernization',
      '2024-02-15',
      'Sami Al-Otaibi',
      '2023-08-20',
      'PO-887110',
      'WO-4299',
      'Lead Electrical Engineer',
      'SS-015',
      'Al-Olaya Central SS',
      'Central Depot',
      'Zone C-4',
      'Closed',
      850000.0,
      850000.0,
      845000.0,
    ],
    // Row 4
    [
      'JOB-2024-004',
      'Overhead Line Reconductoring',
      'قيد التنفيذ', // In Progress
      'Phase 2 - Execution',
      '2024-03-01',
      '2024-09-15',
      'Eng. Sarah Al-Harbi',
      45,
      'East Zone',
      'Block 22',
      'Rawabi Power Corp',
      'Transmission',
      '132kV Line Upgrade',
      '2024-03-25',
      'Noura Al-Dosari',
      '2024-02-18',
      'PO-889200',
      'WO-4510',
      'Transmission Supervisor',
      'SS-312',
      'Al-Khobar East 132kV',
      'East Depot',
      'Zone D-1',
      'Approved',
      1600000.0,
      720000.0,
      680000.0,
    ],
    // Row 5
    [
      'JOB-2024-005',
      'Switchgear Testing',
      'معلق للاعتماد', // Pending Approval
      'Phase 3 - Quality Assurance',
      '2024-04-10',
      '2024-07-20',
      'Eng. Sarah Al-Harbi',
      20,
      'East Zone',
      'Block 15',
      'ABB Technologies',
      'Maintenance',
      'GIS 33kV Switchgear',
      '2024-04-12',
      'Noura Al-Dosari',
      '2024-03-30',
      'PO-889311',
      'WO-4532',
      'Transmission Supervisor',
      'SS-320',
      'Dammam Industrial SS',
      'East Depot',
      'Zone D-3',
      'Issued',
      320000.0,
      64000.0,
      0.0,
    ],
    // Row 6
    [
      'JOB-2024-006',
      'Fiber Optic OPGW Installation',
      'قيد الدراسة', // Under Study
      'Phase 0 - Initiation',
      '2024-05-01',
      '2024-11-30',
      'Eng. Sarah Al-Harbi',
      10,
      'East Zone',
      'Block 30',
      'National Telecom Networks',
      'Communications',
      'OPGW Ground Wire',
      '2024-05-02',
      'Fahad Al-Mutairi',
      '2024-04-15',
      'PO-889450',
      'WO-4580',
      'Network Supervisor',
      'SS-330',
      'Dhahran Gateway SS',
      'East Depot',
      'Zone D-5',
      'Draft',
      520000.0,
      52000.0,
      0.0,
    ],
    // Row 7
    [
      'JOB-2024-007',
      'Feeder Bay Extension',
      'قيد التنفيذ', // In Progress
      'Phase 2 - Execution',
      '2024-02-15',
      '2024-08-30',
      'Eng. Faisal Al-Zahrani',
      60,
      'West Zone',
      'Block 05',
      'Modern Power Systems',
      'Distribution',
      '33kV Bay Extension',
      '2024-03-10',
      'Zaid Al-Husseini',
      '2024-02-01',
      'PO-889150',
      'WO-4488',
      'West Grid Supervisor',
      'SS-405',
      'Jeddah South Hub',
      'West Depot',
      'Zone W-1',
      'Approved',
      780000.0,
      468000.0,
      450000.0,
    ],
    // Row 8
    [
      'JOB-2024-008',
      'Protection Relay Upgrade',
      'متأخر', // Delayed
      'Phase 2 - Execution',
      '2024-01-20',
      '2024-04-30',
      'Eng. Faisal Al-Zahrani',
      50,
      'West Zone',
      'Block 09',
      'GE Vernova Grid',
      'Protection & Control',
      'Digital Distance Relays',
      '2024-03-18',
      'Zaid Al-Husseini',
      '2024-01-12',
      'PO-889090',
      'WO-4420',
      'West Grid Supervisor',
      'SS-412',
      'Makkah Gateway SS',
      'West Depot',
      'Zone W-2',
      'Approved',
      610000.0,
      305000.0,
      280000.0,
    ],
    // Row 9
    [
      'JOB-2024-009',
      'Capacitor Bank Installation',
      'مكتمل', // Completed
      'Phase 4 - Handover',
      '2023-11-01',
      '2024-03-31',
      'Eng. Faisal Al-Zahrani',
      100,
      'West Zone',
      'Block 14',
      'Hitachi Energy',
      'Power Factor Correction',
      '33kV 10MVAR Banks',
      '2024-03-20',
      'Marwan Al-Sayed',
      '2023-10-15',
      'PO-888400',
      'WO-4355',
      'West Grid Supervisor',
      'SS-420',
      'Yanbu Distribution SS',
      'West Depot',
      'Zone W-4',
      'Closed',
      420000.0,
      420000.0,
      418000.0,
    ],
    // Row 10
    [
      'JOB-2024-010',
      'Emergency Ring Main Unit Repair',
      'طارئ / قيد المعالجة', // Emergency / In Remediation
      'Emergency Response',
      '2024-05-10',
      '2024-05-25',
      'Eng. Tariq Al-Mansoor',
      85,
      'North Zone',
      'Block 02',
      'Al-Fanar Contracting',
      'Emergency Repairs',
      'SF6 Gas Ring Main Unit',
      '2024-05-11',
      'Ahmed Youssef',
      '2024-05-10',
      'PO-889600',
      'WO-4601',
      'Lead Electrical Engineer',
      'SS-118',
      'Al-Sahafa District 11kV',
      'Central Depot',
      'Zone B-1',
      'Approved',
      180000.0,
      153000.0,
      150000.0,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
