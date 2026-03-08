import { prisma } from "@/lib/prisma";
import { PosError } from "@/lib/pos/errors";

type CategoryInput = {
  name: string;
};

function validateCategoryInput(input: CategoryInput) {
  if (!input.name.trim()) {
    throw new PosError("INVALID_INPUT", "Category name is required.");
  }
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCategory(input: CategoryInput) {
  validateCategoryInput(input);

  return prisma.category.create({
    data: {
      name: input.name.trim(),
    },
  });
}

export async function updateCategory(id: number, input: CategoryInput) {
  validateCategoryInput(input);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new PosError("NOT_FOUND", "Category not found.");
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: input.name.trim(),
    },
  });
}

export async function deleteCategory(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  if (!category) {
    throw new PosError("NOT_FOUND", "Category not found.");
  }
  if (category._count.products > 0) {
    throw new PosError(
      "INVALID_INPUT",
      "Cannot delete a category that still has products.",
    );
  }

  return prisma.category.delete({
    where: { id },
  });
}
