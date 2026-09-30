import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { apiImportExpenses } from "../api/client";
import { createExpenseKey, parseStatementFile } from "../api/statementImport";

export default function StatementImport({ expenses, onImported, isLoading }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParsing(true);
    setError("");
    setSuccess("");
    try {
      const parsed = await parseStatementFile(file);
      const knownTransactions = new Set(expenses.map(createExpenseKey));
      const previewRows = parsed.transactions.map((transaction, index) => {
        const key = createExpenseKey(transaction);
        const duplicate = knownTransactions.has(key);
        knownTransactions.add(key);
        return { ...transaction, key: `${key}-${index}`, duplicate, selected: !duplicate };
      });

      setFileName(file.name);
      setRows(previewRows);
      setSkippedCount(parsed.skippedCount);
      setWarnings(parsed.warnings);
    } catch (parseError) {
      setFileName("");
      setRows([]);
      setError(parseError.message || "Could not read this statement.");
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(key) {
    setRows(current => current.map(row => row.key === key
      ? { ...row, selected: !row.selected }
      : row));
  }

  async function handleImport() {
    const selected = rows.filter(row => row.selected);
    if (!selected.length) return;

    setImporting(true);
    setError("");
    try {
      const imported = await apiImportExpenses(selected.map(({ amount, description, txn_date, category }) => ({
        amount,
        description,
        txn_date,
        category,
      })));
      onImported(imported);
      setSuccess(`Imported ${imported.length} transaction${imported.length === 1 ? "" : "s"}.`);
      setRows([]);
      setFileName("");
      setWarnings([]);
      setSkippedCount(0);
    } catch (importError) {
      setError(importError.message || "Could not import this statement.");
    } finally {
      setImporting(false);
    }
  }

  function clearPreview() {
    setRows([]);
    setFileName("");
    setWarnings([]);
    setSkippedCount(0);
    setError("");
    setSuccess("");
  }

  const selectedCount = rows.filter(row => row.selected).length;
  const duplicateCount = rows.filter(row => row.duplicate).length;

  return (
    <section className="border border-white/10 rounded-xl p-5 bg-white/[0.02] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#C9A24B]/10 text-[#C9A24B]">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h2 className="text-white/80 text-sm font-medium">Import bank statement</h2>
            <p className="text-white/35 text-xs">CSV or XLSX · outgoing transactions only</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading || parsing || importing}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 hover:border-white/30 disabled:opacity-50"
        >
          <Upload size={15} />
          {isLoading ? "Loading expenses..." : parsing ? "Reading statement..." : "Choose file"}
        </button>
        <a href="/sample-bank-statement.csv" download className="text-xs text-white/45 underline underline-offset-4 hover:text-white/75">
          Download sample CSV
        </a>
      </div>

      {fileName && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
          <span>{fileName}: {rows.length} outgoing transaction(s) found</span>
          <span>{selectedCount} selected{duplicateCount ? ` · ${duplicateCount} possible duplicate(s) flagged` : ""}{skippedCount ? ` · ${skippedCount} other row(s) skipped` : ""}</span>
        </div>
      )}

      {warnings.map(warning => (
        <p key={warning} className="flex items-start gap-2 text-xs text-amber-200/80">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />{warning}
        </p>
      ))}
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      {success && <p className="flex items-center gap-2 text-emerald-300 text-sm"><CheckCircle2 size={15} />{success}</p>}

      {rows.length > 0 && (
        <>
          <div className="max-h-80 overflow-auto border border-white/10 rounded-lg">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 bg-[#111827] text-white/40">
                <tr>
                  <th className="w-9 px-3 py-2">Add</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {rows.map(row => (
                  <tr key={row.key} className={row.duplicate ? "opacity-60" : ""}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(row.key)}
                        aria-label={`Import ${row.description}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{row.txn_date}</td>
                    <td className="max-w-64 truncate px-3 py-2" title={row.description}>{row.description}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.category}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.duplicate ? "Possible duplicate" : "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={clearPreview} disabled={importing} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/45 hover:text-white/75 disabled:opacity-50">
              <X size={14} />Clear
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: "#C9A24B", color: "#0E1525" }}
            >
              {importing ? "Importing..." : `Import ${selectedCount} transaction${selectedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}