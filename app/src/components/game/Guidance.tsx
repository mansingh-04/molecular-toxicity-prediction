import { useEffect, useState } from 'react';
import { WALLS, WORK_AREAS, ZONES, FURNITURE } from '@/data/labLayout';
import { TARGET_LABEL, TARGET_POSITIONS } from '@/services/lab/guidance';
import { useGuidance } from './useGuidance';
import { playerPose } from './PlayerController';
import { Icon } from '@/components/ui/Icon';

/** Re-renders at ~8 Hz with the latest player pose (cheap; avoids per-frame React updates). */
function usePose() {
  const [pose, setPose] = useState({ ...playerPose });
  useEffect(() => {
    const id = setInterval(() => setPose({ ...playerPose }), 125);
    return () => clearInterval(id);
  }, []);
  return pose;
}

export function GuideBar() {
  const g = useGuidance();
  const pose = usePose();
  if (!g) return null;
  let dist: number | undefined;
  let angle = 0;
  if (g.target) {
    const [tx, , tz] = TARGET_POSITIONS[g.target];
    const dx = tx - pose.x, dz = tz - pose.z;
    dist = Math.hypot(dx, dz);
    const fx = -Math.sin(pose.yaw), fz = -Math.cos(pose.yaw);
    const rx = Math.cos(pose.yaw), rz = -Math.sin(pose.yaw);
    angle = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
  }
  return (
    <div className="glass pointer-events-auto flex max-w-[min(560px,calc(100vw-2rem))] items-center gap-3 rounded-xl px-4 py-2.5" role="status" aria-live="polite">
      <span className="rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.16em] text-accent-300">NEXT</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{g.text}</div>
        {g.how && <div className="truncate text-[11px] text-lab-300">{g.how}</div>}
      </div>
      {g.target && dist !== undefined && (
        <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-3">
          {dist > 1.6 ? (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-500/15 text-accent-300" style={{ transform: `rotate(${angle}rad)` }} aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 3l7 16-7-4-7 4z" /></svg>
            </span>
          ) : (
            <Icon name="check" className="h-5 w-5 text-ok-400" />
          )}
          <div className="text-right">
            <div className="text-[11px] text-lab-200">{TARGET_LABEL[g.target]}</div>
            <div className="mono text-[11px] text-accent-300">{dist > 1.6 ? `${dist.toFixed(0)} m` : 'You are here'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const X0 = -12.3, X1 = 12.3, Z0 = -8.3, Z1 = 13.3;

export function Minimap() {
  const g = useGuidance();
  const pose = usePose();
  const target = g?.target ? TARGET_POSITIONS[g.target] : undefined;
  const stations = [FURNITURE.analyzer, FURNITURE.benchA, FURNITURE.benchB, FURNITURE.fumeHood];
  const shelves = [FURNITURE.shelfW1, FURNITURE.shelfW2, FURNITURE.shelfW3, FURNITURE.shelfW4, FURNITURE.shelfN];
  return (
    <div className="glass pointer-events-auto overflow-hidden rounded-xl p-2" aria-label="Lab map">
      <svg viewBox={`${X0} ${Z0} ${X1 - X0} ${Z1 - Z0}`} className="h-[150px] w-[172px]" role="img" aria-label="Minimap of the laboratory">
        {ZONES.map((z) => (
          <rect key={z.id} x={z.x0} y={z.z0} width={z.x1 - z.x0} height={z.z1 - z.z0} fill="rgba(255,255,255,0.035)" />
        ))}
        {WORK_AREAS.map((a) => (
          <rect key={a.id} x={a.x - a.w / 2} y={a.z - a.d / 2} width={a.w} height={a.d} fill={g?.target === a.id ? 'rgba(63,211,204,0.45)' : 'rgba(63,211,204,0.15)'} stroke="#3fd3cc" strokeWidth={0.08} />
        ))}
        {[...stations, ...shelves].map((f) => (
          <rect key={f.id} x={f.x - f.w / 2} y={f.z - f.d / 2} width={f.w} height={f.d} fill="rgba(159,176,194,0.45)" />
        ))}
        {WALLS.map((w) => (
          <rect key={w.id} x={w.x - w.w / 2} y={w.z - w.d / 2} width={w.w} height={w.d} fill={w.material === 'glass' ? '#7fe6e0' : '#c9d4df'} opacity={w.material === 'glass' ? 0.6 : 0.9} />
        ))}
        <text x={-9} y={-6.3} fontSize={0.9} fill="#9fb0c2" textAnchor="middle">STORAGE</text>
        <text x={0} y={5.6} fontSize={0.9} fill="#9fb0c2" textAnchor="middle">MAIN LAB</text>
        <text x={9} y={6.5} fontSize={0.9} fill="#9fb0c2" textAnchor="middle">SUITE</text>
        {target && (
          <g>
            <circle cx={target[0]} cy={target[2]} r={1.1} fill="none" stroke="#3fd3cc" strokeWidth={0.18}>
              <animate attributeName="r" values="0.6;1.6;0.6" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={target[0]} cy={target[2]} r={0.35} fill="#3fd3cc" />
          </g>
        )}
        <g transform={`translate(${pose.x} ${pose.z}) rotate(${(-pose.yaw * 180) / Math.PI})`}>
          <path d="M0 -0.9 L0.6 0.6 L0 0.3 L-0.6 0.6 Z" fill="#ffffff" stroke="#05080d" strokeWidth={0.12} />
        </g>
      </svg>
    </div>
  );
}
