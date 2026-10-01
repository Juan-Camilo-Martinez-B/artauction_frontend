export function clockOffset(serverTimeIso: string, clientNow = Date.now()): number {
  const server = new Date(serverTimeIso).getTime();
  if (Number.isNaN(server)) {
    return 0;
  }
  return server - clientNow;
}

export function serverNow(offsetMs: number, clientNow = Date.now()): number {
  return clientNow + offsetMs;
}

export function remainingMs(endsAtIso: string, offsetMs: number, clientNow = Date.now()): number {
  return new Date(endsAtIso).getTime() - serverNow(offsetMs, clientNow);
}

export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '00:00';
  }
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
