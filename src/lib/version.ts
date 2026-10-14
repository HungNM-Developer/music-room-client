import { CONTRACTS_VERSION } from '@/contracts';

/** R-44: the server speaks another contracts version → ask the user to reload. Unknown health → no banner. */
export function isVersionMismatch(
  health: { contractsVersion?: string } | null,
  mine: string = CONTRACTS_VERSION,
): boolean {
  return Boolean(health?.contractsVersion && health.contractsVersion !== mine);
}
