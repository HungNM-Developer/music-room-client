import type { ErrorParams } from '@/contracts';
import { type Dict, dictFor, dicts } from './dict';
import { getLang, useLang } from './lang';
import type { ClientErrorCode } from './vi';

export type { ClientErrorCode, Dict };
export { dictFor };

/** The dictionary for this device's language; re-renders when it changes. */
export const useT = (): Dict => dicts[useLang()];

/** The dictionary now, for code outside React. Read it when needed, never at module load. */
export const tr = (): Dict => dicts[getLang()];

/** Error code (+ params from the server) → message in this device's language. */
export function errorMessage(code: ClientErrorCode, params: ErrorParams = {}): string {
  const errors = tr().errors;
  return (errors[code] ?? errors.INTERNAL)(params);
}
