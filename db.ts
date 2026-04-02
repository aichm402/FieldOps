'use client';

import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useFields } from '@/hooks/useFields';
import { Settings, Database, Trash2, HardDrive, Info } from 'lucide-react';

export default function SettingsPage() {
  const { projects, mutate: mutateProjects } = useProjects();
  const { fields, mutate: mutateFields } = useFields();
  const [clearing, setClearing] = useState(false);

  const totalTreatments = projects.reduce((sum, p) => sum + p.treatmentCount, 0);
  const totalPlots = fields.reduce((sum, f) => sum + (f.plots?.length || 0), 0);

  const handleClearAll = async () => {
    if (!confirm('Delete ALL projects, fields, and plots? This cannot be undone.')) return;
    if (!confirm('Are you sure? This will remove all data from FieldOps.')) return;

    setClearing(true);
    try {
      // Delete all projects (cascades to treatments and field plots)
      for (const p of projects) {
        await fetch(`/api/projects/${p.id}`, { method: 'DELETE' });
      }
      // Delete all fields
      for (const f of fields) {
        await fetch(`/api/fields/${f.id}`, { method: 'DELETE' });
      }
      mutateProjects();
      mutateFields();
    } catch (err) {
      console.error('Clear failed:', err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <header className="px-8 pt-7 pb-5 border-b border-stone-200 bg-white">
        <h2 className="text-[22px] font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-soil mt-0.5">System information and data management</p>
      </header>

      <div className="p-8 max-w-2xl">
        {/* About */}
        <section className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-forest" />
            About FieldOps
          </h3>
          <div className="space-y-2 text-sm">
            <Row label="Version" value="0.1.0" />
            <Row label="Stack" value="Next.js + SQLite + Prisma + fabric.js" />
            <Row label="Mode" value="Local / Offline" />
            <Row label="PDF Parser" value="pdfjs-dist (rule-based ARM extraction)" />
          </div>
        </section>

        {/* Database stats */}
        <section className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-forest" />
            Database
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            {[
              { label: 'Projects', value: projects.length },
              { label: 'Treatments', value: totalTreatments },
              { label: 'Fields', value: fields.length },
              { label: 'Plot polygons', value: totalPlots },
            ].map(({ label, value }) => (
              <div key={label} className="bg-stone-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-soil uppercase tracking-wider">{label}</p>
                <p className="font-mono text-xl font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-clay">
            Data stored in <code className="font-mono text-[11px] bg-stone-100 px-1 rounded">prisma/dev.db</code> (SQLite)
          </p>
        </section>

        {/* Storage */}
        <section className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-forest" />
            File storage
          </h3>
          <div className="space-y-2 text-sm">
            <Row label="PDF files" value={`public/uploads/pdfs/ (${projects.filter(p => p.pdfFilename).length} files)`} />
            <Row label="Field images" value={`public/uploads/fields/ (${fields.length} files)`} />
          </div>
        </section>

        {/* Data management */}
        <section className="bg-white border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-red-700">
            <Trash2 className="w-4 h-4" />
            Data management
          </h3>
          <p className="text-sm text-soil mb-4">
            Remove all projects, treatments, fields, and plot polygons from the database.
            Uploaded PDF and image files in the uploads directory will remain on disk.
          </p>
          <button
            onClick={handleClearAll}
            disabled={clearing || (projects.length === 0 && fields.length === 0)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearing ? 'Clearing…' : 'Clear all data'}
          </button>
        </section>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-soil">{label}</span>
      <span className="font-medium text-bark">{value}</span>
    </div>
  );
}
