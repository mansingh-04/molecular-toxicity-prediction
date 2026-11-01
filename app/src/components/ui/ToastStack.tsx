import { useGame } from '@/store/gameStore';
import { Icon } from './Icon';

const style = {
  info: ['text-lab-200', 'info'],
  success: ['text-ok-400', 'check'],
  warn: ['text-warn-400', 'alert'],
  error: ['text-danger-400', 'alert'],
  achievement: ['text-warn-400', 'trophy'],
  objective: ['text-accent-400', 'check'],
} as const;

export function ToastStack() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-80 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const [cls, icon] = style[t.kind];
        return (
          <div key={t.id} className="glass pointer-events-auto flex animate-fadeIn items-start gap-3 rounded-xl px-3.5 py-3">
            <Icon name={icon} className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} />
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${cls}`}>{t.title}</div>
              {t.body && <div className="mt-0.5 text-xs text-lab-300">{t.body}</div>}
            </div>
            <button className="text-lab-400 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
