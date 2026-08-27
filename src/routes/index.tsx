import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MQI — Quality Intelligence Platform" },
      {
        name: "description",
        content:
          "MQI — Manufacturing Quality Inspection platform for recording and submitting inspection results.",
      },
      { property: "og:title", content: "MQI — Quality Intelligence Platform" },
      {
        property: "og:description",
        content:
          "Manufacturing Quality Inspection platform for recording and submitting inspection results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const PART_OPTIONS = [
  "TVS FRONT CALIPER",
  "K-17 FRONT CALIPER",
  "REJ-C MASTER CYL",
  "ACPD CALIPER",
  "HERO ADHG CALIPER",
  "HONDA UNICORN CALIPER",
  "CANISTER K10",
  "N-TOEQ MASTER CYL",
  "TVS FRONT MASTER CYLINDER",
  "HERO ABSR MASTER CYL",
  "ADJR MASTER CYLINDER",
  "ADHG MASTER CYLINDER",
  "HONDA UNICORN MASTER CYLINDER",
  "H105 M/CYL",
  "PULSER HOLDER BRACKET",
];

const WEBHOOK_URL = "https://gauravai.app.n8n.cloud/webhook/mauli-inspection";

type SubmitResult =
  | { kind: "success"; message: string }
  | { kind: "backend-errors"; errors: string[] }
  | { kind: "network-error"; message: string };

type SubmittedRecord = {
  partName: string;
  checkQty: number;
  okQty: number;
  rejQty: number;
  reworkQty: number;
  rejPercent: number;
  reworkPercent: number;
  submittedAt: string;
  status: "Valid" | "Invalid";
  severity: string | null;
  messages: string[];
};

function isNonNegativeWholeNumber(value: string): boolean {
  if (value.trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const THEME_KEY = "mqi-theme";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_KEY);
    } catch {
      stored = null;
    }
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  return { theme, toggleTheme };
}

/** Reads a display value from the backend response without altering its meaning. */
function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function readMessages(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["errors", "messages", "message", "error"]) {
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = readString(item) ?? (item && typeof item === "object" ? readString((item as Record<string, unknown>)["message"]) : null);
        if (text) out.push(text);
      }
    } else {
      const text = readString(value);
      if (text) out.push(text);
    }
  }
  return out;
}


