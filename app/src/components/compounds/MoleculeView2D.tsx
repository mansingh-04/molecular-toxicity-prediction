import { useEffect, useMemo, useState } from 'react';
import { chemistryService } from '@/services/chemistry';
import { parseSmiles } from '@/services/chemistry/smilesParser';
import { elementColor, layoutGraph } from '@/services/chemistry/graphLayout';

/** Removes scripts and event-handler attributes from an SVG string (remote services are untrusted). */
function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<\?xml[^>]*>/, '');
}

export function MoleculeView2D({ smiles, height = 220, className = '' }: { smiles: string; height?: number; className?: string }) {
  const [svg, setSvg] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setSvg(undefined);
    chemistryService.depictSvg(smiles, 420, Math.round(height * 1.4)).then((s) => alive && setSvg(s ? sanitizeSvg(s) : null)).catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [smiles, height]);

  return (
    <figure className={`relative overflow-hidden rounded-xl bg-[#eef2f5] ${className}`} style={{ height }}>
      {svg === undefined && <div className="grid h-full place-items-center text-xs text-ink-600">Rendering…</div>}
      {svg && <div className="molecule-svg h-full w-full p-2" dangerouslySetInnerHTML={{ __html: svg }} />}
      {svg === null && <SchematicDepiction smiles={smiles} />}
      <figcaption className="absolute bottom-1.5 right-2 rounded bg-white/70 px-1.5 text-[10px] font-medium text-ink-700">
        {svg ? 'RDKit depiction' : svg === null ? 'Schematic layout (RDKit unavailable)' : ''}
      </figcaption>
    </figure>
  );
}

function SchematicDepiction({ smiles }: { smiles: string }) {
  const data = useMemo(() => {
    const g = parseSmiles(smiles).graph;
    if (!g) return null;
    return { g, pos: layoutGraph(g, 2) };
  }, [smiles]);
  if (!data) return <div className="grid h-full place-items-center text-xs text-danger-500">Structure cannot be depicted.</div>;
  const { g, pos } = data;
  const xs = pos.map((p) => p[0]);
  const ys = pos.map((p) => p[1]);
  const pad = 0.9;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="h-full w-full p-3">
      {g.bonds.map((b, i) => {
        const [x1, y1] = pos[b.a];
        const [x2, y2] = pos[b.b];
        const dx = y2 - y1, dy = -(x2 - x1);
        const len = Math.hypot(dx, dy) || 1;
        const ox = (dx / len) * 0.09, oy = (dy / len) * 0.09;
        const lines = b.order === 2 ? [-1, 1] : b.order === 3 ? [-1.6, 0, 1.6] : [0];
        return (
          <g key={i} stroke="#2a3a4f" strokeWidth={0.06} strokeDasharray={b.order === 1.5 ? '0.12 0.08' : undefined}>
            {lines.map((k) => (
              <line key={k} x1={x1 + ox * k} y1={y1 + oy * k} x2={x2 + ox * k} y2={y2 + oy * k} />
            ))}
            {b.order === 1.5 && <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="none" />}
          </g>
        );
      })}
      {g.atoms.map((a) =>
        a.element === 'C' && !a.charge ? null : (
          <g key={a.index}>
            <circle cx={pos[a.index][0]} cy={pos[a.index][1]} r={0.26} fill="#eef2f5" />
            <text x={pos[a.index][0]} y={pos[a.index][1]} fontSize={0.36} textAnchor="middle" dominantBaseline="central" fill={a.element === 'C' ? '#2a3a4f' : elementColor(a.element)} fontWeight={600}>
              {a.element}
              {a.hydrogens ? `H${a.hydrogens > 1 ? a.hydrogens : ''}` : ''}
              {a.charge ? (a.charge > 0 ? '+' : '−') : ''}
            </text>
          </g>
        ),
      )}
    </svg>
  );
}
