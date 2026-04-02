'use client';

import { FieldPlot, deletePlot } from '@/hooks/useFields';
import { Trash2, ExternalLink } from 'lucide-react';

const CROP_COLORS: Record<string, string> = {
  Corn: '#E5A820', Soybean: '#6B8E23', Popcorn: '#D2691E',
  Noncrop: '#8B7355', Unknown: '#A8A29E',
};

interface Props {
  plots: FieldPlot[];
  selectedPlotId: string | null;
  onPlotSelect: (plot: FieldPlot) => void;
  onPlotDeleted: () => void;
  onNavigateToProject: (projectId: string) => void;
}

export default function PlotSidebar({
  plots,
  selectedPlotId,
  onPlotSelect,
  onPlotDeleted,
  onNavigateToProject,
}: Props) {
  const handleDelete = async (e: React.MouseEvent, plotId: string) => {
    e.stopPropagation();
    if (confirm('Remove this plot polygon?')) {
      await deletePlot(plotId);
      onPlotDeleted();
    }
  };

  if (plots.length === 0) {
    return (
      <div className="text-center py-8 text-soil text-xs">
        <p>No plots drawn yet.</p>
        <p className="mt-1">Use the draw tool to add project plots.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100">
      {plots.map(plot => {
        const color = plot.project
          ? CROP_COLORS[plot.project.crop] || CROP_COLORS.Unknown
          : plot.color;
        const isSelected = plot.id === selectedPlotId;

        return (
          <div
            key={plot.id}
            onClick={() => onPlotSelect(plot)}
            className={`
              flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition
              ${isSelected ? 'bg-green-50' : 'hover:bg-stone-50'}
            `}
          >
            <div
              className="w-2.5 h-8 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {plot.project?.title || 'Unnamed plot'}
              </p>
              {plot.project?.crop && (
                <p className="text-[10px] text-soil">{plot.project.crop}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {plot.project && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onNavigateToProject(plot.projectId);
                  }}
                  className="p-1 rounded hover:bg-stone-200 text-clay"
                  title="View project"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={e => handleDelete(e, plot.id)}
                className="p-1 rounded hover:bg-red-50 text-clay hover:text-red-500"
                title="Delete plot"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
