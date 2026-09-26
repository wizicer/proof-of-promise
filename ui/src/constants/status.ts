import type { PromiseStatus } from "@/types";

export const statusCopy: Record<PromiseStatus, { label: string; hint: string }> = {
  REQUESTED: { label: "Looking for a lender", hint: "Share your promise link" },
  HANDOVER_PENDING: { label: "Handover in person", hint: "Borrower confirms receipt" },
  ACTIVE: { label: "Promise active", hint: "Item is with the borrower" },
  RETURN_REQUESTED: { label: "Return in progress", hint: "Lender checks the item" },
  FULFILLED: { label: "Promise kept", hint: "Returned and confirmed" },
  COMMITTED: { label: "Promise committed", hint: "Ready for you or your agent" },
};
