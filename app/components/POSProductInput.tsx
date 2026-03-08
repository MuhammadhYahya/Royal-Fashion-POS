"use client";

import type { Product } from "@prisma/client";
import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/pos/format";
import { Search } from "lucide-react";

type POSProductInputProps = {
  query: string;
  products: Product[];
  onQueryChange: (value: string) => void;
  onEnter: () => void;
  onAddItem: (product: Product) => void;
};

export function POSProductInput({
  query,
  products,
  onQueryChange,
  onEnter,
  onAddItem,
}: POSProductInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <section className="pos-panel">
      <div className="search-bar-wrap">
        <div className="search-input-container">
          <Search className="search-icon" />
          <input
            ref={inputRef}
            className="input search-input"
            placeholder="Search by SKU or name... (Press Enter to add first match)"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onEnter();
              }
            }}
          />
        </div>
      </div>

      <div className="product-grid">
        {products.length > 0 ? (
          products.map((product) => {
            const outOfStock = product.stock < 1;
            return (
              <button
                key={product.id}
                className={`product-card ${outOfStock ? "out-of-stock" : ""}`}
                type="button"
                onClick={() => {
                  if (!outOfStock) onAddItem(product);
                }}
                disabled={outOfStock}
              >
                <div className="product-card-top">
                  <span className="product-sku">{product.sku}</span>
                  <span className="product-stock">
                    {outOfStock ? "Out of Stock" : `${product.stock} in stock`}
                  </span>
                </div>
                <h3 className="product-name">{product.name}</h3>
                <div className="product-card-bottom">
                  <span className="product-price">
                    {formatMoney(product.price, "LKR", "en-LK")}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="empty-state">
            <p className="muted">No products matched your search.</p>
          </div>
        )}
      </div>
    </section>
  );
}
