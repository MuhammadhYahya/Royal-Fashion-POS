"use client";

import type { Category, Product } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMinorAsInput, formatMoney, parseCurrencyToMinor, toInt } from "@/lib/pos/format";
import { Plus, Package, Tags, Edit, Trash2, Save } from "lucide-react";

type ProductWithCategory = Product & { category: Category };

type ProductCreateForm = {
  sku: string;
  name: string;
  categoryId: number;
  price: number | null;
  cost: number | null;
  stock: number | null;
};

type ProductForm = {
  sku: string;
  name: string;
  categoryId: number;
  price: number;
  cost: number;
  stock: number;
};

type CreateFormErrors = Partial<Record<keyof ProductCreateForm, string>>;
type NoticeTone = "info" | "success" | "error";

export function ProductManager({
  initialProducts,
  initialCategories,
}: {
  initialProducts: ProductWithCategory[];
  initialCategories: Category[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<NoticeTone>("info");
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [form, setForm] = useState<ProductCreateForm>({
    sku: "",
    name: "",
    categoryId: initialCategories[0]?.id ?? 0,
    price: null,
    cost: null,
    stock: null,
  });
  const [editProductForm, setEditProductForm] = useState<ProductForm>({
    sku: "",
    name: "",
    categoryId: initialCategories[0]?.id ?? 0,
    price: 0,
    cost: 0,
    stock: 0,
  });
  const categoryNameInputRef = useRef<HTMLInputElement>(null);

  const productCountByCategoryId = useMemo(() => {
    return products.reduce<Record<number, number>>((acc, product) => {
      acc[product.categoryId] = (acc[product.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  const showMessage = (text: string, tone: NoticeTone) => {
    setMessage(text);
    setMessageTone(tone);
  };

  useEffect(() => {
    if (!message) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 7000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (!showCategoryForm) {
      return;
    }
    categoryNameInputRef.current?.focus();
  }, [showCategoryForm]);

  const validateCreateForm = (value: ProductCreateForm) => {
    const errors: CreateFormErrors = {};
    if (!value.sku.trim()) {
      errors.sku = "SKU is required.";
    }
    if (!value.name.trim()) {
      errors.name = "Product name is required.";
    }
    if (!Number.isInteger(value.categoryId) || value.categoryId <= 0) {
      errors.categoryId = "Category is required.";
    }
    if (value.price === null) {
      errors.price = "Price is required.";
    }
    if (value.cost === null) {
      errors.cost = "Cost is required.";
    }
    if (value.stock === null) {
      errors.stock = "Stock quantity is required.";
    }
    return errors;
  };

  const reloadProducts = async () => {
    const response = await fetch("/api/products");
    const body = await response.json();
    if (response.ok) {
      setProducts(body.data);
    }
  };

  const reloadCategories = async () => {
    const response = await fetch("/api/categories");
    const body = await response.json();
    if (!response.ok) {
      return;
    }
    const nextCategories: Category[] = body.data;
    setCategories(nextCategories);
    setForm((prev) => {
      const selectedExists = nextCategories.some((category) => category.id === prev.categoryId);
      return selectedExists ? prev : { ...prev, categoryId: nextCategories[0]?.id ?? 0 };
    });
    setEditProductForm((prev) => {
      const selectedExists = nextCategories.some((category) => category.id === prev.categoryId);
      return selectedExists ? prev : { ...prev, categoryId: nextCategories[0]?.id ?? 0 };
    });
  };

  const reloadAll = async () => {
    await Promise.all([reloadProducts(), reloadCategories()]);
  };

  const createProduct = async () => {
    const errors = validateCreateForm(form);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) {
      showMessage("Please fill all required product fields.", "error");
      return;
    }

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: form.sku,
        name: form.name,
        categoryId: form.categoryId,
        price: form.price,
        cost: form.cost,
        stock: form.stock,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to create product.", "error");
      return;
    }

    setForm((prev) => ({
      ...prev,
      sku: "",
      name: "",
      price: null,
      cost: null,
      stock: null,
    }));
    setCreateErrors({});
    await reloadProducts();
    showMessage(`Created ${body.data.name}.`, "success");
  };

  const createCategory = async () => {
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryInput }),
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to create category.", "error");
      return;
    }

    setCategoryInput("");
    setShowCategoryForm(false);
    await reloadCategories();
    setForm((prev) => ({ ...prev, categoryId: body.data.id }));
    showMessage(`Created category ${body.data.name}.`, "success");
  };

  const startCategoryEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategoryId) {
      return;
    }
    const response = await fetch(`/api/categories/${editingCategoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingCategoryName }),
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to update category.", "error");
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    await reloadAll();
    showMessage(`Updated category ${body.data.name}.`, "success");
  };

  const removeCategory = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"?`)) {
      return;
    }
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to remove category.", "error");
      return;
    }

    if (editingCategoryId === category.id) {
      setEditingCategoryId(null);
      setEditingCategoryName("");
    }
    await reloadCategories();
    showMessage(`Removed category ${body.data.name}.`, "success");
  };

  const startProductEdit = (product: ProductWithCategory) => {
    setEditingProductId(product.id);
    setEditProductForm({
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
    });
  };

  const saveProductEdit = async () => {
    if (!editingProductId) {
      return;
    }
    const response = await fetch(`/api/products/${editingProductId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editProductForm),
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to update product.", "error");
      return;
    }

    setEditingProductId(null);
    await reloadProducts();
    showMessage(`Updated ${body.data.name}.`, "success");
  };

  const removeProduct = async (product: ProductWithCategory) => {
    if (!confirm(`Delete product "${product.name}" (${product.sku})?`)) {
      return;
    }
    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });
    const body = await response.json();
    if (!response.ok) {
      showMessage(body.error?.message ?? "Failed to remove product.", "error");
      return;
    }

    if (editingProductId === product.id) {
      setEditingProductId(null);
    }
    await reloadProducts();
    showMessage(`Removed ${body.data.name}.`, "success");
  };

  return (
    <div className="stack">
      {message ? <p className={`notice notice-${messageTone}`}>{message}</p> : null}
      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Package className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Add Product</h2>
          </div>
          <p className="text-muted">Enter prices in LKR units (example: 1500 = 1,500.00).</p>
        </div>
        <div className="grid-2">
          <label className={`field ${createErrors.sku ? "field-error" : ""}`}>
            <span>SKU</span>
            <input
              className={`input ${createErrors.sku ? "input-error" : ""}`}
              placeholder="Example: BAG001"
              value={form.sku}
              onChange={(e) => {
                const sku = e.target.value.toUpperCase();
                setForm((f) => ({ ...f, sku }));
                if (sku.trim()) {
                  setCreateErrors((prev) => ({ ...prev, sku: undefined }));
                }
              }}
            />
            {createErrors.sku ? <small className="field-error-text">! {createErrors.sku}</small> : null}
          </label>
          <label className={`field ${createErrors.name ? "field-error" : ""}`}>
            <span>Product Name</span>
            <input
              className={`input ${createErrors.name ? "input-error" : ""}`}
              placeholder="Example: School Bag"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name }));
                if (name.trim()) {
                  setCreateErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
            />
            {createErrors.name ? <small className="field-error-text">! {createErrors.name}</small> : null}
          </label>
          <label className={`field ${createErrors.categoryId ? "field-error" : ""}`}>
            <span>Category</span>
            <div className="row">
              <select
                className={`input ${createErrors.categoryId ? "input-error" : ""}`}
                value={form.categoryId}
                onChange={(e) => {
                  const categoryId = toInt(e.target.value);
                  setForm((f) => ({ ...f, categoryId }));
                  if (categoryId > 0) {
                    setCreateErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }
                }}
              >
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value={0}>No categories</option>
                )}
              </select>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setShowCategoryForm((prev) => !prev)}
              >
                Create Category
              </button>
            </div>
            {createErrors.categoryId ? (
              <small className="field-error-text">! {createErrors.categoryId}</small>
            ) : null}
          </label>
          <label className={`field ${createErrors.price ? "field-error" : ""}`}>
            <span>Selling Price (LKR)</span>
            <input
              className={`input ${createErrors.price ? "input-error" : ""}`}
              type="number"
              min={0}
              step="0.01"
              value={form.price === null ? "" : formatMinorAsInput(form.price)}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({
                  ...f,
                  price: value === "" ? null : parseCurrencyToMinor(value),
                }));
                if (value !== "") {
                  setCreateErrors((prev) => ({ ...prev, price: undefined }));
                }
              }}
            />
            {createErrors.price ? <small className="field-error-text">! {createErrors.price}</small> : null}
          </label>
          <label className={`field ${createErrors.cost ? "field-error" : ""}`}>
            <span>Cost Price (LKR)</span>
            <input
              className={`input ${createErrors.cost ? "input-error" : ""}`}
              type="number"
              min={0}
              step="0.01"
              value={form.cost === null ? "" : formatMinorAsInput(form.cost)}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({
                  ...f,
                  cost: value === "" ? null : parseCurrencyToMinor(value),
                }));
                if (value !== "") {
                  setCreateErrors((prev) => ({ ...prev, cost: undefined }));
                }
              }}
            />
            {createErrors.cost ? <small className="field-error-text">! {createErrors.cost}</small> : null}
          </label>
          <label className={`field ${createErrors.stock ? "field-error" : ""}`}>
            <span>Stock Quantity</span>
            <input
              className={`input ${createErrors.stock ? "input-error" : ""}`}
              type="number"
              min={0}
              value={form.stock ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({
                  ...f,
                  stock: value === "" ? null : toInt(value),
                }));
                if (value !== "") {
                  setCreateErrors((prev) => ({ ...prev, stock: undefined }));
                }
              }}
            />
            {createErrors.stock ? <small className="field-error-text">! {createErrors.stock}</small> : null}
          </label>
          <button
            className="btn btn-primary btn-lg row"
            type="button"
            onClick={createProduct}
            disabled={categories.length === 0}
            style={{ alignSelf: "flex-end" }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Product</span>
          </button>
        </div>

        {showCategoryForm ? (
          <div className="stack">
            <label className="field">
              <span>New Category Name</span>
              <div className="row">
                <input
                  ref={categoryNameInputRef}
                  className="input"
                  placeholder="Example: Accessories"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                />
                <button className="btn btn-primary" type="button" onClick={createCategory}>
                  Save Category
                </button>
              </div>
            </label>
          </div>
        ) : null}

        {categories.length === 0 ? (
          <p className="notice notice-error">Create at least one category before adding products.</p>
        ) : null}
      </section>

      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Tags className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Categories</h2>
          </div>
          <button
            className="btn btn-success btn-sm row"
            type="button"
            onClick={saveCategoryEdit}
            disabled={!editingCategoryId}
          >
            <Save className="w-4 h-4" />
            <span>Save Category Change</span>
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map((category) => {
                  const inUseCount = productCountByCategoryId[category.id] ?? 0;
                  const isEditing = editingCategoryId === category.id;

                  return (
                    <tr key={category.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td>{inUseCount}</td>
                      <td className="row">
                        {isEditing ? (
                          <button
                            className="btn btn-sm btn-outline"
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryName("");
                            }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm btn-outline"
                              type="button"
                              onClick={() => startCategoryEdit(category)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              type="button"
                              onClick={() => void removeCategory(category)}
                              disabled={inUseCount > 0}
                              title={
                                inUseCount > 0
                                  ? "Move or delete products in this category before deleting it."
                                  : "Delete category"
                              }
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3}>
                    <p className="muted">No categories yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Package className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Product Directory</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingProductId === product.id;

                if (isEditing) {
                  return (
                    <tr key={product.id}>
                      <td>
                        <input
                          className="input"
                          value={editProductForm.sku}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              sku: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editProductForm.name}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={editProductForm.categoryId}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              categoryId: toInt(e.target.value),
                            }))
                          }
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={formatMinorAsInput(editProductForm.price)}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              price: parseCurrencyToMinor(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={formatMinorAsInput(editProductForm.cost)}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              cost: parseCurrencyToMinor(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={editProductForm.stock}
                          onChange={(e) =>
                            setEditProductForm((prev) => ({
                              ...prev,
                              stock: toInt(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td className="row">
                        <button className="btn btn-sm btn-primary" type="button" onClick={saveProductEdit}>
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          type="button"
                          onClick={() => setEditingProductId(null)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category.name}</td>
                    <td>{formatMoney(product.price, "LKR", "en-LK")}</td>
                    <td>{formatMoney(product.cost, "LKR", "en-LK")}</td>
                    <td>{product.stock}</td>
                    <td className="row">
                      <button
                        className="btn btn-sm btn-outline row"
                        type="button"
                        onClick={() => startProductEdit(product)}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        className="btn btn-sm btn-danger row"
                        type="button"
                        onClick={() => void removeProduct(product)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
