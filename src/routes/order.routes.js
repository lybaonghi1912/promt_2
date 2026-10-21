import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import { requireAuth } from "../middlewares/require-auth.js";

const router = Router();

function orderError(status, message) {
  return Object.assign(new Error(message), { status });
}

router.post("/", requireAuth, async (req, res, next) => {
  const items = req.body?.items;

  if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
    return res.status(400).json({
      message: "items phai la danh sach tu 1 den 100 san pham",
    });
  }

  const validItems = items.every(
    (item) =>
      item &&
      typeof item === "object" &&
      Number.isInteger(item.pid) &&
      item.pid > 0 &&
      item.pid <= 2147483647 &&
      Number.isInteger(item.qty) &&
      item.qty > 0 &&
      item.qty <= 2147483647
  );

  if (!validItems) {
    return res.status(400).json({
      message: "Moi san pham can pid va qty la so nguyen duong hop le",
    });
  }

  if (new Set(items.map((item) => item.pid)).size !== items.length) {
    return res.status(400).json({
      message: "Moi pid chi duoc xuat hien mot lan trong don",
    });
  }

  const sortedItems = items
    .map(({ pid, qty }) => ({ pid, qty }))
    .sort((a, b) => a.pid - b.pid);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await prisma.$transaction(
        async (tx) => {
          const details = [];

          for (const item of sortedItems) {
            const product = await tx.product.findUnique({
              where: { pid: item.pid },
              select: {
                pid: true,
                price: true,
              },
            });

            if (!product) {
              throw orderError(
                404,
                `Khong tim thay san pham ${item.pid}`
              );
            }

            const stockUpdate = await tx.product.updateMany({
              where: {
                pid: item.pid,
                quantity: { gte: item.qty },
              },
              data: {
                quantity: { decrement: item.qty },
              },
            });

            if (stockUpdate.count !== 1) {
              throw orderError(
                409,
                `San pham ${item.pid} khong du ton kho`
              );
            }

            details.push({
              pid: item.pid,
              qty: item.qty,
              unit_price: product.price,
            });
          }

          return tx.order.create({
            data: {
              uid: req.user.uid,
              details: {
                create: details,
              },
              // Create the shipment atomically with the order and stock updates.
              shipments: {
                create: { status: "PENDING" },
              },
            },
            include: {
              details: true,
              shipments: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      const total = order.details
        .reduce(
          (sum, detail) =>
            sum.plus(
              new Prisma.Decimal(detail.unit_price).mul(detail.qty)
            ),
          new Prisma.Decimal(0)
        )
        .toFixed(2);

      return res.status(201).json({
        message: "Dat hang thanh cong",
        order,
        total,
      });
    } catch (error) {
      if (error.code === "P2034") {
        if (attempt < 2) {
          continue;
        }

        return res.status(409).json({
          message: "Du lieu dang thay doi dong thoi. Vui long thu lai.",
        });
      }

      if (error.status === 404 || error.status === 409) {
        return res.status(error.status).json({
          message: error.message,
        });
      }

      return next(error);
    }
  }
});

function withTotal(order) {
  const total = order.details
    .reduce(
      (sum, detail) =>
        sum.plus(
          new Prisma.Decimal(detail.unit_price).mul(detail.qty)
        ),
      new Prisma.Decimal(0)
    )
    .toFixed(2);

  return { ...order, total };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user.role?.rolename === "ADMIN";

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { uid: req.user.uid },
      orderBy: { oid: "desc" },
      include: {
        details: true,
        shipments: true,
      },
    });

    res.status(200).json({
      orders: orders.map(withTotal),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  const rawId = req.params.id;
  const oid = Number(rawId);

  if (
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(oid) ||
    oid > 2147483647
  ) {
    return res.status(400).json({
      message: "Ma don hang khong hop le",
    });
  }

  try {
    const isAdmin = req.user.role?.rolename === "ADMIN";

    const order = await prisma.order.findFirst({
      where: {
        oid,
        ...(isAdmin ? {} : { uid: req.user.uid }),
      },
      include: {
        details: true,
        shipments: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Khong tim thay don hang",
      });
    }

    res.status(200).json({
      order: withTotal(order),
    });
  } catch (error) {
    next(error);
  }
});
export default router;