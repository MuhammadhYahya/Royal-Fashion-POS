"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DailySummaryRow } from "@/app/actions/report-actions";
import { formatMoney } from "@/lib/pos/format";

type DayByDayReportProps = {
  rows: DailySummaryRow[];
  generatedAt: string;
};

function monthKeyFromDate(dateKey: string) {
  return dateKey.slice(0, 7);
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function DayByDayReport({ rows, generatedAt }: DayByDayReportProps) {
  const [specificDate, setSpecificDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [now, setNow] = useState(() => new Date(generatedAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    if (specificDate) {
      return rows.filter((row) => row.date === specificDate);
    }
    if (rangeStart || rangeEnd) {
      return rows.filter((row) => {
        const afterStart = !rangeStart || row.date >= rangeStart;
        const beforeEnd = !rangeEnd || row.date <= rangeEnd;
        return afterStart && beforeEnd;
      });
    }
    return rows;
  }, [rows, specificDate, rangeStart, rangeEnd]);

  const isFilterActive = Boolean(specificDate || rangeStart || rangeEnd);
  const latestRows = isFilterActive ? filteredRows : filteredRows.slice(0, 7);

  const olderByMonth = useMemo(() => {
    const olderRows = isFilterActive ? [] : filteredRows.slice(7);
    const grouped = new Map<string, DailySummaryRow[]>();
    for (const row of olderRows) {
      const key = monthKeyFromDate(row.date);
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filteredRows, isFilterActive]);

  function clearFilters() {
    setSpecificDate("");
    setRangeStart("");
    setRangeEnd("");
  }

  function onSpecificDateChange(value: string) {
    setSpecificDate(value);
    if (value) {
      setRangeStart("");
      setRangeEnd("");
    }
  }

  function onRangeChange(start: string, end: string) {
    setSpecificDate("");
    setRangeStart(start);
    setRangeEnd(end);
  }

  function renderRows(renderedRows: DailySummaryRow[]) {
    return renderedRows.map((row) => (
      <tr key={row.date}>
        <td>{row.date}</td>
        <td>{formatMoney(row.totalSales, "LKR", "en-LK")}</td>
        <td>{formatMoney(row.totalExpenses, "LKR", "en-LK")}</td>
        <td>{formatMoney(row.finalBalance, "LKR", "en-LK")}</td>
        <td>
          <Link
            className="btn btn-sm btn-outline no-print"
            href={`/report/day/${row.date}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Generate Complete Report
          </Link>
        </td>
      </tr>
    ));
  }

  return (
    <section className="stack">
      <section className="card">
        <div className="section-head-row mb-2">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Day-by-Day Sales Report</h1>
          <p className="text-muted">
            Current local time:{" "}
            {now.toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "medium",
            })}
          </p>
        </div>

        <div className="grid-2 no-print" style={{ alignItems: "end", marginTop: "0.75rem" }}>
          <label className="field">
            <span>Search Specific Date</span>
            <input
              className="input"
              type="date"
              value={specificDate}
              onChange={(event) => onSpecificDateChange(event.target.value)}
            />
          </label>

          <div className="row" style={{ gap: "0.75rem", alignItems: "end" }}>
            <label className="field" style={{ flex: 1 }}>
              <span>From Date</span>
              <input
                className="input"
                type="date"
                value={rangeStart}
                onChange={(event) => onRangeChange(event.target.value, rangeEnd)}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>To Date</span>
              <input
                className="input"
                type="date"
                value={rangeEnd}
                onChange={(event) => onRangeChange(rangeStart, event.target.value)}
              />
            </label>
            <button className="btn btn-outline" type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Sales</th>
                <th>Total Expenses</th>
                <th>Final Balance / Profit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.length > 0 ? (
                renderRows(latestRows)
              ) : (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No report rows match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!isFilterActive &&
        olderByMonth.map(([month, monthRows]) => (
          <details className="card" key={month}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {monthLabelFromKey(month)} ({monthRows.length} days)
            </summary>
            <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Sales</th>
                    <th>Total Expenses</th>
                    <th>Final Balance / Profit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{renderRows(monthRows)}</tbody>
              </table>
            </div>
          </details>
        ))}
    </section>
  );
}
