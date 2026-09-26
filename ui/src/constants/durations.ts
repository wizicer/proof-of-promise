export const returnOptions = [
  { id: "2h", label: "2 hours", milliseconds: 2 * 60 * 60 * 1_000 },
  { id: "1d", label: "1 day", milliseconds: 24 * 60 * 60 * 1_000 },
  { id: "2d", label: "2 days", milliseconds: 2 * 24 * 60 * 60 * 1_000 },
  { id: "1w", label: "1 week", milliseconds: 7 * 24 * 60 * 60 * 1_000 },
] as const;

export const merchantDurationOptions = [
  { id: "1h", label: "Within 1 hour", milliseconds: 1 * 60 * 60 * 1_000 },
  { id: "4h", label: "Within 4 hours", milliseconds: 4 * 60 * 60 * 1_000 },
  { id: "1d", label: "Within 1 day", milliseconds: 24 * 60 * 60 * 1_000 },
  { id: "2d", label: "Within 2 days", milliseconds: 2 * 24 * 60 * 60 * 1_000 },
] as const;
