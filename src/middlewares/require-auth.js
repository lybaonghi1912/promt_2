import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { JWT_SECRET } from "../config/auth.js";

export async function requireAuth(req, res, next) {
  const parts = req.get("authorization")?.trim().split(/\s+/);

  if (
    !parts ||
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer"
  ) {
    return res.status(401).json({
      message: "Can gui token theo dang Bearer",
    });
  }

  let payload;

  try {
    payload = jwt.verify(parts[1], JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({
      message: "Token khong hop le hoac da het han",
    });
  }

  const uid = Number(payload.sub);

  if (
    typeof payload.sub !== "string" ||
    !/^[1-9]\d*$/.test(payload.sub) ||
    !Number.isSafeInteger(uid) ||
    uid > 2147483647
  ) {
    return res.status(401).json({
      message: "Token khong hop le",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        fullname: true,
        roleid: true,
        mid: true,
        role: {
          select: { rolename: true },
        },
        membership: {
          select: { mname: true, score: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Tai khoan khong con ton tai",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}