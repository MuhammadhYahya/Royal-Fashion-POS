import { prisma } from "@/lib/prisma";
import { PosError } from "@/lib/pos/errors";

type ProductInput = {
  sku: string;
  name: string;
  categoryId: number;
  price: number;
  cost: number;
  stock: number;
};

function validateProductInput(input: ProductInput) {
  if (!input.sku.trim() || !input.name.trim()) {
    throw new PosError("INVALID_INPUT", "SKU and name are required.");
  }
  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    throw new PosError("INVALID_INPUT", "Category is required.");
  }
  if (input.price < 0 || input.cost < 0 || input.stock < 0) {
    throw new PosError("INVALID_INPUT", "Price and stock cannot be negative.");
  }
}

export async function listProducts(query?: string) {
  const where = query?.trim()
    ? {
        OR: [
          { sku: { contains: query } },
          { name: { contains: query } },
          { category: { name: { contains: query } } },
        ],
      }
    : undefined;

  return prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function createProduct(input: ProductInput) {
  validateProductInput(input);
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new PosError("NOT_FOUND", "Selected category not found.");
  }

  return prisma.product.create({
    data: {
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      stock: input.stock,
    },
    include: { category: true },
  });
}

export async function updateProduct(id: number, input: Partial<ProductInput>) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new PosError("NOT_FOUND", "Product not found.");
  }

  const merged = {
    sku: input.sku ?? product.sku,
    name: input.name ?? product.name,
    categoryId: input.categoryId ?? product.categoryId,
    price: input.price ?? product.price,
    cost: input.cost ?? product.cost,
    stock: input.stock ?? product.stock,
  };
  validateProductInput(merged);

  const category = await prisma.category.findUnique({
    where: { id: merged.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new PosError("NOT_FOUND", "Selected category not found.");
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...merged,
      sku: merged.sku.trim().toUpperCase(),
      name: merged.name.trim(),
    },
    include: { category: true },
  });
}

export async function adjustStock(id: number, delta: number) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new PosError("NOT_FOUND", "Product not found.");
  }

  const nextStock = product.stock + delta;
  if (nextStock < 0) {
    throw new PosError("INSUFFICIENT_STOCK", "Stock cannot go below zero.");
  }

  return prisma.product.update({
    where: { id },
    data: { stock: nextStock },
    include: { category: true },
  });
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new PosError("NOT_FOUND", "Product not found.");
  }

  return prisma.product.delete({
    where: { id },
  });
}
