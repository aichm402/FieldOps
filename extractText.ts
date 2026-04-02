'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, Map, Upload, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/upload', label: 'Upload PDF', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 w-[220px] h-screen bg-bark flex flex-col z-40">
      <div className="px-5 pt-5 pb-4 border-b border-bark-mid">
        <h1 className="text-xl font-semibold tracking-tight text-stone-50">
          FieldOps
        </h1>
        <span className="text-[11px] text-clay tracking-[1.5px] uppercase">
          Research Manager
        </span>
      </div>

      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || 
            (href !== '/' && pathname.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-forest-dim text-green-300 font-medium'
                  : 'text-stone-400 hover:bg-bark-light hover:text-stone-200'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-bark-mid">
        <p className="text-[11px] text-stone-500">
          v0.1.0 — Phase 3
        </p>
      </div>
    </aside>
  );
}
