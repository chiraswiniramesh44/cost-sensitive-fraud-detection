import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DecisionBadge from "../components/DecisionBadge";
import transactionService from "../services/transactionService";
import { extractApiError, formatProbability, formatCost } from "../utils/decision";

const MAX_CSV_BYTES = 1_000_000;
const MAX_ROWS = 200;

// Small CSV reader supporting quoted fields, commas inside quotes, and escaped quotes.
function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== "")) records.push(row);
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map((value) => value.trim().replace(/^\uFEFF/, ""));
  return {
    headers,
    rows: records.slice(1).map((values) => Object.fromEntries(
      headers.map((header, index) => [header, (values[index] ?? "").trim()])
    )),
  };
}

function calculateMetrics(fileRows, results) {
  const labelColumn = ["Class", "class", "label", "is_fraud", "fraud_label"].find((name) =>
    fileRows.headers.includes(name)
  );
  if (!labelColumn) return { available: false, reason: "Your CSV has no ground-truth label column (for example, Class). Upload a labeled test CSV to calculate accuracy, precision, recall, and F1." };

  let tp = 0; let tn = 0; let fp = 0; let fn = 0; let evaluated = 0;
  for (const result of results ?? []) {
    if (result.status !== "success") continue;
    const sourceRow = fileRows.rows[(result.row_number ?? 0) - 1];
    if (!sourceRow) continue;
    const rawLabel = sourceRow[labelColumn];
    if (rawLabel !== "0" && rawLabel !== "1") continue;
    const actual = Number(rawLabel);
    const probability = Number(result.fraud_probability);
    if (!Number.isFinite(probability)) continue;
    // Classification metrics use the conventional 0.50 probability cutoff.
    // This is separate from the cost-sensitive APPROVE/REVIEW/BLOCK policy.
    const predicted = probability >= 0.5 ? 1 : 0;
    evaluated += 1;
    if (actual === 1 && predicted === 1) tp += 1;
    else if (actual === 0 && predicted === 0) tn += 1;
    else if (actual === 0 && predicted === 1) fp += 1;
    else fn += 1;
  }
  if (!evaluated) return { available: false, reason: `A label column (${labelColumn}) was found, but no successfully scored rows had valid 0/1 labels.` };
  const safeDivide = (a, b) => (b ? a / b : 0);
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  return {
    available: true,
    evaluated,
    accuracy: safeDivide(tp + tn, evaluated),
    precision,
    recall,
    f1,
    tp, tn, fp, fn,
    labelColumn,
    cutoff: 0.5,
  };
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-card-title">{label}</p>
      <h2 className="stat-card-value" style={{ color: "#1d4ed8" }}>{value}</h2>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function PredictTransaction() {
  const [file, setFile] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [fileRows, setFileRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const metrics = useMemo(
    () => (batchResult && fileRows ? calculateMetrics(fileRows, batchResult.results) : null),
    [batchResult, fileRows]
  );
  const successfulRows = batchResult?.results?.filter((row) => row.status === "success") ?? [];
  const fraudCount = successfulRows.filter((row) => Number(row.fraud_probability) >= 0.5).length;

  const chooseFile = async (selected) => {
    setError("");
    setBatchResult(null);
    setFileRows(null);
    if (!selected) { setFile(null); return; }
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setFile(null); setError("Please choose a CSV file (.csv)."); return;
    }
    if (selected.size > MAX_CSV_BYTES) {
      setFile(null); setError(`This backend currently accepts CSV files up to 1 MB. Selected file: ${(selected.size / 1024 / 1024).toFixed(2)} MB.`); return;
    }
    try {
      const parsed = parseCsv(await selected.text());
      if (!parsed.headers.length || !parsed.rows.length) {
        setError("The selected CSV is empty or has no readable header row."); setFile(null); return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setError(`This backend currently supports up to ${MAX_ROWS} data rows per upload. Your file has ${parsed.rows.length}.`); setFile(null); return;
      }
      setFile(selected);
      setFileRows(parsed);
    } catch {
      setFile(null); setError("Could not read this file. Save it as a UTF-8 CSV and try again.");
    }
  };

  const runAnalysis = async () => {
    if (!file) { setError("Choose a CSV file before running the analysis."); return; }
    setLoading(true); setError(""); setBatchResult(null);
    try {
      const response = await transactionService.predictBatchCsv(file);
      setBatchResult(response);
    } catch (err) {
      setError(extractApiError(err, "Upload analysis failed. Check that the CSV includes Time, V1–V28, and Amount."));
    } finally { setLoading(false); }
  };

  const downloadResults = () => {
    if (!batchResult?.results?.length) return;
    const columns = ["row_number", "external_id", "status", "decision", "fraud_probability", "risk_level", "expected_cost", "model_version", "transaction_id", "error"];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [columns.join(","), ...batchResult.results.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fraud-prediction-results.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <main className="page-content predict-page">
          <div className="page-header">
            <div>
              <h1>Upload Transaction File</h1>
              <p>Upload a transaction CSV to screen its rows for potential fraud and review the model results.</p>
            </div>
            <span className="data-status">{loading ? "ANALYZING" : batchResult ? "RESULTS READY" : "READY"}</span>
          </div>

          <section className="dashboard-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 12, background: "#eff6ff", color: "#1d4ed8", display: "grid", placeItems: "center", fontSize: 25 }}>↑</div>
              <div><h2 style={{ margin: "0 0 5px" }}>Upload CSV file</h2><p style={{ margin: 0, color: "#64748b" }}>The file is processed by your connected fraud-detection model.</p></div>
            </div>
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
              style={{ border: `2px dashed ${dragging ? "#2563eb" : "#cbd5e1"}`, borderRadius: 14, padding: "32px 18px", textAlign: "center", background: dragging ? "#eff6ff" : "#f8fafc", transition: "all .15s" }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">▤</div>
              <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{file ? file.name : "Drag and drop your CSV here"}</p>
              <p style={{ color: "#64748b", margin: "0 0 16px", fontSize: 14 }}>{file ? `${(file.size / 1024).toFixed(1)} KB · ${fileRows?.rows.length ?? 0} data rows` : "or select a file from your computer"}</p>
              <label className="predict-secondary-btn" style={{ display: "inline-block", cursor: "pointer" }}>
                Browse files
                <input type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10 }}><strong style={{ display: "block", marginBottom: 4 }}>Required model columns</strong><span style={{ color: "#64748b", fontSize: 13 }}>Time, V1–V28, Amount</span></div>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10 }}><strong style={{ display: "block", marginBottom: 4 }}>Current upload limit</strong><span style={{ color: "#64748b", fontSize: 13 }}>CSV · up to 1 MB · 200 rows</span></div>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10 }}><strong style={{ display: "block", marginBottom: 4 }}>For evaluation metrics</strong><span style={{ color: "#64748b", fontSize: 13 }}>Include a ground-truth Class column (0 = legitimate, 1 = fraud)</span></div>
            </div>
            {fileRows && !fileRows.headers.includes("Class") && !fileRows.headers.includes("class") && !fileRows.headers.includes("label") && !fileRows.headers.includes("is_fraud") && !fileRows.headers.includes("fraud_label") && (
              <p className="field-hint" style={{ marginTop: 14 }}>This file can be scored, but accuracy, precision, recall, and F1 cannot be calculated without actual labels.</p>
            )}
            {error && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 8, color: "#991b1b", background: "#fef2f2" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
              <button type="button" className="predict-primary-btn" onClick={runAnalysis} disabled={loading || !file}>{loading ? "Analyzing file…" : "Analyze uploaded file"}</button>
              <button type="button" className="predict-secondary-btn" disabled={!file || loading} onClick={() => { setFile(null); setFileRows(null); setBatchResult(null); setError(""); }}>Clear file</button>
            </div>
          </section>

          {batchResult && (
            <>
              <section className="dashboard-card" style={{ marginTop: 22, padding: 24 }}>
                <div className="page-header">
                  <div><h2>File prediction summary</h2><p>Predictions are model outputs, not independently confirmed fraud labels.</p></div>
                  <button type="button" className="predict-secondary-btn" onClick={downloadResults}>Download results CSV</button>
                </div>
                <div className="stats-grid predict-stats">
                  <MetricCard label="Rows in file" value={batchResult.total_rows} />
                  <MetricCard label="Successfully analyzed" value={batchResult.success_count} />
                  <MetricCard label="Rows with errors" value={batchResult.error_count} />
                  <MetricCard label="Predicted fraud candidates" value={fraudCount} hint="Probability ≥ 50%; not the policy decision." />
                </div>
              </section>

              <section className="dashboard-card" style={{ marginTop: 22, padding: 24 }}>
                <h2>Evaluation metrics for this uploaded file</h2>
                {metrics?.available ? (
                  <>
                    <p style={{ color: "#64748b" }}>Calculated only on {metrics.evaluated} successfully scored rows with valid actual labels from <strong>{metrics.labelColumn}</strong>. Metrics use a 0.50 probability cutoff, which is separate from the cost-sensitive APPROVE / REVIEW / BLOCK policy.</p>
                    <div className="stats-grid predict-stats">
                      <MetricCard label="Accuracy" value={`${(metrics.accuracy * 100).toFixed(2)}%`} />
                      <MetricCard label="Precision" value={`${(metrics.precision * 100).toFixed(2)}%`} />
                      <MetricCard label="Recall" value={`${(metrics.recall * 100).toFixed(2)}%`} />
                      <MetricCard label="F1 score" value={`${(metrics.f1 * 100).toFixed(2)}%`} />
                    </div>
                    <p className="field-hint" style={{ marginTop: 12 }}>TP: {metrics.tp} · TN: {metrics.tn} · FP: {metrics.fp} · FN: {metrics.fn}</p>
                  </>
                ) : (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 16, color: "#92400e" }}>
                    <strong>Evaluation metrics unavailable</strong><p style={{ marginBottom: 0 }}>{metrics?.reason ?? "Upload a labeled CSV with Class values 0 (legitimate) and 1 (fraud) to calculate accuracy, precision, recall, and F1."}</p>
                  </div>
                )}
              </section>

              <section className="dashboard-card" style={{ marginTop: 22, padding: 24 }}>
                <h2>Transaction-level predictions</h2>
                <div className="transaction-table-container" style={{ marginTop: 14 }}>
                  <table className="transaction-table">
                    <thead><tr><th>Row</th><th>Transaction ID</th><th>Prediction decision</th><th>Fraud probability</th><th>Risk level</th><th>Expected cost</th><th>Status / error</th></tr></thead>
                    <tbody>{batchResult.results.map((row) => (
                      <tr key={`${row.row_number}-${row.external_id}`}>
                        <td>{row.row_number}</td><td>{row.external_id || "—"}</td>
                        <td>{row.decision ? <DecisionBadge decision={row.decision} /> : "—"}</td>
                        <td>{formatProbability(row.fraud_probability)}</td><td>{row.risk_level || "—"}</td><td>{row.expected_cost == null ? "—" : formatCost(row.expected_cost)}</td><td>{row.status === "success" ? "Analyzed" : row.error || "Failed"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <p className="field-hint" style={{ marginTop: 16 }}>Privacy note: upload only authorized data. Do not include card numbers, CVVs, passwords, or other unnecessary personal information.</p>
        </main>
      </div>
    </div>
  );
}

export default PredictTransaction;
