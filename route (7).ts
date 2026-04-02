'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { FieldPlot } from '@/hooks/useFields';

interface Point { x: number; y: number }

interface Props {
  imagePath: string;
  plots: FieldPlot[];
  isDrawing: boolean;
  onPolygonComplete: (points: Point[]) => void;
  onPlotClick: (plot: FieldPlot) => void;
  selectedPlotId?: string | null;
}

const CROP_COLORS: Record<string, string> = {
  Corn: '#E5A820', Soybean: '#6B8E23', Popcorn: '#D2691E',
  Noncrop: '#8B7355', Unknown: '#A8A29E',
};

// Store fabric module at component-module level so it persists
let fabricModule: typeof import('fabric') | null = null;

export default function FieldCanvas({
  imagePath, plots, isDrawing, onPolygonComplete, onPlotClick, selectedPlotId,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasObjRef = useRef<InstanceType<typeof import('fabric').Canvas> | null>(null);
  const drawPointsRef = useRef<Point[]>([]);
  const [drawPoints, setDrawPoints] = useState<Point[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);

  // Initialize fabric canvas and load background image
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!fabricModule) {
        fabricModule = await import('fabric');
      }
      const fabric = fabricModule;
      if (!mounted || !canvasRef.current || !containerRef.current) return;

      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight || 600;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: cW, height: cH, selection: false, renderOnAddRemove: true,
      });
      canvasObjRef.current = canvas;

      try {
        const img = await fabric.FabricImage.fromURL(imagePath, { crossOrigin: 'anonymous' });
        if (!mounted) return;

        const scale = Math.min(cW / (img.width || 1), cH / (img.height || 1));
        img.set({
          scaleX: scale, scaleY: scale,
          left: (cW - (img.width || 1) * scale) / 2,
          top: (cH - (img.height || 1) * scale) / 2,
          selectable: false, evented: false,
        });
        canvas.backgroundImage = img;
        canvas.renderAll();
        setCanvasReady(true);
      } catch (err) {
        console.error('Failed to load field image:', err);
      }
    }

    init();
    return () => {
      mounted = false;
      if (canvasObjRef.current) {
        canvasObjRef.current.dispose();
        canvasObjRef.current = null;
      }
      setCanvasReady(false);
    };
  }, [imagePath]);

  // Render plot polygons whenever plots/selection changes
  useEffect(() => {
    if (!canvasReady || !canvasObjRef.current || !fabricModule) return;
    const fabric = fabricModule;
    const canvas = canvasObjRef.current;

    // Clear all objects (not background)
    canvas.getObjects().forEach(obj => canvas.remove(obj));

    for (const plot of plots) {
      let points: Point[];
      try { points = JSON.parse(plot.polygonData); } catch { continue; }
      if (points.length < 3) continue;

      const color = plot.project ? (CROP_COLORS[plot.project.crop] || CROP_COLORS.Unknown) : plot.color;
      const isSel = plot.id === selectedPlotId;

      // Polygon shape
      const poly = new fabric.Polygon(
        points.map(p => ({ x: p.x, y: p.y })),
        {
          fill: hexToRgba(color, isSel ? 0.45 : 0.28),
          stroke: color,
          strokeWidth: isSel ? 2.5 : 1.5,
          selectable: false,
          evented: true,
          objectCaching: false,
        }
      );
      // Attach plot data for click handler
      (poly as unknown as Record<string, unknown>).plotData = plot;
      canvas.add(poly);

      // Label text
      const c = centroid(points);
      const title = plot.project?.title || 'Unnamed';
      const display = title.length > 28 ? title.slice(0, 27) + '…' : title;

      const label = new fabric.FabricText(display, {
        left: c.x, top: c.y,
        fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: '600',
        fill: '#FFFFFF', textAlign: 'center', originX: 'center', originY: 'center',
        selectable: false, evented: false,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 3, offsetX: 0, offsetY: 1 }),
      });
      canvas.add(label);

      // Crop sub-label
      if (plot.project?.crop) {
        const sub = new fabric.FabricText(plot.project.crop, {
          left: c.x, top: c.y + 14,
          fontSize: 9, fontFamily: 'DM Sans, sans-serif', fontWeight: '500',
          fill: 'rgba(255,255,255,0.8)', textAlign: 'center', originX: 'center', originY: 'center',
          selectable: false, evented: false,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 2, offsetX: 0, offsetY: 1 }),
        });
        canvas.add(sub);
      }
    }

    canvas.renderAll();
  }, [canvasReady, plots, selectedPlotId]);

  // Click handler for plot polygons
  useEffect(() => {
    if (!canvasReady || !canvasObjRef.current) return;
    const canvas = canvasObjRef.current;

    const handler = (opt: { target?: unknown }) => {
      if (isDrawing) return;
      const target = opt.target as Record<string, unknown> | undefined;
      if (target?.plotData) {
        onPlotClick(target.plotData as FieldPlot);
      }
    };

    canvas.on('mouse:down', handler);
    return () => { canvas.off('mouse:down', handler); };
  }, [canvasReady, isDrawing, onPlotClick]);

  // Drawing: click to add points
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pt = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
    drawPointsRef.current = [...drawPointsRef.current, pt];
    setDrawPoints([...drawPointsRef.current]);
    renderPreview(drawPointsRef.current);
  }, [isDrawing]);

  // Drawing: double-click to finish
  const handleDblClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    if (drawPointsRef.current.length >= 3) {
      onPolygonComplete(drawPointsRef.current);
    }
    drawPointsRef.current = [];
    setDrawPoints([]);
    clearPreview();
  }, [isDrawing, onPolygonComplete]);

  // Render green dashed preview polygon
  const renderPreview = (points: Point[]) => {
    if (!canvasObjRef.current || !fabricModule) return;
    const fabric = fabricModule;
    const canvas = canvasObjRef.current;

    clearPreview();

    if (points.length >= 2) {
      const poly = new fabric.Polygon(points, {
        fill: 'rgba(34,197,94,0.18)', stroke: '#22c55e', strokeWidth: 2,
        strokeDashArray: [6, 4], selectable: false, evented: false, objectCaching: false,
      });
      (poly as unknown as Record<string, unknown>)._preview = true;
      canvas.add(poly);
    }

    for (const pt of points) {
      const dot = new fabric.Circle({
        left: pt.x - 4, top: pt.y - 4, radius: 4,
        fill: '#22c55e', stroke: '#fff', strokeWidth: 1.5,
        selectable: false, evented: false,
      });
      (dot as unknown as Record<string, unknown>)._preview = true;
      canvas.add(dot);
    }
    canvas.renderAll();
  };

  const clearPreview = () => {
    if (!canvasObjRef.current) return;
    const canvas = canvasObjRef.current;
    canvas.getObjects().forEach(obj => {
      if ((obj as unknown as Record<string, unknown>)._preview) canvas.remove(obj);
    });
    canvas.renderAll();
  };

  // Reset drawing state when mode toggles off
  useEffect(() => {
    if (!isDrawing) {
      drawPointsRef.current = [];
      setDrawPoints([]);
      clearPreview();
    }
  }, [isDrawing]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`relative w-full bg-stone-900 rounded-lg overflow-hidden ${isDrawing ? 'cursor-crosshair' : ''}`}
        style={{ height: 600 }}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
      >
        <canvas ref={canvasRef} />

        {isDrawing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-bark/90 text-white px-4 py-2 rounded-lg text-xs font-medium z-10 pointer-events-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Click to add points · Double-click to finish
            {drawPoints.length > 0 && (
              <span className="text-green-300 font-mono">{drawPoints.length} pt{drawPoints.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {!canvasReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-stone-600 border-t-green-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-400">Loading field image…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function centroid(pts: Point[]): Point {
  const n = pts.length;
  return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
}
