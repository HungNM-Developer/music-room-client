import { CONTRACTS_VERSION } from '@/contracts/version';

/** R-44: the server speaks another contracts version → ask the user to reload. Unknown health → no banner. */
export function isVersionMismatch(
  health: { contractsVersion?: string } | null,
  mine: string = CONTRACTS_VERSION,
): boolean {
  return Boolean(health?.contractsVersion && health.contractsVersion !== mine);
}

/** "2026-10-16.2" → ["2026-10-16", 2]; anything else → null. */
function parse(v: string): [string, number] | null {
  const m = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(v);
  return m ? [m[1], Number(m[2])] : null;
}

/**
 * Which side is behind. `serverNewer`: this page is old → reload. `serverOlder`: the server
 * is still being deployed (the web usually goes live first) → wait; reloading cannot help.
 */
export function versionSkew(
  health: { contractsVersion?: string } | null,
  mine: string = CONTRACTS_VERSION,
): 'none' | 'serverNewer' | 'serverOlder' {
  if (!isVersionMismatch(health, mine)) return 'none';
  const a = parse(health!.contractsVersion!);
  const b = parse(mine);
  if (!a || !b) return 'serverNewer';
  const older = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  return older ? 'serverOlder' : 'serverNewer';
}
