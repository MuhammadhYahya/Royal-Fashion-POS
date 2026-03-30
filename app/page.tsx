import Link from "next/link";
import { ExpenseManager } from "@/app/components/expense-manager";
import { RecentTransactions } from "@/app/components/recent-transactions";
import { getSalesReports, listSales } from "@/app/actions/sale-actions";
import { listDailyExpenses } from "@/app/actions/expense-actions";
import { formatMoney } from "@/lib/pos/format";
import { Wallet } from "lucide-react";

export default async function Home() {
  const [sales, reports, dailyExpenses] = await Promise.all([
    listSales(),
    getSalesReports(),
    listDailyExpenses(),
  ]);

  return (
    <section className="stack">
      <div className="section-head-row mb-2">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Sales</h1>
      </div>
      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Wallet className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>End of Day Summary</h2>
          </div>
          <Link className="btn btn-outline no-print" href="/report">
            Open Reports
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Gross Sales</th>
                <th>Refunds</th>
                <th>Net Sales</th>
                <th>Total Expenses</th>
                <th>Net Profit</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatMoney(reports.daily.totalSales, "LKR", "en-LK")}</td>
                <td>{formatMoney(reports.daily.totalRefunds, "LKR", "en-LK")}</td>
                <td>{formatMoney(reports.daily.netSales, "LKR", "en-LK")}</td>
                <td>{formatMoney(reports.daily.totalExpenses, "LKR", "en-LK")}</td>
                <td>{formatMoney(reports.daily.netProfit, "LKR", "en-LK")}</td>
                <td>{reports.daily.transactions}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <ExpenseManager dailyExpenses={dailyExpenses} />
      <RecentTransactions sales={sales} />
    </section>
  );
}
