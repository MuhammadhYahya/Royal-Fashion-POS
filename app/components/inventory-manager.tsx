"use client";

import type { Category, Product } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/pos/format";
import { Search, Save, Plus, Minus, Boxes } from "lucide-react";

type ProductWithCategory = Product & { category: Category };
type NoticeTone = "info" | "success" | "error";

export function InventoryManager({ initialProducts }: { initialProducts: ProductWithCategory[] }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [pendingStockByProductId, setPendingStockByProductId] = useState<Record<number, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<NoticeTone>("info");
  const [isLoading, setIsLoading] = useState(false);

  const hasPendingStockChanges = useMemo(
    () => Object.keys(pendingStockByProductId).length > 0,
    [pendingStockByProductId],
  );

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

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
      const body = await response.json();
      if (!active) {
        return;
      }
      if (!response.ok) {
        showMessage(body.error?.message ?? "Failed to search inventory.", "error");
        setIsLoading(false);
        return;
      }
      setProducts(body.data);
      setPendingStockByProductId({});
      setIsLoading(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const queueStockChange = (productId: number, value: string, currentStock: number) => {
    setPendingStockByProductId((prev) => {
      if (value.trim() === "") {
        return { ...prev, [productId]: value };
      }
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed === currentStock) {
        const rest = { ...prev };
        delete rest[productId];
        return rest;
      }
      return {
        ...prev,
        [productId]: value,
      };
    });
  };

  const stepStock = (productId: number, delta: number, currentStock: number) => {
    const currentDraft = pendingStockByProductId[productId];
    const base = currentDraft === undefined || currentDraft.trim() === ""
      ? currentStock
      : Number(currentDraft);
    if (!Number.isFinite(base)) {
      queueStockChange(productId, String(currentStock), currentStock);
      return;
    }
    const next = Math.max(0, Math.trunc(base) + delta);
    queueStockChange(productId, String(next), currentStock);
  };

  const saveStockChanges = async () => {
    const entries = Object.entries(pendingStockByProductId);
    if (entries.length === 0) {
      return;
    }

    for (const [productId, value] of entries) {
      if (!value.trim()) {
        showMessage("Stock value cannot be empty.", "error");
        return;
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        showMessage("Stock value must be a non-negative whole number.", "error");
        return;
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: parsed }),
      });
      const body = await response.json();
      if (!response.ok) {
        showMessage(body.error?.message ?? "Failed to save stock changes.", "error");
        return;
      }
    }

    const refreshResponse = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
    const refreshBody = await refreshResponse.json();
    if (!refreshResponse.ok) {
      showMessage(refreshBody.error?.message ?? "Saved stock but failed to refresh list.", "error");
      return;
    }

    setProducts(refreshBody.data);
    setPendingStockByProductId({});
    showMessage("Saved stock changes.", "success");
  };

  return (
    <div className="stack">
      {message ? <p className={`notice notice-${messageTone}`}>{message}</p> : null}
      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Boxes className="w-6 h-6 text-primary" />
            <h1 style={{ fontSize: "1.25rem" }}>Inventory Management</h1>
          </div>
          <button
            className="btn btn-primary row"
            type="button"
            onClick={saveStockChanges}
            disabled={!hasPendingStockChanges}
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
        
        <div className="search-bar-wrap">
          <label className="field">
            <span className="sr-only">Search Inventory</span>
            <div className="search-input-container">
              <Search className="search-icon" />
              <input
                className="input search-input"
                placeholder="Search by SKU or product name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <small className="field-help" style={{ marginLeft: "0.5rem" }}>Results update while typing.</small>
          </label>
        </div>
        {isLoading ? <p className="muted">Searching...</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category.name}</td>
                    <td>{formatMoney(product.price, "LKR", "en-LK")}</td>
                    <td>
                      <input
                        className={`input input-sm ${
                          pendingStockByProductId[product.id] ? "input-warning" : ""
                        }`}
                        type="number"
                        min={0}
                        value={pendingStockByProductId[product.id] ?? String(product.stock)}
                        onChange={(event) =>
                          queueStockChange(product.id, event.target.value, product.stock)
                        }
                      />
                    </td>
                    <td className="row">
                      <button
                        className="btn btn-sm btn-outline icon-btn"
                        type="button"
                        onClick={() => stepStock(product.id, -1, product.stock)}
                        title="Decrease Stock"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline icon-btn"
                        type="button"
                        onClick={() => stepStock(product.id, 1, product.stock)}
                        title="Increase Stock"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <p className="muted">No inventory items found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
