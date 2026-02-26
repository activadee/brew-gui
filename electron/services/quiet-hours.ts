const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;

export function isInQuietHours(
  now: Date,
  enabled: boolean,
  start: string,
  end: string
): boolean {
  if (!enabled) {
    return false;
  }

  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function msUntilNextQuietBoundary(now: Date, start: string, end: string): number {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) {
    return MS_PER_DAY;
  }

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const nowFromMidnightMs = now.getTime() - midnight.getTime();
  const boundaryOffsetsMs = uniqueNumbers([startMinutes * MS_PER_MINUTE, endMinutes * MS_PER_MINUTE]);

  let nextBoundaryMs = Number.POSITIVE_INFINITY;
  for (const boundaryOffset of boundaryOffsetsMs) {
    for (const dayOffset of [0, 1, 2]) {
      const candidate = boundaryOffset + dayOffset * MS_PER_DAY;
      if (candidate > nowFromMidnightMs && candidate < nextBoundaryMs) {
        nextBoundaryMs = candidate;
      }
    }
  }

  if (!Number.isFinite(nextBoundaryMs)) {
    return MS_PER_DAY;
  }

  return Math.max(1, nextBoundaryMs - nowFromMidnightMs);
}

function parseTimeToMinutes(value: string): number | null {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours * 60 + minutes) % MINUTES_PER_DAY;
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values));
}
