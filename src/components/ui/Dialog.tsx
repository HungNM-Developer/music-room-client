'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Optional line under the title. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** false: Esc and backdrop clicks do nothing (e.g. the join form). */
  dismissable?: boolean;
  closeLabel?: string;
}

/** Native <dialog> as a bottom sheet (phones) / card (≥640 px). Mount it only while needed. */
export function Dialog({ open, onClose, title, description, children, dismissable = true, closeLabel = 'Đóng' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Callers usually unmount the dialog to close it, so focus is handed back here
  // rather than relying on <dialog>.close().
  useEffect(() => {
    const d = ref.current;
    if (!d || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) d.showModal();
    return () => {
      if (d.open) d.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> box itself (not its content) is a backdrop click.
        if (dismissable && e.target === ref.current) onClose();
      }}
    >
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1 pt-2">
            <h2 id={titleId} className="type-display text-[22px] font-bold leading-tight">
              {title}
            </h2>
            {description && <p className="mt-1 truncate text-[13px] text-sage">{description}</p>}
          </div>
          {dismissable && (
            <IconButton label={closeLabel} onClick={onClose} className="-mr-2 -mt-1">
              <X className="h-5 w-5" aria-hidden />
            </IconButton>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Full-width action row inside a dialog or menu sheet. */
export function SheetAction({
  children,
  onClick,
  danger,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-row px-3 text-left text-[15px] transition-colors hover:bg-panel-hi ${
        danger ? 'text-alert' : 'text-paper'
      }`}
    >
      {icon && <span className="text-sage">{icon}</span>}
      {children}
    </button>
  );
}
