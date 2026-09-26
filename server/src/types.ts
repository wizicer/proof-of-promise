export const promiseStatuses = [
  "REQUESTED",
  "HANDOVER_PENDING",
  "ACTIVE",
  "RETURN_REQUESTED",
  "FULFILLED",
] as const;

export type PromiseStatus = (typeof promiseStatuses)[number];
export type PromiseRole = "borrower" | "lender";

export type HumanPromise = {
  id: string;
  item: string;
  deadline: string;
  note: string;
  createdAt: string;
  status: PromiseStatus;
  borrowerVerified: boolean;
  lenderVerified: boolean;
  fulfilledAt?: string;
  myRole?: PromiseRole;
};
