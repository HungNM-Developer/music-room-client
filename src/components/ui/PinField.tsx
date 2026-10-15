import { Field } from '@/components/ui/Field';
import { vi } from '@/i18n/vi';

interface PinFieldProps {
  label?: string;
  value: string;
  onChange: (pin: string) => void;
  invalid?: boolean;
  /** "new-password" when the PIN is being chosen, so password managers offer to save it. */
  autoComplete?: 'new-password' | 'off';
  autoFocus?: boolean;
}

/** 4–8 digit admin PIN. Non-digits are dropped as they are typed. */
export function PinField({ label = vi.home.adminPin, value, onChange, invalid, autoComplete = 'off', autoFocus }: PinFieldProps) {
  return (
    <Field
      label={label}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={8}
      autoComplete={autoComplete}
      className="type-display tracking-[0.3em]"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
      hint={vi.home.hintPin}
      invalid={invalid}
      // Mounted after an answer from the server (PIN_REQUIRED), so plain autoFocus is
      // safe here, even inside an already-open dialog.
      autoFocus={autoFocus}
    />
  );
}
