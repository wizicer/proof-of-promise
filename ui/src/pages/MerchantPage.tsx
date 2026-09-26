import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, LoaderCircle, PackageOpen, Store } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shell } from "@/layouts/Shell";
import { merchantItemOptions } from "@/constants/items";
import { merchantDurationOptions } from "@/constants/durations";
import { relativeTime } from "@/utils/time";
import { api } from "@/lib/api";
import type { HumanPromise } from "@/types";

export function MerchantPage() {
  const [items, setItems] = useState<HumanPromise[] | null>(null);
  const [itemChoice, setItemChoice] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [durationChoice, setDurationChoice] = useState("1d");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"inventory" | "list">("inventory");

  async function loadItems() {
    try {
      const data = await api.merchantPromises();
      setItems(data);
      if (data.length === 0) setActiveTab("list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load merchant items");
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function submitListing(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const item = itemChoice === "Custom" ? customItem.trim() : itemChoice;
    const preset = merchantDurationOptions.find((o) => o.id === durationChoice);
    if (!item) { setError("Choose or enter an item name"); setBusy(false); return; }
    if (!preset && !customDeadline) { setError("Choose expected return duration"); setBusy(false); return; }
    const deadline = preset ? new Date(Date.now() + preset.milliseconds) : new Date(customDeadline);
    const durationLabel = preset ? preset.label : "Custom";
    try {
      await api.createMerchantPromise({
        item,
        deadline: deadline.toISOString(),
        note: note.trim(),
        durationLabel,
      });
      setItemChoice("");
      setCustomItem("");
      setNote("");
      setActiveTab("inventory");
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not list item");
    } finally {
      setBusy(false);
    }
  }

  async function handleMerchantFinish(id: string) {
    setActionBusy(id);
    try {
      await api.act(id, "merchant-finish");
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not confirm return");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <Shell>
      <div className="max-w-xl mx-auto">
        <Link to="/personal" className="back-link"><ArrowLeft />Personal</Link>
        <section className="compact-page-heading mb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Store className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-black">Merchant Portal</h1>
              <p className="text-xs text-muted-foreground">List items with preset return limits. Customers scan QR to borrow.</p>
            </div>
          </div>
        </section>

        <div className="flex rounded-xl bg-secondary p-1 mb-4">
          <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${activeTab === "inventory" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`} onClick={() => setActiveTab("inventory")}>Inventory ({items?.length ?? 0})</button>
          <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${activeTab === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`} onClick={() => setActiveTab("list")}>+ List New Item</button>
        </div>

        {activeTab === "list" ? (
          <form onSubmit={submitListing} className="form-card promise-form mt-0 border bg-card p-4 sm:p-5 rounded-2xl">
            <div>
              <p className="eyebrow text-muted-foreground">B2C Listing</p>
              <h2 className="text-xl font-black">List an item for borrowing</h2>
              <p className="text-xs text-muted-foreground mt-1">Preset max return duration. A unique QR code will be generated.</p>
            </div>

            <fieldset className="mt-3">
              <legend className="text-xs font-bold mb-2">Item Category</legend>
              <div className="choice-grid">
                {merchantItemOptions.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" className="choice-tile" aria-pressed={itemChoice === label} onClick={() => setItemChoice(label)}>
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
                <button type="button" className="choice-tile" aria-pressed={itemChoice === "Custom"} onClick={() => setItemChoice("Custom")}>
                  <PackageOpen />
                  <span>Custom</span>
                </button>
              </div>
            </fieldset>

            {itemChoice === "Custom" && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="merchant-custom-item" className="text-xs">Custom Item Name</Label>
                <Input id="merchant-custom-item" autoFocus maxLength={80} required placeholder="e.g. Baby Stroller #3" value={customItem} onChange={(e) => setCustomItem(e.target.value)} />
              </div>
            )}

            <fieldset className="mt-3">
              <legend className="text-xs font-bold mb-2">Maximum Return Window</legend>
              <div className="duration-grid">
                {merchantDurationOptions.map((opt) => (
                  <button key={opt.id} type="button" aria-pressed={durationChoice === opt.id} onClick={() => setDurationChoice(opt.id)}>
                    {opt.label}
                  </button>
                ))}
                <button type="button" aria-pressed={durationChoice === "custom"} onClick={() => setDurationChoice("custom")}>
                  Custom
                </button>
              </div>
            </fieldset>

            {durationChoice === "custom" && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="merchant-custom-deadline" className="text-xs">Exact Return Date and Time</Label>
                <Input id="merchant-custom-deadline" type="datetime-local" required value={customDeadline} onChange={(e) => setCustomDeadline(e.target.value)} />
              </div>
            )}

            <div className="mt-3">
              <Label htmlFor="merchant-note" className="text-xs font-bold">Pickup/Return Instructions <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea id="merchant-note" className="mt-1" maxLength={240} placeholder="e.g. Pick up at front desk, return to customer service counter..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <p role="alert" className="text-xs text-destructive mt-2">{error}</p>}

            <Button size="lg" disabled={busy || !itemChoice} className="mt-4 h-12 rounded-xl w-full">
              {busy && <LoaderCircle className="animate-spin" />}
              Publish Listing QR <ArrowRight />
            </Button>
          </form>
        ) : (
          <div className="grid gap-4">
            {items === null ? (
              <div className="py-12 grid place-items-center"><LoaderCircle className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <span><Store /></span>
                <h3>No items listed yet</h3>
                <p>Add your first rental or loan item to generate a customer borrow QR code.</p>
                <Button className="mt-4 rounded-xl" onClick={() => setActiveTab("list")}>List an item now</Button>
              </div>
            ) : (
              items.map((item) => {
                const itemUrl = `${location.origin}/p/${item.id}`;
                const isRequested = item.status === "REQUESTED";
                const isActive = item.status === "ACTIVE";
                const isFulfilled = item.status === "FULFILLED";
                return (
                  <article key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{item.item}</span>
                        <span className={`role-tag ${isActive ? "bg-amber-100 text-amber-900" : isFulfilled ? "bg-emerald-100 text-emerald-900" : ""}`}>
                          {isRequested ? "Ready for Scan" : isActive ? "Lent Out / In Use" : "Returned"}
                        </span>
                      </div>
                      <Link to={`/p/${item.id}`} className="text-xs font-bold text-primary flex items-center gap-0.5">
                        Details <ArrowRight className="size-3" />
                      </Link>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-secondary/40 p-3">
                      <div className="grid place-items-center bg-white p-2 rounded-xl shadow-xs shrink-0">
                        <QRCodeSVG value={itemUrl} size={110} />
                      </div>
                      <div className="min-w-0 flex-1 text-xs space-y-1">
                        <p className="font-semibold text-muted-foreground">Expected Duration: <span className="text-foreground">{item.durationLabel ?? relativeTime(item.deadline)}</span></p>
                        {item.note && <p className="text-muted-foreground italic truncate">"{item.note}"</p>}
                        <div className="pt-2 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => void navigator.clipboard.writeText(itemUrl)}>
                            <Copy className="size-3" /> Copy QR Link
                          </Button>
                          {isActive && (
                            <Button size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionBusy === item.id} onClick={() => void handleMerchantFinish(item.id)}>
                              {actionBusy === item.id ? <LoaderCircle className="animate-spin size-3" /> : <Check className="size-3" />}
                              Confirm Recovery
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
