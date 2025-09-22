const inFlight = new Map<string, number>();

export function canRun(orgId: string, cooldownMs = 15 * 60 * 1000) {
  const now = Date.now();
  const last = inFlight.get(orgId) ?? 0;
  if (now - last < cooldownMs) return false;
  inFlight.set(orgId, now);
  return true;
}

export function finishRun(orgId: string) {
  inFlight.delete(orgId);
}