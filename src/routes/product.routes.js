import { Prisma } from "@prisma/client";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { pid: "asc" },
    });

    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  const rawId = req.params.id;
  const pid = Number(rawId);

  if (
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(pid) ||
    pid > 2147483647
  ) {
    return res.status(400).json({
      message: "Ma san pham phai la so nguyen duong hop le",
    });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { pid },
    });

    if (!product) {
      return res.status(404).json({
        message: "Khong tim thay san pham",
      });
    }

    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    const { pname, price, quantity } = req.body ?? {};

    if (
      typeof pname !== "string" ||
      pname.trim().length < 1 ||
      pname.trim().length > 100
    ) {
      return res.status(400).json({
        message: "pname phai tu 1 den 100 ky tu",
      });
    }

    const priceText = typeof price === "string" ? price.trim() : "";

    if (
      !/^\d{1,8}(\.\d{1,2})?$/.test(priceText) ||
      Number(priceText) <= 0
    ) {
      return res.status(400).json({
        message: "price phai la chuoi so duong, toi da 99999999.99",
      });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 2147483647
    ) {
      return res.status(400).json({
        message: "quantity phai la so nguyen tu 0 den 2147483647",
      });
    }

    try {
      const product = await prisma.product.create({
        data: {
          pname: pname.trim(),
          price: new Prisma.Decimal(priceText),
          quantity,
        },
      });

      return res.status(201).json({
        message: "Tao san pham thanh cong",
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    const rawId = req.params.id;
    const pid = Number(rawId);

    if (
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(pid) ||
      pid > 2147483647
    ) {
      return res.status(400).json({
        message: "Ma san pham khong hop le",
      });
    }

    const { pname, price, quantity } = req.body ?? {};

    if (
      typeof pname !== "string" ||
      pname.trim().length < 1 ||
      pname.trim().length > 100
    ) {
      return res.status(400).json({
        message: "pname phai tu 1 den 100 ky tu",
      });
    }

    const priceText = typeof price === "string" ? price.trim() : "";

    if (
      !/^\d{1,8}(\.\d{1,2})?$/.test(priceText) ||
      Number(priceText) <= 0
    ) {
      return res.status(400).json({
        message: "price phai la chuoi so duong, toi da 99999999.99",
      });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 2147483647
    ) {
      return res.status(400).json({
        message: "quantity phai la so nguyen tu 0 den 2147483647",
      });
    }

    try {
      const product = await prisma.product.update({
        where: { pid },
        data: {
          pname: pname.trim(),
          price: new Prisma.Decimal(priceText),
          quantity,
        },
      });

      return res.status(200).json({
        message: "Cap nhat san pham thanh cong",
        product,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Khong tim thay san pham",
        });
      }

      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    const rawId = req.params.id;
    const pid = Number(rawId);

    if (
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(pid) ||
      pid > 2147483647
    ) {
      return res.status(400).json({
        message: "Ma san pham khong hop le",
      });
    }

    try {
      const product = await prisma.product.delete({
        where: { pid },
        select: {
          pid: true,
          pname: true,
        },
      });

      return res.status(200).json({
        message: "Xoa san pham thanh cong",
        product,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Khong tim thay san pham",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message: "Khong the xoa san pham da nam trong don hang",
        });
      }

      next(error);
    }
  }
);
export default router;