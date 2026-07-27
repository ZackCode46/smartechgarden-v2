import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  durationSec: z.number().int().min(1).max(3600), // maks 1 jam sekali siram
  enabled: z.boolean().optional(),
});

async function getOwnedDevice(userId: string) {
  return prisma.device.findFirst({ where: { userId } });
}

// GET /api/schedules — daftar semua jadwal milik device user yang login
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const device = await getOwnedDevice(userId);
  if (!device) {
    return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
  }

  const schedules = await prisma.wateringSchedule.findMany({
    where: { deviceId: device.id },
    orderBy: [{ hour: "asc" }, { minute: "asc" }],
  });

  return NextResponse.json({ schedules });
}

// POST /api/schedules — tambah 1 jadwal baru
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const device = await getOwnedDevice(userId);
  if (!device) {
    return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  const existingCount = await prisma.wateringSchedule.count({ where: { deviceId: device.id } });
  if (existingCount >= 10) {
    return NextResponse.json({ error: "Maksimal 10 jadwal per alat" }, { status: 400 });
  }

  const schedule = await prisma.wateringSchedule.create({
    data: { ...parsed.data, deviceId: device.id },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
