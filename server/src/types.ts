export const promiseStatuses = [
  "REQUESTED",
  "HANDOVER_PENDING",
  "ACTIVE",
  "RETURN_REQUESTED",
  "FULFILLED",
  "COMMITTED",
] as const;

export type PromiseStatus = (typeof promiseStatuses)[number];
export type PromiseRole = "borrower" | "lender";
export type PromiseKind = "RETURN" | "SHOW_UP" | "B2C";

export type ShowUpDetails = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  centerTime: string;
  windowHours: number;
  timezone: string;
};

export type HumanPromise = {
  id: string;
  item: string;
  deadline: string;
  note: string;
  createdAt: string;
  status: PromiseStatus;
  borrowerVerified: boolean;
  lenderVerified: boolean;
  kind: PromiseKind;
  showUp?: ShowUpDetails;
  fulfilledAt?: string;
  myRole?: PromiseRole;
  durationLabel?: string;
  icon?: string;
};

