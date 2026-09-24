import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Info,
  XCircle,
  Download,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';
import type { ImportResult } from '../lib/excelMapping.ts';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (summary: ImportResult) => void;
}

export function ImportModal({ open, onClose, onImportComplete }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overwriteBlank, setOverwriteBlank] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state whenever it opens to guarantee a clean slate
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setErrorMsg(null);
      setResultSummary(null);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Please select a valid Excel file (.xlsx or .xls)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setResultSummary(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Please drop a valid Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setResultSummary(null);
    }
  };

  const handleImport = async () => {
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

      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          overwriteBlankFields: overwriteBlank,
        }),
      });

      // Defensive response parsing: avoid direct res.json() to prevent Safari WebKit
      // DOMException 12 ("The string did not match the expected pattern") if the response is HTML/text
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (HTTP ${res.status}: ${res.statusText || 'Bad Response'}).`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Import failed with HTTP status ${res.status}`);
      }

      setResultSummary(data.summary);
      onImportComplete(data.summary);
    } catch (err: any) {
      console.error('Import error:', err);
      // Clean up generic WebKit pattern errors into friendly readable message
      const msg = err?.message || 'Error uploading and processing file';
      if (msg.includes('string did not match the expected pattern')) {
        setErrorMsg('The server returned an unparseable response. Please verify the Excel format and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResultSummary(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleTemplate = async () => {
    try {
      const res = await fetch('/api/sample-excel');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project_tracking_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Sample download error:', e);
      setErrorMsg('Could not download sample template: ' + (e.message || 'Network error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent maxWidth="max-w-3xl" onClose={onClose} className="p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Import Project Data (Excel .xlsx / .xls)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Parsed server-side via SheetJS and upserted into Turso libSQL database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-xs mb-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-700 cursor-pointer p-0.5 rounded"
              title="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!resultSummary ? (
          <div className="space-y-4 py-2">
            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors relative ${
                selectedFile
                  ? 'border-indigo-400 bg-indigo-50/30'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
              />

              <div className="h-12 w-12 rounded-full bg-slate-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                <Upload className="h-6 w-6" />
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-indigo-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Click to browse or drag and drop your Excel spreadsheet
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts standard Excel files (.xlsx, .xls)
                  </p>
                </div>
              )}
            </div>

            {/* Config & Options */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overwriteBlank}
                  onChange={(e) => setOverwriteBlank(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">
                    Overwrite blank fields with NULL
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Default is OFF: leaves existing database values untouched when an Excel cell is empty on update.
                  </p>
                </div>
              </label>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Matching is performed on <code className="font-mono font-semibold text-slate-700">forms.jobDetails.job</code></span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Need a template?</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleImport}
                disabled={!selectedFile || isUploading}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-5"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Processing SheetJS Import...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Start Import</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Summary Panel */
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Import Processed Successfully
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Records have been synced with Turso libSQL. The dashboard has refreshed automatically.
                </p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Newly Added
                </span>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                  +{resultSummary.added}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Updated Existing
                </span>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">
                  {resultSummary.updated}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Skipped Rows
                </span>
                <p className={`text-2xl font-bold mt-0.5 ${resultSummary.skipped > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {resultSummary.skipped}
                </p>
              </div>
            </div>

            {/* Skipped rows details */}
            {resultSummary.skippedDetails && resultSummary.skippedDetails.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Skipped Rows ({resultSummary.skippedDetails.length})</span>
                </div>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside max-h-24 overflow-y-auto">
                  {resultSummary.skippedDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate Job IDs flag */}
            {resultSummary.duplicates && resultSummary.duplicates.length > 0 && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>Duplicate Job IDs in File (Last occurrence applied)</span>
                </div>
                <div className="text-xs text-blue-700 font-mono">
                  {resultSummary.duplicates.join(', ')}
                </div>
              </div>
            )}

            {/* Header warnings: Unmapped & Missing */}
            <div className="space-y-2 text-xs">
              {resultSummary.unmappedHeaders && resultSummary.unmappedHeaders.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Unmapped Columns (Ignored gracefully):
                  </span>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {resultSummary.unmappedHeaders.join(', ')}
                  </p>
                </div>
              )}

              {resultSummary.missingHeaders && resultSummary.missingHeaders.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Missing Expected Headers (Skipped for update, null for new):
                  </span>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {resultSummary.missingHeaders.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Done & close */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Import Another File
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              >
                <span>Done</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
