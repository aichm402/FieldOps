'use client';

import { useProjects } from '@/hooks/useProjects';
import { FolderOpen, Sprout, Upload, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { projects, isLoading } = useProjects();

  const stats = {
    total: projects.length,
    crops: [...new Set(projects.map(p => p.crop))],
    years: [...new Set(projects.map(p => p.year).filter(Boolean))],
    withDates: projects.filter(p => p.plantingDate || p.preAppDate).length,
  };

  const recent = projects.slice(0, 5);

  const cropCounts = stats.crops.reduce((acc, crop) => {
    acc[crop] = projects.filter(p => p.crop === crop).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <header className="px-8 pt-7 pb-5 border-b border-stone-200 bg-white">
        <h2 className="text-[22px] font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-soil mt-0.5">Overview of all research projects</p>
      </header>

      <div className="p-8">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: stats.total, icon: FolderOpen },
            { label: 'Crop Types', value: stats.crops.length, icon: Sprout },
            { label: 'Trial Years', value: stats.years.length, icon: MapPin },
            { label: 'Dates Entered', value: stats.withDates, icon: Upload },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-soil uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 text-clay" />
              </div>
              <span className="font-mono text-3xl font-medium">
                {isLoading ? '—' : value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent projects */}
          <div className="col-span-2 bg-white border border-stone-200 rounded-xl">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent Projects</h3>
              <Link href="/projects" className="text-xs text-forest font-medium hover:underline">
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-forest rounded-full animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="p-8 text-center text-soil text-sm">
                <p>No projects yet.</p>
                <Link href="/upload" className="text-forest font-medium hover:underline">
                  Upload your first ARM PDF
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {recent.map(p => (
                  <Link
                    key={p.id}
                    href={`/projects?selected=${p.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition"
                  >
                    <div
                      className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: getCropColor(p.crop) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-soil">{p.crop} · {p.treatmentCount} treatments</p>
                    </div>
                    <span className="text-xs text-clay font-mono">
                      {p.year || '—'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Crop breakdown */}
          <div className="bg-white border border-stone-200 rounded-xl">
            <div className="px-5 py-4 border-b border-stone-200">
              <h3 className="text-sm font-semibold">By Crop</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-forest rounded-full animate-spin" />
              </div>
            ) : Object.keys(cropCounts).length === 0 ? (
              <div className="p-8 text-center text-soil text-sm">No data</div>
            ) : (
              <div className="p-4 space-y-3">
                {Object.entries(cropCounts).map(([crop, count]) => (
                  <div key={crop} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: getCropColor(crop) }}
                    />
                    <span className="text-sm flex-1">{crop}</span>
                    <span className="font-mono text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function getCropColor(crop: string): string {
  const colors: Record<string, string> = {
    Corn: '#E5A820',
    Soybean: '#6B8E23',
    Popcorn: '#D2691E',
    Noncrop: '#8B7355',
    Unknown: '#A8A29E',
  };
  return colors[crop] || colors.Unknown;
}
