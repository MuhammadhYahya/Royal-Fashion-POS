import Link from "next/link";
import { getDailyCompleteReport } from "@/app/actions/report-actions";
import { PrintButton } from "@/app/components/print-button";
import { formatMoney } from "@/lib/pos/format";

export default async function DailyCompleteReportPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const report = await getDailyCompleteReport(date);

  if (!report) {
    return (
      <section className="stack">
        <section className="card">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Complete Daily Report</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            Invalid report date.
          </p>
          <div className="row no-print" style={{ marginTop: "0.85rem" }}>
            <Link href="/report" className="btn btn-outline">
              Back to Report
            </Link>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="section-head-row no-print">
        <Link href="/report" className="btn btn-outline">
          Back to Report
        </Link>
        <PrintButton label="Generate PDF (Print)" />
      </div>

      <section className="card">
        <div className="section-head">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Complete Daily Report - {report.date}</h1>
          <p className="text-muted">
            Generated at local time:{" "}
            {new Date(report.generatedAt).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "medium",
            })}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Sales and Payment Breakdown</h2>
        <div className="table-wrap" style={{ marginTop: "0.6rem" }}>
          <table className="table">
            <tbody>
              <tr>
                <th>Total Sales</th>
                <td>{formatMoney(report.totalSales, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Cash Payments</th>
                <td>{formatMoney(report.cashPayments, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Card Payments</th>
                <td>{formatMoney(report.cardPayments, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Discounts</th>
                <td>{formatMoney(report.discounts, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Transaction Count</th>
                <td>{report.transactionCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Expense List</h2>
        <div className="table-wrap" style={{ marginTop: "0.6rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Category</th>
                <th>Type</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.length > 0 ? (
                report.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.createdAt).toLocaleTimeString(undefined)}</td>
                    <td>{expense.category}</td>
                    <td>{expense.type}</td>
                    <td>{expense.note || "-"}</td>
                    <td>{formatMoney(expense.amount, "LKR", "en-LK")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No expenses recorded for this day.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Expense Categories Summary</h2>
        <div className="table-wrap" style={{ marginTop: "0.6rem" }}>
          <table className="table">
            <tbody>
              <tr>
                <th>Tea</th>
                <td>{formatMoney(report.expenseCategoryTotals.Tea, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Transport</th>
                <td>{formatMoney(report.expenseCategoryTotals.Transport, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Other</th>
                <td>{formatMoney(report.expenseCategoryTotals.Other, "LKR", "en-LK")}</td>
              </tr>
              <tr>
                <th>Total Expenses</th>
                <td>{formatMoney(report.totalExpenses, "LKR", "en-LK")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Final Balance / Profit</h2>
        <p style={{ marginTop: "0.5rem", fontSize: "1.4rem", fontWeight: 800 }}>
          {formatMoney(report.finalBalance, "LKR", "en-LK")}
        </p>
      </section>
    </section>
  );
}
