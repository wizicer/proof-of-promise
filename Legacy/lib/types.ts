export type PromiseStatus = "REQUESTED" | "HANDOVER_PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "FULFILLED";
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
  myRole?: "borrower" | "lender";
};
