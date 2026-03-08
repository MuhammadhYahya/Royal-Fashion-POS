"use client";

import type { Product } from "@prisma/client";
import { formatMoney } from "@/lib/pos/format";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

type POSCartItem = {
  product: Product;
  quantity: number;
};

type POSCartProps = {
  items: POSCartItem[];
  onIncrease: (productId: number) => void;
  onDecrease: (productId: number) => void;
  onRemove: (productId: number) => void;
};

export function POSCart({ items, onIncrease, onDecrease, onRemove }: POSCartProps) {
  return (
    <section className="card cart-panel">
      <header className="cart-header">
        <div className="cart-title">
          <ShoppingCart className="w-5 h-5" />
          <h2>Current Order</h2>
        </div>
        <span className="cart-count">
          {items.reduce((sum, item) => sum + item.quantity, 0)} Items
        </span>
      </header>

      <div className="cart-items">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.product.id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{item.product.name}</span>
                <span className="cart-item-price">
                  {formatMoney(item.product.price, "LKR", "en-LK")}
                </span>
              </div>
              
              <div className="cart-item-total">
                {formatMoney(item.product.price * item.quantity, "LKR", "en-LK")}
              </div>

              <div className="cart-item-actions">
                <button
                  className="cart-action-btn"
                  type="button"
                  onClick={() => onDecrease(item.product.id)}
                  aria-label={`Decrease ${item.product.name} quantity`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="cart-qty">{item.quantity}</span>
                <button
                  className="cart-action-btn"
                  type="button"
                  onClick={() => onIncrease(item.product.id)}
                  aria-label={`Increase ${item.product.name} quantity`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                <div className="cart-action-separator" />
                
                <button
                  className="cart-action-btn cart-remove-btn"
                  type="button"
                  onClick={() => onRemove(item.product.id)}
                  aria-label={`Remove ${item.product.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-cart">
            <ShoppingCart className="w-12 h-12 text-muted opacity-50 mb-3" />
            <p className="text-muted font-medium">Your cart is empty</p>
            <p className="text-sm text-muted opacity-75 mt-1">Add items from the product grid to start an order.</p>
          </div>
        )}
      </div>
    </section>
  );
}
