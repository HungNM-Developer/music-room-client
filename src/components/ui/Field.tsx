import { useId } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  showHint?: boolean;
}

/** Labelled input with an optional hint shown when the value is invalid. */
export function Field({ label, hint, showHint, className, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 px-1">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={showHint || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`w-full input-field ${showHint ? 'border-red-500/60' : ''} ${className ?? ''}`}
        {...input}
      />
      {hint && showHint && (
        <p id={`${id}-hint`} className="text-xs text-red-300 px-1">
          {hint}
        </p>
      )}
    </div>
  );
}
