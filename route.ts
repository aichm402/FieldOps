'use client';

import { Treatment } from '@/hooks/useProjects';

interface Props {
  treatments: Treatment[];
}

interface Product {
  name: string;
  rate?: string;
  rateUnit?: string;
  formConc?: string;
  formUnit?: string;
  formType?: string;
  applCode?: string;
  applTiming?: string;
}

export default function TreatmentTable({ treatments }: Props) {
  if (treatments.length === 0) {
    return <p className="text-sm text-soil italic">No treatment data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="bg-cream-dark">
            <th className="text-left px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-soil border-b-2 border-stone-200 w-10">
              #
            </th>
            <th className="text-left px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-soil border-b-2 border-stone-200 w-14">
              Code
            </th>
            <th className="text-left px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-soil border-b-2 border-stone-200">
              Description
            </th>
            <th className="text-left px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-soil border-b-2 border-stone-200 w-20">
              Products
            </th>
          </tr>
        </thead>
        <tbody>
          {treatments.map((trt) => {
            let products: Product[] = [];
            try {
              products = JSON.parse(trt.products);
            } catch {
              /* empty */
            }

            return (
              <tr key={trt.id} className="hover:bg-stone-50 group">
                <td className="px-2.5 py-2 border-b border-stone-100 font-mono font-medium text-forest align-top">
                  {trt.trtNumber}
                </td>
                <td className="px-2.5 py-2 border-b border-stone-100 font-mono text-xs text-soil align-top">
                  {trt.code || '—'}
                </td>
                <td className="px-2.5 py-2 border-b border-stone-100 align-top">
                  <p className="leading-snug">{truncateDesc(trt.description)}</p>
                  {products.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 hidden group-hover:block">
                      {products.map((p, i) => (
                        <div key={i} className="text-xs text-soil">
                          <span className="font-medium text-bark">{p.name}</span>
                          {p.rate && ` ${p.rate} ${p.rateUnit || ''}`}
                          {p.applTiming && (
                            <span className="text-clay ml-1">({p.applTiming})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2.5 py-2 border-b border-stone-100 font-mono text-xs text-soil align-top">
                  {products.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function truncateDesc(desc: string, max = 120): string {
  if (desc.length <= max) return desc;
  return desc.slice(0, max) + '…';
}
