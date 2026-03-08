import Link from "next/link";
import { getReturnableSaleLines } from "@/app/actions/return-actions";
import { ReturnForm } from "@/app/components/return-form";

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ saleId?: string }>;
}) {
  const { saleId } = await searchParams;
  const numericSaleId = Number(saleId);

  if (!Number.isInteger(numericSaleId) || numericSaleId <= 0) {
    return (
      <section className="stack">
        <h1>New Return</h1>
        <p>Provide a valid sale ID in query string: `?saleId=123`.</p>
        <Link className="btn" href="/">
          Pick Sale
        </Link>
      </section>
    );
  }

  let lines: Awaited<ReturnType<typeof getReturnableSaleLines>> | null = null;
  try {
    lines = await getReturnableSaleLines(numericSaleId);
  } catch {
    lines = null;
  }

  if (!lines) {
    return <p>Sale not found.</p>;
  }

  return (
    <section className="stack">
      <h1>New Return for Sale #{numericSaleId}</h1>
      <ReturnForm saleId={numericSaleId} lines={lines} />
    </section>
  );
}
