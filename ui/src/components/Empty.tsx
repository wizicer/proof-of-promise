import { ScanLine } from "lucide-react";

export function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span><ScanLine /></span><h3>{title}</h3><p>{copy}</p></div>;
}
