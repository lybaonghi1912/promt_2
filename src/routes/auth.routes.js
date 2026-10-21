import { requireAuth } from "../middlewares/require-auth.js";
import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN_SECONDS,
} from "../config/auth.js";
import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  const { username, fullname, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof fullname !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "username, fullname va password phai la chuoi",
    });
  }

  const cleanUsername = username.trim();
  const cleanFullname = fullname.trim();

  if (!/^[A-Za-z0-9_]{3,50}$/.test(cleanUsername)) {
    return res.status(400).json({
      message: "username gom 3-50 ky tu: chu khong dau, so hoac dau _",
    });
  }

  if (cleanFullname.length < 1 || cleanFullname.length > 100) {
    return res.status(400).json({
      message: "fullname phai tu 1 den 100 ky tu",
    });
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "password phai it nhat 8 ky tu va khong qua 72 byte UTF-8",
    });
  }

  try {
    const [role, membership] = await Promise.all([
      prisma.role.findFirst({
        where: { rolename: "normal" },
      }),
      prisma.memberShip.findFirst({
        where: { mname: "BASIC", score: 10 },
      }),
    ]);

    if (!role || !membership) {
      return res.status(500).json({
        message: "He thong chua co du lieu vai tro hoac hang thanh vien",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullname: cleanFullname,
        password: hashedPassword,
        roleid: role.roleid,
        mid: membership.mid,
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        roleid: true,
        mid: true,
        role: { select: { rolename: true } },
        membership: { select: { mname: true, score: true } },
      },
    });

    return res.status(201).json({
      message: "Dang ky thanh cong",
      user,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "username da ton tai",
      });
    }

    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const { username, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "username va password phai la chuoi",
    });
  }

  const cleanUsername = username.trim();

  if (
    !/^[A-Za-z0-9_]{3,50}$/.test(cleanUsername) ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Du lieu dang nhap khong hop le",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        uid: true,
        username: true,
        fullname: true,
        password: true,
        roleid: true,
        mid: true,
        role: { select: { rolename: true } },
        membership: { select: { mname: true, score: true } },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Sai ten dang nhap hoac mat khau",
      });
    }

    const matched = await bcrypt.compare(password, user.password);

    if (!matched) {
      return res.status(401).json({
        message: "Sai ten dang nhap hoac mat khau",
      });
    }

    const token = jwt.sign({}, JWT_SECRET, {
      algorithm: "HS256",
      subject: String(user.uid),
      expiresIn: JWT_EXPIRES_IN_SECONDS,
    });

    return res.status(200).json({
      message: "Dang nhap thanh cong",
      token,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      user: {
        uid: user.uid,
        username: user.username,
        fullname: user.fullname,
        roleid: user.roleid,
        mid: user.mid,
        role: user.role,
        membership: user.membership,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});
export default router;