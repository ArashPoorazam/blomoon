export const GLOBE_RADIUS = 2;

export function formatCoordinate(value: number, directionA: string, directionB: string) {
  const direction = value >= 0 ? directionA : directionB;
  return `${Math.abs(value).toFixed(2)} ${direction}`;
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
