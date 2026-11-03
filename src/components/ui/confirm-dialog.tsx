'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button, type ButtonVariant } from './button';

/**
 * Dialogo de confirmacion sobre el elemento nativo <dialog>: el navegador se
 * encarga del foco atrapado, de Escape y del fondo inerte.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Extract<ButtonVariant, 'primary' | 'accent' | 'danger'>;
  /** Por ejemplo, mientras falte un dato obligatorio dentro del dialogo. */
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <h2 id="confirm-dialog-title" className="font-serif text-2xl">
        {title}
      </h2>
      {children ? <div className="mt-3 text-sm text-muted">{children}</div> : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={tone} disabled={confirmDisabled} loading={confirmLoading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
