import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-amber text-amber-ink hover:bg-amber-hi',
  secondary: 'border border-line text-paper hover:bg-panel-hi',
  ghost: 'text-sage hover:bg-panel-hi hover:text-paper',
  danger: 'bg-onair-deep text-paper hover:bg-onair',
};
const SIZES: Record<Size, string> = {
  md: 'min-h-12 px-5 text-[15px]',
  sm: 'min-h-10 px-3.5 text-[13px]',
};

/** Class string for anything that should look like a button (links included). */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra = ''): string {
  return `inline-flex items-center justify-center gap-2 rounded-row font-semibold transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
});

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'default' | 'danger';
}

/** 44 px square icon-only button; `label` becomes the accessible name and tooltip. */
export function IconButton({ label, tone = 'default', className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-row transition-colors hover:bg-panel-hi disabled:opacity-45 ${
        tone === 'danger' ? 'text-sage hover:text-alert' : 'text-sage hover:text-paper'
      } ${className}`}
      {...rest}
    />
  );
}
