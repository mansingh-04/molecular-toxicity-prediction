import { useGame } from '@/store/gameStore';

export function SettingsForm() {
  const s = useGame((st) => st.settings);
  const update = useGame((st) => st.updateSettings);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="label" htmlFor="sens">Mouse sensitivity ({s.mouseSensitivity.toFixed(2)}×)</label>
        <input id="sens" type="range" min={0.3} max={2.5} step={0.05} value={s.mouseSensitivity} onChange={(e) => update({ mouseSensitivity: Number(e.target.value) })} className="w-full accent-accent-500" />
      </div>
      <div>
        <span className="label">Graphics</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Graphics quality">
          {([
            ['performance', 'Performance', 'Low power: no shadows or effects'],
            ['quality', 'High quality', 'Shadows, reflections, bloom, AO'],
          ] as const).map(([v, t, d]) => (
            <button key={v} role="radio" aria-checked={s.graphics === v} onClick={() => update({ graphics: v })}
              className={`rounded-lg border p-2 text-left ${s.graphics === v ? 'border-accent-500 bg-accent-500/10' : 'border-white/10 hover:border-white/25'}`}>
              <div className="text-sm text-white">{t}</div>
              <div className="text-[11px] text-lab-400">{d}</div>
            </button>
          ))}
        </div>
      </div>
      {([
        ['invertY', 'Invert vertical look'],
        ['reducedMotion', 'Reduced motion (no head bob, faster animations)'],
        ['showControlsHint', 'Show controls card when entering the lab'],
      ] as const).map(([k, label]) => (
        <label key={k} className="flex items-center gap-3 text-lab-200">
          <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={s[k]} onChange={(e) => update({ [k]: e.target.checked })} />
          {label}
        </label>
      ))}
    </div>
  );
}
