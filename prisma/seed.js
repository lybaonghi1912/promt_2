import prisma from "../src/prisma.js";

try {
  await prisma.$transaction(async (tx) => {
    const admin = await tx.role.findFirst({ where: { rolename: "ADMIN" } });
    if (!admin) await tx.role.create({ data: { rolename: "ADMIN" } });

    let normal = await tx.role.findFirst({ where: { rolename: "normal" } });
    const customerRoles = await tx.role.findMany({ where: { rolename: "CUSTOMER" } });
    if (!normal) {
      normal = customerRoles.length
        ? await tx.role.update({
            where: { roleid: customerRoles[0].roleid },
            data: { rolename: "normal" },
          })
        : await tx.role.create({ data: { rolename: "normal" } });
    }
    // Preserve existing accounts and orders while assigning the required role.
    if (customerRoles.length) {
      await tx.user.updateMany({
        where: { roleid: { in: customerRoles.map((role) => role.roleid) } },
        data: { roleid: normal.roleid },
      });
    }

    const basic = await tx.memberShip.findFirst({ where: { mname: "BASIC" } });
    if (basic) {
      await tx.memberShip.updateMany({
        where: { mname: "BASIC" },
        data: { score: 10 },
      });
    } else {
      await tx.memberShip.create({ data: { mname: "BASIC", score: 10 } });
    }
  });

  console.log("Du lieu Role:");
  console.table(await prisma.role.findMany());
  console.log("Du lieu MemberShip:");
  console.table(await prisma.memberShip.findMany());
} catch (error) {
  console.error("Seed that bai:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
