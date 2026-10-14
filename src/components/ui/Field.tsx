import { useId } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Shows `hint` as an error and marks the input invalid. */
  invalid?: boolean;
}

/** Labelled input; the hint appears only when the value is invalid. */
export function Field({ label, hint, invalid, className = '', ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-sage">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={hint && invalid ? `${id}-hint` : undefined}
        className={`field ${invalid ? 'border-onair' : ''} ${className}`}
        {...input}
      />
      {hint && invalid && (
        <p id={`${id}-hint`} className="text-[13px] text-alert">
          {hint}
        </p>
      )}
    </div>
  );
}
