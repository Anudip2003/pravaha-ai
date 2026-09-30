import Papa from "papaparse";
import { classifyExpense } from "./classifier.js";

const HEADER_ALIASES = {
  date: ["date", "transactiondate", "dateoftransaction", "txndate", "valuedate", "postingdate"],
  description: ["description", "narration", "transactionnarration", "particulars", "transactionparticulars", "remarks", "details", "transactiondetails", "merchant"],
  debit: ["debit", "debitamount", "debitamountinr", "debitamountrs", "amountdebited", "withdrawal", "withdrawals", "withdrawalamount", "withdrawalamountinr", "withdrawn", "moneyout", "paidout", "dramount"],
  credit: ["credit", "creditamount", "creditamountinr", "creditamountrs", "amountcredited", "deposit", "deposits", "depositamount", "moneyin", "paidin", "cramount"],
  amount: ["amount", "transactionamount", "transactionamountinr", "txnamount", "amountinr", "amountrs", "value"],
  direction: ["drcr", "crdr", "debitcredit", "creditdebit", "transactiontype", "type"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TRANSACTIONS = 2000;

function normalizeHeader(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeader(headers, aliases) {
  return headers.find(header => aliases.includes(normalizeHeader(header)));
}

function parseAmount(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const source = String(value).trim();
  const isParenthesized = /^\(.*\)$/.test(source);
  const cleaned = source
    .replace(/[₹$,\s]/g, "")
    .replace(/INR/gi, "")
    .replace(/Rs\.?/gi, "")
    .replace(/[()]/g, "");
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  return isParenthesized ? -Math.abs(amount) : amount;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const source = String(value ?? "").trim();
  const isoMatch = source.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const localMatch = source.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (localMatch) {
    const first = Number(localMatch[1]);
    const second = Number(localMatch[2]);
    let year = Number(localMatch[3]);
    if (year < 100) year += 2000;
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(source);
  if (source && !Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return "";
}

export function createExpenseKey(expense) {
  const description = String(expense.description ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${expense.txn_date}|${Number(expense.amount).toFixed(2)}|${description}`;
}

export function normalizeStatementRows(rows) {
  const headers = Object.keys(rows[0] || {});
  const columns = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([name, aliases]) => [name, findHeader(headers, aliases)])
  );

  if (!columns.date || !columns.description || (!columns.debit && !columns.amount)) {
    throw new Error("Could not find transaction date, description, and debit/amount columns in this statement.");
  }
  if (rows.length > MAX_TRANSACTIONS) {
    throw new Error(`This file has more than ${MAX_TRANSACTIONS} rows. Split it into smaller files and try again.`);
  }

  const transactions = [];
  const warnings = [];
  let skippedCount = 0;
  let assumedDebitDirection = false;

  for (const row of rows) {
    const direction = String(columns.direction ? row[columns.direction] ?? "" : "").trim().toLowerCase();
    const isCredit = /(^|\W)(cr|credit|deposit|refund|salary|interest)(\W|$)/.test(direction);
    const isDebit = /(^|\W)(dr|debit|withdrawal|payment|paid)(\W|$)/.test(direction);
    const creditValue = columns.credit ? parseAmount(row[columns.credit]) : null;
    let amount;

    if (columns.debit) {
      const debitValue = parseAmount(row[columns.debit]);
      if (debitValue === null || debitValue === 0) {
        skippedCount += 1;
        continue;
      }
      amount = Math.abs(debitValue);
    } else {
      const rawAmount = parseAmount(row[columns.amount]);
      if (isCredit || (creditValue !== null && creditValue !== 0)) {
        skippedCount += 1;
        continue;
      }
      if (rawAmount === null || rawAmount === 0) {
        skippedCount += 1;
        continue;
      }
      if (rawAmount < 0) {
        amount = Math.abs(rawAmount);
      } else if (isDebit) {
        amount = rawAmount;
      } else {
        amount = rawAmount;
        assumedDebitDirection = true;
      }
    }

    const txnDate = parseDate(row[columns.date]);
    const description = String(row[columns.description] ?? "").trim().slice(0, 300);
    if (!txnDate || !description || !amount) {
      skippedCount += 1;
      continue;
    }

    transactions.push({
      amount: Math.round(amount * 100) / 100,
      description,
      txn_date: txnDate,
      category: classifyExpense(description),
    });
  }

  if (assumedDebitDirection) {
    warnings.push("This file has positive Amount values without a debit/credit indicator; review these rows before importing.");
  }
  if (!transactions.length) {
    throw new Error("No outgoing transactions were found. Check that the statement has debit amounts and supported columns.");
  }

  return { transactions, skippedCount, warnings };
}

export async function parseStatementFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Choose a statement smaller than 10 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  let rows;
  let parserWarnings = [];

  if (extension === "csv") {
    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: resolve,
        error: reject,
      });
    });
    rows = parsed.data;
    if (parsed.errors.length) parserWarnings.push(`${parsed.errors.length} CSV formatting issue(s) found; review the preview carefully.`);
  } else if (extension === "xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    const [headerRow, ...dataRows] = sheet;
    if (!headerRow) throw new Error("The spreadsheet is empty.");
    const headers = headerRow.map((header, index) => String(header ?? `column_${index + 1}`));
    rows = dataRows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  } else {
    throw new Error("Choose a CSV or XLSX statement file.");
  }

  const result = normalizeStatementRows(rows.filter(row => Object.values(row).some(value => String(value ?? "").trim())));
  return { ...result, warnings: [...parserWarnings, ...result.warnings] };
}