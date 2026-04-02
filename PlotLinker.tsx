'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ParseResult {
  success: boolean;
  project?: {
    id: string;
    title: string;
    crop: string;
    treatmentCount: number;
    trialId?: string;
    protocolId?: string;
    year?: number;
    reps?: number;
    plotWidth?: number;
    plotLength?: number;
    designType?: string;
  };
  warnings: string[];
  parseConfidence: 'high' | 'medium' | 'low';
  error?: string;
  message?: string;
}

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setResult({
        success: false,
        warnings: [],
        parseConfidence: 'low',
        error: 'NOT_PDF',
        message: 'Please upload a PDF file.',
      });
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        warnings: [],
        parseConfidence: 'low',
        error: 'NETWORK_ERROR',
        message: 'Failed to upload. Check your connection and try again.',
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setResult(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <header className="px-8 pt-7 pb-5 border-b border-stone-200 bg-white">
        <h2 className="text-[22px] font-semibold tracking-tight">Upload PDF</h2>
        <p className="text-sm text-soil mt-0.5">Upload ARM-generated spray plans to create project cards automatically</p>
      </header>

      <div className="p-8 max-w-2xl">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all bg-white
            ${dragOver ? 'border-forest bg-green-50/50' : 'border-stone-300 hover:border-forest/50'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
          />
          {uploading ? (
            <>
              <div className="w-8 h-8 border-[2.5px] border-stone-200 border-t-forest rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[15px] font-medium">Parsing {fileName}…</p>
              <p className="text-sm text-soil mt-1">Extracting trial data from ARM format</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-clay mx-auto mb-3" />
              <p className="text-[15px] font-medium">Drop an ARM PDF here, or click to browse</p>
              <p className="text-sm text-soil mt-1">Supports ARM spray plans, trial maps, and protocol files</p>
            </>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6">
            {result.success && result.project ? (
              <SuccessPreview result={result} onReset={reset} onViewProjects={() => router.push('/projects')} />
            ) : (
              <ErrorPreview result={result} onReset={reset} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SuccessPreview({ result, onReset, onViewProjects }: {
  result: ParseResult;
  onReset: () => void;
  onViewProjects: () => void;
}) {
  const p = result.project!;
  const confidence = result.parseConfidence;

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-semibold">Project Created</h3>
        </div>
        <span className={`
          text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full
          ${confidence === 'high' ? 'bg-green-100 text-green-800' :
            confidence === 'medium' ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'}
        `}>
          {confidence} confidence
        </span>
      </div>

      <div className="px-5 py-4">
        <h4 className="text-lg font-semibold tracking-tight mb-3">{p.title}</h4>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          <InfoRow label="Crop" value={p.crop} />
          <InfoRow label="Treatments" value={p.treatmentCount.toString()} />
          <InfoRow label="Year" value={p.year?.toString()} />
          <InfoRow label="Reps" value={p.reps?.toString()} />
          <InfoRow label="Plot Size" value={
            p.plotWidth && p.plotLength ? `${p.plotWidth} × ${p.plotLength} ft` : undefined
          } />
          <InfoRow label="Design" value={p.designType} />
          <InfoRow label="Trial ID" value={p.trialId} mono />
          <InfoRow label="Protocol ID" value={p.protocolId} mono />
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Parse Warnings</span>
            </div>
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 leading-relaxed">{w}</p>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onViewProjects}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-forest text-white hover:bg-forest-light transition"
          >
            View Projects <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-soil hover:bg-stone-50 transition"
          >
            Upload Another
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorPreview({ result, onReset }: { result: ParseResult; onReset: () => void }) {
  return (
    <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-red-200 flex items-center gap-2 bg-red-50">
        <XCircle className="w-5 h-5 text-red-600" />
        <h3 className="text-sm font-semibold text-red-900">Upload Failed</h3>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-bark mb-1">{result.message}</p>
        {result.error === 'NOT_ARM_FORMAT' && (
          <p className="text-xs text-soil mb-4">
            Only ARM-generated files (spray plans, trial maps, protocol descriptions) are supported. 
            For non-ARM documents, create a project manually from the Projects page.
          </p>
        )}
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-soil hover:bg-stone-50 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-soil">{label}</span>
      <span className={`font-medium ${value ? 'text-bark' : 'text-stone-300'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
