export function formatCoordinate(value: number, directionA: string, directionB: string) {
  const direction = value >= 0 ? directionA : directionB;
  return `${Math.abs(value).toFixed(2)} ${direction}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return dateTimeFormatter.format(new Date(value));
}

