'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectDetail from '@/components/projects/ProjectDetail';
import { Search, FolderOpen, Upload } from 'lucide-react';
import Link from 'next/link';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSelected = searchParams.get('selected');

  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const { projects, isLoading, mutate } = useProjects();

  // Update selectedId when URL param changes (from map navigation)
  useEffect(() => {
    if (initialSelected && initialSelected !== selectedId) {
      setSelectedId(initialSelected);
    }
  }, [initialSelected]);

  // Clear URL param when deselecting
  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (searchParams.has('selected')) {
      router.replace('/projects', { scroll: false });
    }
  };

  const crops = useMemo(
    () => [...new Set(projects.map(p => p.crop))].sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.trialId?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.protocolId?.toLowerCase() || '').includes(search.toLowerCase()) ||
        p.crop.toLowerCase().includes(search.toLowerCase());
      const matchesCrop = !cropFilter || p.crop === cropFilter;
      return matchesSearch && matchesCrop;
    });
  }, [projects, search, cropFilter]);

  const selectedProject = projects.find(p => p.id === selectedId);

  // Scroll to detail panel when a project is selected
  useEffect(() => {
    if (selectedProject) {
      document.getElementById('project-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedProject]);

  return (
    <>
      <header className="px-8 pt-7 pb-5 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight">Projects</h2>
            <p className="text-sm text-soil mt-0.5">
              {isLoading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} across ${crops.length} crop type${crops.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-forest text-white hover:bg-forest-light transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload PDF
          </Link>
        </div>
      </header>

      <div className="p-8">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 mb-4">
          <Search className="w-4 h-4 text-clay shrink-0" />
          <input
            type="text"
            placeholder="Search by title, trial ID, protocol ID, or crop…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 py-2.5 text-sm bg-transparent border-none outline-none placeholder:text-stone-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-clay hover:text-bark transition">
              Clear
            </button>
          )}
        </div>

        {/* Crop filters */}
        {crops.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setCropFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                !cropFilter
                  ? 'bg-forest border-forest text-white'
                  : 'bg-white border-stone-200 text-soil hover:border-forest hover:text-forest'
              }`}
            >
              All ({projects.length})
            </button>
            {crops.map(crop => {
              const count = projects.filter(p => p.crop === crop).length;
              return (
                <button
                  key={crop}
                  onClick={() => setCropFilter(cropFilter === crop ? null : crop)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    cropFilter === crop
                      ? 'bg-forest border-forest text-white'
                      : 'bg-white border-stone-200 text-soil hover:border-forest hover:text-forest'
                  }`}
                >
                  {crop} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Detail panel */}
        {selectedProject && (
          <div id="project-detail">
            <ProjectDetail
              project={selectedProject}
              onClose={() => handleSelect(null)}
              onUpdate={() => mutate()}
            />
          </div>
        )}

        {/* Card grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-forest rounded-full animate-spin" />
            <p className="text-xs text-soil mt-3">Loading projects…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-bark mb-1">
              {search || cropFilter ? 'No projects match your filters' : 'No projects yet'}
            </p>
            <p className="text-sm text-soil">
              {search || cropFilter
                ? 'Try adjusting your search or clearing filters.'
                : 'Upload an ARM PDF to create your first project.'}
            </p>
            {!search && !cropFilter && (
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-forest text-white hover:bg-forest-light transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload PDF
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-clay mb-3">
              {filtered.length === projects.length
                ? `Showing all ${filtered.length} projects`
                : `Showing ${filtered.length} of ${projects.length} projects`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSelected={selectedId === p.id}
                  onClick={() => handleSelect(selectedId === p.id ? null : p.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-forest rounded-full animate-spin" />
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
