import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Loader2,
  Table,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog.tsx';
import { ImportSummaryBanner } from '../components/ImportSummaryBanner.tsx';
import { safeFetchJson } from '../lib/api.ts';
import type { ImportResult } from '../lib/excelMapping.ts';

interface ImportRecordsPageProps {
  onImportComplete: (summary: ImportResult) => void;
  onRefreshData: () => Promise<void>;
}

export function ImportRecordsPage({ onImportComplete, onRefreshData }: ImportRecordsPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overwriteBlank, setOverwriteBlank] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed confirmation modal state
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Please select a valid Excel spreadsheet (.xlsx or .xls)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setResultSummary(null);
    }
  };

  // Upload and process spreadsheet
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read Excel file on device.'));
      });
      reader.readAsDataURL(selectedFile);
      const fileBase64 = await base64Promise;

      const data = await safeFetchJson<{ success: boolean; summary: ImportResult; error?: string }>(
        '/api/projects/import',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64,
            overwriteBlankFields: overwriteBlank,
          }),
        }
      );

      setResultSummary(data.summary);
      onImportComplete(data.summary);
      await onRefreshData();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err?.message || 'Error uploading and processing file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Download sample excel template
  const downloadSampleTemplate = async () => {
    try {
      const res = await fetch('/api/sample-excel');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project_tracking_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Sample download error:', e);
      setErrorMsg('Could not download sample template: ' + (e.message || 'Network error'));
    }
  };

  // Confirm seed demo projects
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      setErrorMsg(null);
      const data = await safeFetchJson<{ success: boolean; seededCount?: number; error?: string }>(
        '/api/seed',
        { method: 'POST' }
      );
      if (data.success) {
        setSeedSuccessMsg(`Successfully seeded ${data.seededCount} sample projects!`);
        setIsSeedConfirmOpen(false);
        await onRefreshData();
      } else {
        setErrorMsg('Failed to seed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setErrorMsg('Failed to seed demo data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Import Records
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload project spreadsheets (.xlsx/.xls), synchronize records, or initialize demo data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Sample Excel</span>
          </button>
        </div>
      </div>

      {/* Success banner if seed completed */}
      {seedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">{seedSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSeedSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Import summary banner if just uploaded */}
      {resultSummary && (
        <ImportSummaryBanner
          summary={resultSummary}
          onDismiss={() => setResultSummary(null)}
          onViewDetails={() => {}}
        />
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Import Notice</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Upload Card + Seed Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Spreadsheet</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an Excel file (.xlsx or .xls). Records are matched and upserted by unique <span className="font-mono font-semibold">Job ID</span>.
            </p>
          </div>

          {/* Drag & drop upload target */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center ${
              selectedFile
                ? 'border-indigo-400 bg-indigo-50/30'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 truncate max-w-sm">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to process
                  </p>
                </div>
                <span className="inline-block text-xs font-semibold text-indigo-600 underline mt-1">
                  Choose different file
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Click to browse or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls)</p>
                </div>
              </div>
            )}
          </div>

          {/* Overwrite Blank Toggle */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <input
              type="checkbox"
              id="overwriteBlank"
              checked={overwriteBlank}
              onChange={(e) => setOverwriteBlank(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="overwriteBlank" className="text-xs text-slate-700 cursor-pointer">
              <span className="font-bold block text-slate-800">Overwrite existing data with blank cells</span>
              <span className="text-slate-500">
                When unchecked (recommended), empty cells in the spreadsheet will preserve existing field values in the database.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {selectedFile && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Spreadsheet...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Execute Spreadsheet Import</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Data & Template Card (1 Col) */}
        <div className="space-y-6">
          {/* Seed Demo Projects */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Seed Demo Records</h3>
                <p className="text-[11px] text-slate-500">Load sample project tracking batch</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Quickly populate the database with realistic sample projects across all supervisors and stages (e.g., Haroon Maqbool, Hany Hamed, Adnan Ebrahim).
            </p>

            <button
              type="button"
              onClick={() => setIsSeedConfirmOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Seed Demo Projects</span>
            </button>
          </div>

          {/* Template Info Card */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Template Columns</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The importer maps standard headers automatically:
            </p>
            <div className="space-y-1 text-[11px] font-mono text-slate-600">
              <div className="p-1.5 rounded bg-white border border-slate-200/70">Job ID / job_id (Primary Key)</div>
              <div className="p-1.5 rounded bg-white border border-slate-200/70">Supervisor / supervisor</div>
              <div className="p-1.5 rounded bg-white border border-slate-200/70">Status / status (Stage)</div>
              <div className="p-1.5 rounded bg-white border border-slate-200/70">Block / Zone / Contractor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Seeding */}
      <Dialog open={isSeedConfirmOpen} onOpenChange={() => !isSeeding && setIsSeedConfirmOpen(false)}>
        <DialogContent maxWidth="max-w-md" onClose={() => !isSeeding && setIsSeedConfirmOpen(false)} className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Seed Demo Projects?
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-xs leading-relaxed">
              This action will insert sample demo projects into your Turso libSQL database. Existing projects with the same Job ID will not be duplicated.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSeeding}
              onClick={() => setIsSeedConfirmOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedData}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Seeding Projects...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Yes, Seed Demo Projects</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
