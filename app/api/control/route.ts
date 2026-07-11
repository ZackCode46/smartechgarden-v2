import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const controlSchema = z.object({
  mode: z.enum(["AUTO", "MANUAL"]).optional(),
  pumpState: z.boolean().optional(),
  timerEnable: z.boolean().optional(),
  timerStart: z.string().optional(),
  timerEnd: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = controlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  const device = await prisma.device.findFirst({ where: { userId } });
  if (!device) {
    return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: parsed.data,
  });

  return NextResponse.json({ device: updated });
}
