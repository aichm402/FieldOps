'use client';

import { Project } from '@/hooks/useProjects';

const CROP_COLORS: Record<string, string> = {
  Corn: '#E5A820', Soybean: '#6B8E23', Popcorn: '#D2691E',
  Noncrop: '#8B7355', Unknown: '#A8A29E',
};

interface Props {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
}

export default function ProjectCard({ project, isSelected, onClick }: Props) {
  const borderColor = CROP_COLORS[project.crop] || CROP_COLORS.Unknown;

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-xl p-5 cursor-pointer transition-all
        border-l-4 hover:shadow-md hover:-translate-y-0.5
        ${isSelected ? 'ring-2 ring-forest/30 shadow-md' : 'border-stone-200'}
      `}
      style={{ borderLeftColor: borderColor }}
    >
      <h3 className="text-[15px] font-semibold leading-snug tracking-tight mb-2 line-clamp-2">
        {project.title}
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded text-white"
          style={{ backgroundColor: borderColor }}
        >
          {project.crop}
        </span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 text-soil">
          {project.treatmentCount} trt{project.treatmentCount !== 1 ? 's' : ''}
        </span>
        {project.reps && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 text-soil">
            {project.reps} rep{project.reps !== 1 ? 's' : ''}
          </span>
        )}
        {project.year && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-soil">
            {project.year}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {[
          { label: 'Planting', value: formatDate(project.plantingDate) },
          { label: 'Emergence', value: formatDate(project.emergenceDate) },
          { label: 'PRE', value: formatDate(project.preAppDate) },
          { label: 'POST', value: formatDate(project.postAppDate) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between">
            <span className="text-soil">{label}</span>
            <span className={`font-medium ${value === '—' ? 'text-stone-300' : 'text-bark'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