function Index() {
  const [partName, setPartName] = useState("");
  const [checkQty, setCheckQty] = useState("");
  const [okQty, setOkQty] = useState("");
  const [rejQty, setRejQty] = useState("");
  const [reworkQty, setReworkQty] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [record, setRecord] = useState<SubmittedRecord | null>(null);
  const [exporting, setExporting] = useState<null | "pdf" | "jpg">(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();



  // Display-only quality snapshot. Percentages are never used for validation.
  const checkQtyNum = checkQty.trim() === "" ? 0 : toNumber(checkQty);
  const rejQtyNum = rejQty.trim() === "" ? 0 : toNumber(rejQty);
  const reworkQtyNum = reworkQty.trim() === "" ? 0 : toNumber(reworkQty);
  const rejPercent = checkQtyNum === 0 ? 0 : (rejQtyNum / checkQtyNum) * 100;
  const reworkPercent = checkQtyNum === 0 ? 0 : (reworkQtyNum / checkQtyNum) * 100;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!partName) errors["partName"] = "Part Name is required.";
    if (!isNonNegativeWholeNumber(checkQty))
      errors["checkQty"] = "Check Qty is required and must be a non-negative whole number.";
    if (!isNonNegativeWholeNumber(okQty))
      errors["okQty"] = "OK Qty is required and must be a non-negative whole number.";
    if (!isNonNegativeWholeNumber(rejQty))
      errors["rejQty"] = "Reject Qty is required and must be a non-negative whole number.";
    if (reworkQty.trim() !== "" && !isNonNegativeWholeNumber(reworkQty))
      errors["reworkQty"] = "Rework Qty must be a non-negative whole number.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNewData() {
    setPartName("");
    setCheckQty("");
    setOkQty("");
    setRejQty("");
    setReworkQty("");
    setFieldErrors({});
    setResult(null);
    setRecord(null);
  }

  async function exportRecord(kind: "pdf" | "jpg") {
    const node = recordRef.current;
    if (!node || !record) return;
    setExporting(kind);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const safePart = record.partName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const fileBase = `mqi-inspection-${safePart}`;
      if (kind === "jpg") {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.download = `${fileBase}.jpg`;
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 32;
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, imgWidth, imgHeight);
        pdf.save(`${fileBase}.pdf`);
      }
    } catch {
      setResult({
        kind: "network-error",
        message: "Unable to generate the export. Please try again.",
      });
    } finally {
      setExporting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!validate()) return;


    setSubmitting(true);
    const payload = {
      partName,
      checkQty: toNumber(checkQty),
      okQty: toNumber(okQty),
      rejQty: toNumber(rejQty),
      reworkQty: reworkQty.trim() === "" ? 0 : toNumber(reworkQty),
      rejPercent: Number(rejPercent.toFixed(2)),
      reworkPercent: Number(reworkPercent.toFixed(2)),
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      const severity = data && typeof data === "object" ? readString(data.severity) : null;
      const messages = readMessages(data);
      const baseRecord = {
        ...payload,
        submittedAt: new Date().toLocaleString(),
        severity,
        messages,
      };

      if (data && data.isValid === true) {
        setResult({ kind: "success", message: "Inspection submitted successfully." });
        setRecord({ ...baseRecord, status: "Valid" });
      } else {
        const errors: string[] = messages.length > 0 ? messages : ["The backend did not accept this inspection."];
        setResult({ kind: "backend-errors", errors });
        setRecord({ ...baseRecord, status: "Invalid", messages: errors });
      }


    } catch {
      setResult({
        kind: "network-error",
        message: "Unable to submit inspection. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";
  const labelClass = "mb-1 block text-sm font-medium text-foreground";
  const errorClass = "mt-1 text-xs text-destructive";

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            MQI
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              MQI — Quality Intelligence Platform
            </h1>
            <p className="text-xs text-muted-foreground">Manufacturing Quality Inspection</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
            <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>
      </header>


      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Inspection Details form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
            noValidate
          >
            <h2 className="text-base font-semibold text-foreground">Inspection Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record the inspection quantities for a part and submit them to the quality system.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="partName" className={labelClass}>
                  Part Name <span className="text-destructive">*</span>
                </label>
                <select
                  id="partName"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a part…</option>
                  {PART_OPTIONS.map((part) => (
                    <option key={part} value={part}>
                      {part}
                    </option>
                  ))}
                </select>
                {fieldErrors["partName"] && <p className={errorClass}>{fieldErrors["partName"]}</p>}
              </div>

              <div>
                <label htmlFor="checkQty" className={labelClass}>
                  Check Qty <span className="text-destructive">*</span>
                </label>
                <input
                  id="checkQty"
                  type="number"
                  min={0}
                  step={1}
                  value={checkQty}
                  onChange={(e) => setCheckQty(e.target.value)}
                  className={inputClass}
                  required
                />
                {fieldErrors["checkQty"] && <p className={errorClass}>{fieldErrors["checkQty"]}</p>}
              </div>

              <div>
                <label htmlFor="okQty" className={labelClass}>
                  OK Qty <span className="text-destructive">*</span>
                </label>
                <input
                  id="okQty"
                  type="number"
                  min={0}
                  step={1}
                  value={okQty}
                  onChange={(e) => setOkQty(e.target.value)}
                  className={inputClass}
                  required
                />
                {fieldErrors["okQty"] && <p className={errorClass}>{fieldErrors["okQty"]}</p>}
              </div>

              <div>
                <label htmlFor="rejQty" className={labelClass}>
                  Reject Qty <span className="text-destructive">*</span>
                </label>
                <input
                  id="rejQty"
                  type="number"
                  min={0}
                  step={1}
                  value={rejQty}
                  onChange={(e) => setRejQty(e.target.value)}
                  className={inputClass}
                  required
                />
                {fieldErrors["rejQty"] && <p className={errorClass}>{fieldErrors["rejQty"]}</p>}
              </div>

              <div>
                <label htmlFor="reworkQty" className={labelClass}>
                  Rework Qty <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="reworkQty"
                  type="number"
                  min={0}
                  step={1}
                  value={reworkQty}
                  onChange={(e) => setReworkQty(e.target.value)}
                  className={inputClass}
                />
                {fieldErrors["reworkQty"] && <p className={errorClass}>{fieldErrors["reworkQty"]}</p>}
              </div>
            </div>

            {result && (
              <div
                role="status"
                className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                  result.kind === "success"
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-destructive/30 bg-destructive/5 text-foreground"
                }`}
              >
                {result.kind === "backend-errors" ? (
                  <div>
                    <p className="font-medium">The inspection was not accepted:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="font-medium">{result.message}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Submitting Inspection..." : "Submit Inspection"}
              </button>
              {record && (
                <button
                  type="button"
                  onClick={handleNewData}
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
                >
                  + New Data
                </button>
              )}
            </div>
          </form>


          {/* Quality Snapshot */}
          <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Quality Snapshot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Display-only metrics based on the quantities entered.
            </p>
            <dl className="mt-6 space-y-4">
              <div className="rounded-lg bg-muted/60 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reject %
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">
                  {rejPercent.toFixed(2)}%
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rework %
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">
                  {reworkPercent.toFixed(2)}%
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        {record && (
          <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Inspection Result</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  record.status === "Valid"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {record.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Response received from the inspection backend on {record.submittedAt}.
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Part Name", record.partName],
                ["Check Qty", String(record.checkQty)],
                ["OK Qty", String(record.okQty)],
                ["Reject Qty", String(record.rejQty)],
                ["Rework Qty", String(record.reworkQty)],
                ["Reject %", `${record.rejPercent.toFixed(2)}%`],
                ["Rework %", `${record.reworkPercent.toFixed(2)}%`],
                ...(record.severity ? [["Severity", record.severity]] : []),
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            {record.messages.length > 0 && (
              <div className="mt-5 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Backend messages</p>
                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                  {record.messages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {record && (

          <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold uppercase tracking-wide text-foreground">
              EXPORT INSPECTION RECORD
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download the current inspection record as a shareable PDF or JPG image.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => exportRecord("pdf")}
                disabled={exporting !== null}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {exporting === "pdf" ? "Preparing PDF..." : "↓ Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => exportRecord("jpg")}
                disabled={exporting !== null}
                className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {exporting === "jpg" ? "Preparing JPG..." : "↓ Download JPG"}
              </button>
            </div>
          </section>
        )}

        {/* Offscreen printable record used only for exports */}
        {record && (
          <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
            <div
              ref={recordRef}
              style={{ width: 720, background: "#ffffff", color: "#0f172a" }}
              className="p-10 font-sans"
            >
              <div style={{ borderBottom: "2px solid #0d9488", paddingBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  MQI — Quality Intelligence Platform
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                  Manufacturing Quality Inspection
                </div>
              </div>
              <div style={{ marginTop: 24, fontSize: 16, fontWeight: 600 }}>
                Inspection Record
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                Generated {record.submittedAt}
              </div>

              <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {[
                    ["Part Name", record.partName],
                    ["Check Qty", String(record.checkQty)],
                    ["OK Qty", String(record.okQty)],
                    ["Reject Qty", String(record.rejQty)],
                    ["Rework Qty", String(record.reworkQty)],
                    ["Reject %", `${record.rejPercent.toFixed(2)}%`],
                    ["Rework %", `${record.reworkPercent.toFixed(2)}%`],
                    ["Submission Status", record.status],
                    ...(record.severity ? [["Severity", record.severity]] : []),

                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td
                        style={{
                          padding: "10px 12px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          width: "45%",
                          color: "#475569",
                        }}
                      >
                        {label}
                      </td>
                      <td style={{ padding: "10px 12px", border: "1px solid #e2e8f0", fontWeight: 600 }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {record.messages.length > 0 && (
                <div style={{ marginTop: 20, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>Backend response messages</div>
                  <ul style={{ marginTop: 6, paddingLeft: 18, color: "#475569" }}>
                    {record.messages.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}


              <div style={{ marginTop: 28, fontSize: 11, color: "#64748b" }}>
                Percentages are display-only metrics derived from the recorded quantities.
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
