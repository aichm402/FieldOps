'use client';

import { useState } from 'react';
import { Project } from '@/hooks/useProjects';
import { Link2, X, Search } from 'lucide-react';

const CROP_COLORS: Record<string, string> = {
  Corn: '#E5A820', Soybean: '#6B8E23', Popcorn: '#D2691E',
  Noncrop: '#8B7355', Unknown: '#A8A29E',
};

interface Props {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onCancel: () => void;
}

export default function PlotLinker({ projects, onSelect, onCancel }: Props) {
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.crop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-lg">
      <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-forest" />
          Link polygon to project
        </h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-stone-100 text-clay">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-clay" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm py-1.5 bg-transparent border-none outline-none placeholder:text-stone-300"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-soil text-center py-6">No matching projects</p>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 transition border-b border-stone-50 last:border-none"
            >
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: CROP_COLORS[p.crop] || CROP_COLORS.Unknown }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-[11px] text-soil">
                  {p.crop} · {p.treatmentCount} trt{p.treatmentCount !== 1 ? 's' : ''}
                  {p.year ? ` · ${p.year}` : ''}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
