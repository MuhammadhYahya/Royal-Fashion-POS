import Link from "next/link";
import { listReturns } from "@/app/actions/return-actions";
import { formatMoney } from "@/lib/pos/format";

export default async function ReturnsPage() {
  const returns = await listReturns();

  return (
    <section className="stack">
      <h1>Returns</h1>
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Sale ID</th>
                <th>Date</th>
                <th>Lines</th>
                <th>Total Refund</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((rtn) => (
                <tr key={rtn.id}>
                  <td>#{rtn.id}</td>
                  <td>#{rtn.saleId}</td>
                  <td>{new Date(rtn.createdAt).toLocaleString("en-LK")}</td>
                  <td>{rtn._count.lines}</td>
                  <td>{formatMoney(rtn.totalRefund, "LKR", "en-LK")}</td>
                  <td className="row">
                    <Link className="btn btn-sm btn-outline" href={`/returns/${rtn.id}`}>
                      View
                    </Link>
                    <Link className="btn btn-sm btn-outline" href={`/returns/${rtn.id}/receipt`}>
                      Receipt
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

