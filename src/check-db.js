import prisma from "./prisma.js";

try {
  const result = await prisma.$queryRaw`
    SELECT 1 AS connection_ok
  `;

  console.log("Ket noi PostgreSQL thanh cong:", result);
} catch (error) {
  console.error("Ket noi PostgreSQL that bai:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}