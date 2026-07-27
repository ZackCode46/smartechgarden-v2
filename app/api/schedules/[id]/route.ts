import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
  durationSec: z.number().int().min(1).max(3600).optional(),
  enabled: z.boolean().optional(),
});

async function findOwnedSchedule(userId: string, scheduleId: string) {
  const schedule = await prisma.wateringSchedule.findUnique({
    where: { id: scheduleId },
    include: { device: true },
  });
  if (!schedule || schedule.device.userId !== userId) return null;
  return schedule;
}

// PATCH /api/schedules/:id — update sebagian field (misal cuma toggle enabled)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const existing = await findOwnedSchedule(userId, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  const updated = await prisma.wateringSchedule.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ schedule: updated });
}

// DELETE /api/schedules/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const existing = await findOwnedSchedule(userId, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }

  await prisma.wateringSchedule.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
