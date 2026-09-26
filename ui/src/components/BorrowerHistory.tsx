import { LoaderCircle } from "lucide-react";
import type { BorrowerHistory as BorrowerHistoryData } from "@/types";

const categories = [
  { key: "returnedOnTime", label: "On time", className: "history-on-time" },
  { key: "returnedLate", label: "Late", className: "history-late" },
  { key: "active", label: "Active", className: "history-active" },
  { key: "overdue", label: "Overdue", className: "history-overdue" },
] as const;

export function BorrowerHistory({ history }: { history: BorrowerHistoryData | null | undefined }) {
  return <section className="borrower-history" aria-label="Borrower's return history">
    <div className="borrower-history-heading">
      <h2>Borrower history</h2>
      {history && <span>{history.total} {history.total === 1 ? "record" : "records"}</span>}
    </div>
    {history === undefined ? <div className="borrower-history-loading"><LoaderCircle className="animate-spin" /><span>Loading history</span></div> : history === null ? <p className="borrower-history-empty">History is temporarily unavailable.</p> : history.total === 0 ? <p className="borrower-history-empty">No borrowing history yet.</p> : <>
      <div className="history-bar" aria-label={`${history.total} borrowing records`}>
        {categories.map(({ key, label, className }) => history[key] > 0 && <span key={key} className={className} style={{ width: `${history[key] / history.total * 100}%` }} title={`${label}: ${history[key]}`}><b>{history[key]}</b></span>)}
      </div>
      <div className="history-legend">
        {categories.map(({ key, label, className }) => <span key={key}><i className={className} /><b>{history[key]}</b><small>{label}</small></span>)}
      </div>
    </>}
  </section>;
}
