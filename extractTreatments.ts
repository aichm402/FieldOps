'use client';

import { useState } from 'react';
import { Project, updateProject, deleteProject } from '@/hooks/useProjects';
import TreatmentTable from './TreatmentTable';
import { X, Trash2, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProjectDetail({ project, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [showTreatments, setShowTreatments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plantingDate: project.plantingDate?.split('T')[0] || '',
    emergenceDate: project.emergenceDate?.split('T')[0] || '',
    preAppDate: project.preAppDate?.split('T')[0] || '',
    postAppDate: project.postAppDate?.split('T')[0] || '',
    notes: project.notes || '',
  });

  let contacts: Record<string, string> = {};
  try {
    contacts = project.contacts ? JSON.parse(project.contacts) : {};
  } catch { /* empty */ }

  const handleSave = async () => {
    setSaving(true);
    await updateProject(project.id, {
      plantingDate: form.plantingDate || null,
      emergenceDate: form.emergenceDate || null,
      preAppDate: form.preAppDate || null,
      postAppDate: form.postAppDate || null,
      notes: form.notes || null,
    } as Partial<Project>);
    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm('Delete this project? This cannot be undone.')) {
      await deleteProject(project.id);
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl mb-4 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-lg font-semibold tracking-tight">{project.title}</h3>
          <div className="flex gap-3 mt-1 text-xs text-soil">
            {project.trialId && <span>Trial: <span className="font-mono text-bark">{project.trialId}</span></span>}
            {project.protocolId && <span>Protocol: <span className="font-mono text-bark">{project.protocolId}</span></span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.pdfFilename && (
            <span className="text-[11px] text-clay flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {project.pdfFilename}
            </span>
          )}
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-stone-100 text-clay">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Info grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-soil mb-2">Details</h4>
            <div className="space-y-1.5 text-sm">
              <Row label="Crop" value={project.crop} />
              <Row label="Year" value={project.year?.toString()} />
              <Row label="Reps" value={project.reps?.toString()} />
              <Row label="Design" value={project.designType} />
              <Row label="Plot" value={
                project.plotWidth && project.plotLength
                  ? `${project.plotWidth} × ${project.plotLength} ft`
                  : undefined
              } />
              <Row label="Location" value={project.location} />
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-soil mb-2">Contacts</h4>
            <div className="space-y-1.5 text-sm">
              <Row label="Director" value={contacts.studyDirector} />
              <Row label="Sponsor" value={contacts.sponsor} />
              <Row label="Investigator" value={contacts.investigator} />
              <Row label="Cooperator" value={contacts.cooperator} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-soil">
                Dates & Notes
              </h4>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[11px] text-forest font-medium hover:underline"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-[11px] text-forest font-medium hover:underline flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-[11px] text-clay hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                {[
                  { label: 'Planting Date', key: 'plantingDate' },
                  { label: 'Emergence Date', key: 'emergenceDate' },
                  { label: 'PRE Application', key: 'preAppDate' },
                  { label: 'POST Application', key: 'postAppDate' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-[11px] text-soil block mb-0.5">{label}</label>
                    <input
                      type="date"
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full text-sm border border-stone-200 rounded px-2 py-1 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest/20"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] text-soil block mb-0.5">Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full text-sm border border-stone-200 rounded px-2 py-1 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest/20 resize-none"
                    placeholder="Add project notes…"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <Row label="Planting" value={fmtDate(project.plantingDate)} />
                <Row label="Emergence" value={fmtDate(project.emergenceDate)} />
                <Row label="PRE" value={fmtDate(project.preAppDate)} />
                <Row label="POST" value={fmtDate(project.postAppDate)} />
                {project.notes && (
                  <p className="text-sm text-bark mt-2 italic">{project.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Objectives */}
        {project.objectives && (
          <div className="mb-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-soil mb-1">Objectives</h4>
            <p className="text-sm text-bark leading-relaxed">{project.objectives}</p>
          </div>
        )}

        {/* Treatments toggle */}
        <div className="border-t border-stone-200 pt-4">
          <button
            onClick={() => setShowTreatments(!showTreatments)}
            className="flex items-center gap-2 text-sm font-medium text-forest hover:text-forest-light transition"
          >
            {showTreatments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showTreatments ? 'Hide' : 'Show'} Treatment Table ({project.treatmentCount} treatments)
          </button>

          {showTreatments && project.treatments && (
            <div className="mt-3">
              <TreatmentTable treatments={project.treatments} />
            </div>
          )}
        </div>

        {/* Delete button */}
        <div className="border-t border-stone-200 mt-5 pt-4 flex justify-end">
          <button
            onClick={handleDelete}
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 transition"
          >
            <Trash2 className="w-3 h-3" />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-soil">{label}</span>
      <span className={`font-medium ${value ? 'text-bark' : 'text-stone-300'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return undefined;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
