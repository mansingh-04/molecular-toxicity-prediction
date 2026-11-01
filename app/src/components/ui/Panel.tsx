import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface PanelProps {
  title: string;
  subtitle?: ReactNode;
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  side?: 'right' | 'center';
}

/** In-world overlay panel. The 3D scene stays visible behind it. Escape closes it. */
export function Panel({ title, subtitle, icon, onClose, children, footer, width = 'max-w-3xl', side = 'center' }: PanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className={`pointer-events-auto absolute inset-0 z-30 flex ${side === 'right' ? 'justify-end' : 'items-center justify-center'} bg-ink-950/40 p-3 sm:p-6`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={title} className={`glass flex max-h-full w-full ${width} animate-fadeIn flex-col overflow-hidden rounded-2xl`}>
        <header className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
          {icon && (
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-400">
              <Icon name={icon} className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-white">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-lab-300">{subtitle}</div>}
          </div>
          <button className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Close panel">
            <Icon name="close" />
            <span className="kbd hidden sm:inline-flex">Esc</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-white/[0.06] px-5 py-3">{footer}</footer>}
      </section>
    </div>
  );
}
