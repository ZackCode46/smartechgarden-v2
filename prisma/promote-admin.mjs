// Jadikan akun tertentu sebagai ADMIN.
// Pakai: node prisma/promote-admin.mjs email@kamu.com

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2];

if (!email) {
  console.error("Pakai: node prisma/promote-admin.mjs email@kamu.com");
  process.exit(1);
}

const user = await prisma.user.update({
  where: { email: email.toLowerCase().trim() },
  data: { role: "ADMIN" },
}).catch(() => null);

if (!user) {
  console.error(`User dengan email "${email}" tidak ditemukan. Pastikan sudah register dulu.`);
  process.exit(1);
}

console.log(`✓ ${user.email} sekarang ADMIN.`);
await prisma.$disconnect();
