import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";

const plantSchema = z.object({
  nama: z.string().min(2).max(100),
  namaLatin: z.string().max(120).optional().nullable(),
  jenis: z.enum(["sayur", "buah", "hias", "rempah"]),
  gambar: z.string().min(1),
  deskripsi: z.string().min(5),
  perawatan: z.string().min(5),
  suhuMin: z.number().optional().nullable(),
  suhuMax: z.number().optional().nullable(),
  kelembabanMin: z.number().optional().nullable(),
  kelembabanMax: z.number().optional().nullable(),
  kebutuhanCahaya: z.enum(["rendah", "sedang", "tinggi"]).optional().nullable(),
  masaPanen: z.string().max(60).optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const species = await prisma.plantSpecies.findUnique({ where: { id: params.id } });
  if (!species) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ species });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = plantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const updated = await prisma.plantSpecies.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ species: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.plantSpecies.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
