export type PromiseStatus =
  | "OPEN"
  | "ACTIVE"
  | "RETURN_REQUESTED"
  | "FULFILLED";

export type HumanProof = {
  nullifier: string;
  verifiedAt: string;
};

export type HumanPromise = {
  id: string;
  item: string;
  deadline: string;
  note?: string;
  createdAt: string;
  status: PromiseStatus;
  lender?: HumanProof;
  borrower?: HumanProof;
  fulfilledAt?: string;
};