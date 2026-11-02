import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'error';

const tones: Record<NoticeTone, { classes: string; Icon: typeof Info }> = {
  info: { classes: 'border-line bg-surface text-ink', Icon: Info },
  success: { classes: 'border-moss/30 bg-moss-tint text-moss', Icon: CheckCircle2 },
  error: { classes: 'border-oxide/30 bg-oxide-tint text-oxide', Icon: AlertCircle },
};

/**
 * Mensaje en linea con el resultado de una accion. Los errores se anuncian de
 * inmediato (role=alert); el resto, de forma cortes (role=status).
 */
export function Notice({ tone = 'info', children, className = '' }: { tone?: NoticeTone; children: ReactNode; className?: string }) {
  const { classes, Icon } = tones[tone];
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-field border px-3 py-2.5 text-sm ${classes} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
