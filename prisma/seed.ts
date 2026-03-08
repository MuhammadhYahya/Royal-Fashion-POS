import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const [bags, wallets, accessories] = await Promise.all([
    prisma.category.create({ data: { name: "Bags" } }),
    prisma.category.create({ data: { name: "Wallets" } }),
    prisma.category.create({ data: { name: "Accessories" } }),
  ]);

  await prisma.product.createMany({
    data: [
      {
        sku: "BAG001",
        name: "Canvas Tote",
        categoryId: bags.id,
        price: 850000,
        cost: 620000,
        stock: 15,
      },
      {
        sku: "BAG002",
        name: "Leather Satchel",
        categoryId: bags.id,
        price: 2750000,
        cost: 1910000,
        stock: 8,
      },
      {
        sku: "BAG003",
        name: "Travel Backpack",
        categoryId: bags.id,
        price: 1650000,
        cost: 1230000,
        stock: 12,
      },
      {
        sku: "WAL001",
        name: "Leather Wallet",
        categoryId: wallets.id,
        price: 550000,
        cost: 340000,
        stock: 20,
      },
      {
        sku: "ACC001",
        name: "Bag Strap",
        categoryId: accessories.id,
        price: 180000,
        cost: 90000,
        stock: 30,
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
