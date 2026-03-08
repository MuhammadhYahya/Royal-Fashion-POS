"use client";

export function PrintButton({ label = "Print Receipt" }: { label?: string }) {
  return (
    <button className="btn btn-primary no-print" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
