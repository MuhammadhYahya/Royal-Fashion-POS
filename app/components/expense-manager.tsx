"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { formatMoney, parseCurrencyToMinor } from "@/lib/pos/format";

type ExpenseTypeInput = "GENERAL" | "SPECIFIC";
type NoticeTone = "info" | "success" | "error";

type DailyExpense = {
  id: number;
  amount: number;
  type: ExpenseTypeInput;
  note: string | null;
  createdAt: Date | string;
};

function formatExpenseType(value: ExpenseTypeInput) {
  return value === "GENERAL" ? "General" : "Specific";
}

export function ExpenseManager({ dailyExpenses }: { dailyExpenses: DailyExpense[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseTypeInput>("GENERAL");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<NoticeTone>("info");

  const showMessage = (text: string, tone: NoticeTone) => {
    setMessage(text);
    setMessageTone(tone);
  };

  useEffect(() => {
    if (!message) {
      return;
    }
    const timeoutId = window.setTimeout(() => setMessage(""), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const submitExpense = async () => {
    const amountInCents = parseCurrencyToMinor(amount);
    if (amountInCents <= 0) {
      showMessage("Enter an expense amount greater than zero.", "error");
      return;
    }
    if (expenseType === "SPECIFIC" && !note.trim()) {
      showMessage("Add a note for specific expenses.", "error");
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInCents,
        type: expenseType,
        note: note.trim() || undefined,
      }),
    });
    const body = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to save expense.", "error");
      return;
    }

    setAmount("");
    setExpenseType("GENERAL");
    setNote("");
    showMessage("Daily expense saved.", "success");
    router.refresh();
  };

  return (
    <section className="card">
      {message ? <p className={`notice notice-${messageTone}`}>{message}</p> : null}
      <div className="section-head-row mb-4">
        <div className="row" style={{ gap: "0.75rem" }}>
          <Wallet className="w-6 h-6 text-primary" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Daily Expenses</h2>
        </div>
      </div>
      <p className="text-muted mb-4">Add daily expenses and choose type (General or Specific).</p>
      <div className="grid-2 no-print">
        <label className="field">
          <span>Amount (LKR)</span>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className="field">
          <span>Expense Type</span>
          <select
            className="input"
            value={expenseType}
            onChange={(event) => setExpenseType(event.target.value as ExpenseTypeInput)}
          >
            <option value="GENERAL">General</option>
            <option value="SPECIFIC">Specific</option>
          </select>
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Note ({expenseType === "SPECIFIC" ? "Required for specific" : "Optional"})</span>
          <input
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: Delivery fee / supplier transport"
          />
        </label>
        <button className="btn btn-primary row" type="button" onClick={submitExpense} disabled={isSaving}>
          <span>{isSaving ? "Saving..." : "Add Daily Expense"}</span>
        </button>
      </div>

      <div className="table-wrap mt-4">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Note</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {dailyExpenses.length > 0 ? (
              dailyExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.createdAt).toLocaleTimeString("en-LK")}</td>
                  <td>{formatExpenseType(expense.type)}</td>
                  <td>{expense.note || "-"}</td>
                  <td>{formatMoney(expense.amount, "LKR", "en-LK")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <p className="muted">No daily expenses added yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
