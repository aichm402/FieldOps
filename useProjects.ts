'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFields, uploadField, createPlot, type FieldPlot } from '@/hooks/useFields';
import { useProjects } from '@/hooks/useProjects';
import FieldCanvas from '@/components/map/FieldCanvas';
import FieldUpload from '@/components/map/FieldUpload';
import PlotLinker from '@/components/map/PlotLinker';
import PlotSidebar from '@/components/map/PlotSidebar';
import {
  Map as MapIcon,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { deleteField } from '@/hooks/useFields';

interface Point {
  x: number;
  y: number;
}

export default function MapPage() {
  const { fields, isLoading: fieldsLoading, mutate: mutateFields } = useFields();
  const { projects } = useProjects();
  const router = useRouter();

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showFieldSelect, setShowFieldSelect] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<Point[] | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Auto-select first field
  const activeField = fields.find(f => f.id === selectedFieldId) || fields[0] || null;

  const handleFieldUpload = async (file: File, name: string) => {
    setUploading(true);
    try {
      const field = await uploadField(file, name);
      await mutateFields();
      setSelectedFieldId(field.id);
      setShowUpload(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFieldDelete = async () => {
    if (!activeField) return;
    if (!confirm(`Delete "${activeField.name}" and all its plot polygons?`)) return;
    await deleteField(activeField.id);
    setSelectedFieldId(null);
    mutateFields();
  };

  const handlePolygonComplete = useCallback((points: Point[]) => {
    setPendingPolygon(points);
    setIsDrawing(false);
  }, []);

  const handleProjectLink = async (projectId: string) => {
    if (!pendingPolygon || !activeField) return;
    await createPlot({
      fieldId: activeField.id,
      projectId,
      polygonData: pendingPolygon,
    });
    setPendingPolygon(null);
    mutateFields();
  };

  const handlePlotClick = useCallback((plot: FieldPlot) => {
    setSelectedPlotId(prev => prev === plot.id ? null : plot.id);
  }, []);

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects?selected=${projectId}`);
  };

  return (
    <>
      <header className="px-8 pt-7 pb-5 border-b border-stone-200 bg-white">
        <h2 className="text-[22px] font-semibold tracking-tight">Map</h2>
        <p className="text-sm text-soil mt-0.5">
          Visualize project locations on satellite imagery
        </p>
      </header>

      <div className="p-6">
        {fieldsLoading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-forest rounded-full animate-spin mx-auto" />
          </div>
        ) : fields.length === 0 && !showUpload ? (
          /* Empty state - no fields uploaded yet */
          <div className="text-center py-16 bg-white border border-stone-200 rounded-xl">
            <MapIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No field images yet</h3>
            <p className="text-sm text-soil max-w-md mx-auto mb-6">
              Upload a satellite image of your research field to start drawing project plot
              boundaries. Each field can have multiple project plots drawn on it.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-forest text-white hover:bg-forest-light transition"
            >
              <Plus className="w-4 h-4" />
              Upload Field Image
            </button>
          </div>
        ) : (
          /* Main map interface */
          <div className="flex gap-4">
            {/* Left: Canvas */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center gap-3 mb-3">
                {/* Field selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowFieldSelect(!showFieldSelect)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-stone-200 hover:bg-stone-50 transition min-w-[180px]"
                  >
                    <Layers className="w-4 h-4 text-forest" />
                    <span className="flex-1 text-left truncate">
                      {activeField?.name || 'Select field'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-clay" />
                  </button>

                  {showFieldSelect && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-stone-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      {fields.map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFieldId(f.id);
                            setShowFieldSelect(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 transition ${
                            f.id === activeField?.id ? 'bg-green-50 font-medium' : ''
                          }`}
                        >
                          {f.name}
                          <span className="text-[10px] text-clay ml-2">
                            {f.plots?.length || 0} plot{(f.plots?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => { setShowUpload(true); setShowFieldSelect(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-forest font-medium hover:bg-green-50 transition border-t border-stone-100 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add new field
                      </button>
                    </div>
                  )}
                </div>

                {/* Draw mode toggle */}
                <button
                  onClick={() => {
                    setIsDrawing(!isDrawing);
                    setPendingPolygon(null);
                  }}
                  disabled={!activeField}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isDrawing
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-white border border-stone-200 text-bark hover:bg-stone-50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isDrawing ? 'Drawing…' : 'Draw Plot'}
                </button>

                <div className="flex-1" />

                {/* Delete field */}
                {activeField && (
                  <button
                    onClick={handleFieldDelete}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 border border-red-200 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Field
                  </button>
                )}
              </div>

              {/* Canvas */}
              {activeField ? (
                <FieldCanvas
                  imagePath={activeField.imagePath}
                  plots={activeField.plots || []}
                  isDrawing={isDrawing}
                  onPolygonComplete={handlePolygonComplete}
                  onPlotClick={handlePlotClick}
                  selectedPlotId={selectedPlotId}
                />
              ) : showUpload ? null : (
                <div className="h-[600px] bg-stone-100 rounded-lg flex items-center justify-center text-sm text-soil">
                  Select a field to view
                </div>
              )}

              {/* Link polygon dialog */}
              {pendingPolygon && (
                <div className="mt-3 max-w-md">
                  <PlotLinker
                    projects={projects}
                    onSelect={handleProjectLink}
                    onCancel={() => setPendingPolygon(null)}
                  />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-64 shrink-0">
              {showUpload ? (
                <FieldUpload onUpload={handleFieldUpload} uploading={uploading} />
              ) : activeField ? (
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-stone-200">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-soil">
                      Plots ({activeField.plots?.length || 0})
                    </h3>
                  </div>
                  <PlotSidebar
                    plots={activeField.plots || []}
                    selectedPlotId={selectedPlotId}
                    onPlotSelect={handlePlotClick}
                    onPlotDeleted={() => mutateFields()}
                    onNavigateToProject={handleNavigateToProject}
                  />
                </div>
              ) : null}

              {/* Show upload button when field is active */}
              {activeField && !showUpload && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 text-soil hover:bg-stone-50 transition"
                >
                  <Plus className="w-3 h-3" />
                  Add another field
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
