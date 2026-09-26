export type PromiseStatus = "REQUESTED" | "HANDOVER_PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "FULFILLED" | "COMMITTED";
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
  kind: "RETURN" | "SHOW_UP";
  showUp?: ShowUpDetails;
  fulfilledAt?: string;
  myRole?: "borrower" | "lender";
};
