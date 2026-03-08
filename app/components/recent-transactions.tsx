"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/pos/format";
import { Receipt } from "lucide-react";

type SaleRow = {
  id: number;
  createdAt: Date | string;
  total: number;
  _count: {
    saleLines: number;
    returns: number;
  };
};

export function RecentTransactions({ sales }: { sales: SaleRow[] }) {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const topTen = sales.slice(0, 10);
  const older = sales.slice(10);
  const searchedSale = useMemo(() => {
    const cleaned = query.trim().replace(/^#/, "");
    if (!cleaned) {
      return null;
    }
    const id = Number(cleaned);
    if (!Number.isInteger(id) || id <= 0) {
      return undefined;
    }
    return sales.find((sale) => sale.id === id) ?? null;
  }, [query, sales]);

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput);
  }

  function renderRow(sale: SaleRow) {
    return (
      <tr key={sale.id}>
        <td>#{sale.id}</td>
        <td>{new Date(sale.createdAt).toLocaleString("en-LK")}</td>
        <td>{sale._count.saleLines}</td>
        <td>{sale._count.returns}</td>
        <td>{formatMoney(sale.total, "LKR", "en-LK")}</td>
        <td className="row">
          <Link className="btn btn-sm btn-outline" href={`/sales/${sale.id}`}>
            View
          </Link>
          <Link className="btn btn-sm btn-outline" href={`/sales/${sale.id}/receipt`}>
            Receipt
          </Link>
          <Link className="btn btn-sm" href={`/returns/new?saleId=${sale.id}`}>
            Return
          </Link>
        </td>
      </tr>
    );
  }

  return (
    <section className="card">
      <div className="section-head-row mb-4">
        <div className="row" style={{ gap: "0.75rem" }}>
          <Receipt className="w-6 h-6 text-primary" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Recent Transactions</h2>
        </div>
      </div>

      <form className="row no-print" style={{ marginBottom: "0.75rem", gap: "0.5rem" }} onSubmit={onSearchSubmit}>
        <input
          className="input"
          style={{ maxWidth: "320px" }}
          placeholder="Search by receipt ID (e.g. 7 or #7)"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button className="btn btn-outline" type="submit">
          Search
        </button>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => {
            setSearchInput("");
            setQuery("");
          }}
        >
          Clear
        </button>
      </form>

      {query.trim() ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Lines</th>
                <th>Returns</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchedSale === undefined ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    Enter a valid receipt ID (numbers only).
                  </td>
                </tr>
              ) : searchedSale ? (
                renderRow(searchedSale)
              ) : (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No sale found for receipt #{query.trim().replace(/^#/, "")}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stack" style={{ gap: "0.75rem" }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Lines</th>
                  <th>Returns</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{topTen.map(renderRow)}</tbody>
            </table>
          </div>

          {older.length > 0 ? (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Older Transactions ({older.length})</summary>
              <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Lines</th>
                      <th>Returns</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{older.map(renderRow)}</tbody>
                </table>
              </div>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
