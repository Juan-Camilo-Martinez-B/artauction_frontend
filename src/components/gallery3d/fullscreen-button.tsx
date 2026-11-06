'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Pone `target` a pantalla completa, con los controles que tenga encima. Esc la
 * cierra (lo hace el navegador). No aparece donde no se puede, como en iPhone.
 */
export function FullscreenButton({ target, className }: { target: RefObject<HTMLElement | null>; className?: string }) {
  const t = useTranslations('Studio.fullscreen');
  const notify = useToast();
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(document.fullscreenEnabled);
    const onChange = () => { setActive(document.fullscreenElement !== null); };
    document.addEventListener('fullscreenchange', onChange);
    return () => { document.removeEventListener('fullscreenchange', onChange); };
  }, []);

  if (!supported) {
    return null;
  }

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.current?.requestFullscreen();
      }
    } catch {
      notify(t('failed'), 'error');
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      icon={active ? <Minimize aria-hidden="true" className="h-4 w-4" /> : <Maximize aria-hidden="true" className="h-4 w-4" />}
      onClick={() => void toggle()}
    >
      {active ? t('exit') : t('enter')}
    </Button>
  );
}
