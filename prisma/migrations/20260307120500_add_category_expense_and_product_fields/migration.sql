-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Redefine product table while preserving data from legacy columns.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

INSERT INTO "Category" ("name") VALUES ('General');

CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product" (
    "id",
    "sku",
    "name",
    "categoryId",
    "price",
    "cost",
    "stock",
    "createdAt"
)
SELECT
    "id",
    "code",
    "name",
    (SELECT "id" FROM "Category" WHERE "name" = 'General'),
    "sellPrice",
    "costPrice",
    "stock",
    "createdAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
