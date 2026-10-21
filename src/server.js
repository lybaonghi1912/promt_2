import orderRoutes from "./routes/order.routes.js";
import productRoutes from "./routes/product.routes.js";
import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import prisma from "./prisma.js";

const app = express();
const PORT = Number(process.env.PORT);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT phai la so nguyen tu 1 den 65535");
}

app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "E-commerce API dang hoat dong",
  });
});

app.get("/health", async (req, res) => {
  let timer;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Health check timeout")), 3000);
      }),
    ]);
    res.status(200).json({ status: "ok", database: "up" });
  } catch {
    res.status(503).json({ status: "error", database: "down" });
  } finally {
    clearTimeout(timer);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use((req, res) => {
  res.status(404).json({
    message: "Khong tim thay API",
  });
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "JSON khong hop le",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Du lieu gui len qua lon",
    });
  }

  console.error("Loi server:", error.code ?? error.name);

  res.status(500).json({
    message: "Loi he thong",
  });
});

app.listen(PORT, (error) => {
  if (error) {
    console.error(
      error.code === "EADDRINUSE"
        ? `Cong ${PORT} dang bi chiem. Can dung server cu.`
        : `Khong the khoi dong: ${error.message}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Server dang chay tai http://localhost:${PORT}`);
});