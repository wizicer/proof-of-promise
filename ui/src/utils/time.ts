export function relativeTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
  if (absolute < 90 * 60 * 1_000) return formatter.format(Math.round(difference / 60_000), "minute");
  if (absolute < 36 * 60 * 60 * 1_000) return formatter.format(Math.round(difference / 3_600_000), "hour");
  return formatter.format(Math.round(difference / 86_400_000), "day");
}

export function shiftClock(time: string, hours: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour * 60 + minute + Math.round(hours * 60)) % 1_440 + 1_440) % 1_440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function nextOccurrence(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}
