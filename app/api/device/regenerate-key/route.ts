import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { deviceId } = await req.json();
  const device = await prisma.device.findFirst({ where: { id: deviceId, userId } });
  if (!device) return NextResponse.json({ error: "Perangkat tidak ditemukan" }, { status: 404 });

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { deviceKey: crypto.randomUUID() },
  });

  return NextResponse.json({ deviceKey: updated.deviceKey });
}
