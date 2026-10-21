import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/prisma.js";

try {
  const username = process.env.ADMIN_USERNAME?.trim();
  const fullname = process.env.ADMIN_FULLNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !/^[A-Za-z0-9_]{3,50}$/.test(username)) {
    throw new Error("ADMIN_USERNAME khong hop le");
  }

  if (!fullname || fullname.length > 100) {
    throw new Error("ADMIN_FULLNAME phai tu 1 den 100 ky tu");
  }

  if (
    !password ||
    password === "THAY_BANG_MAT_KHAU_RIENG" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("ADMIN_PASSWORD phai tu 8 ky tu va toi da 72 byte");
  }

  const [role, membership] = await Promise.all([
    prisma.role.findFirst({
      where: { rolename: "ADMIN" },
    }),
    prisma.memberShip.findFirst({
      where: { mname: "BASIC" },
    }),
  ]);

  if (!role || !membership) {
    throw new Error("Can chay seed de co ADMIN va BASIC");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      fullname,
      password: hashedPassword,
      roleid: role.roleid,
      mid: membership.mid,
    },
    select: {
      uid: true,
      username: true,
      fullname: true,
      role: {
        select: { rolename: true },
      },
    },
  });

  if (admin.role.rolename !== "ADMIN") {
    throw new Error(
      "Username nay thuoc tai khoan khong phai ADMIN. Hay chon ADMIN_USERNAME khac."
    );
  }

  console.log("Tai khoan quan tri da san sang:");
  console.log(JSON.stringify(admin, null, 2));
} catch (error) {
  console.error("Tao admin that bai:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}