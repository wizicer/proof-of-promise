import { Link } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import { statusCopy } from "@/constants/status";
import { relativeTime } from "@/utils/time";
import type { HumanPromise } from "@/types";

export function PromiseCard({ promise }: { promise: HumanPromise }) {
  const state = statusCopy[promise.status];
  return <Link to={`/p/${promise.id}`} className="promise-card group"><span className={`status-dot status-${promise.status.toLowerCase()}`}><span /></span><span className="promise-card-copy"><span className="promise-card-title"><strong>{promise.item}</strong><span className="role-tag">{promise.kind === "SHOW_UP" ? "Committed" : promise.myRole === "borrower" ? "Borrowing" : "Lending"}</span></span><span className="promise-card-meta"><span>{state.label}</span><span><Clock3 />{relativeTime(promise.deadline)}</span></span></span><ArrowRight className="promise-card-arrow" /></Link>;
}
