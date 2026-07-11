import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";

const plantSchema = z.object({
  nama: z.string().min(2).max(100),
  namaLatin: z.string().max(120).optional().nullable(),
  jenis: z.enum(["sayur", "buah", "hias", "rempah"]),
  gambar: z.string().min(1, "Gambar wajib diisi (URL atau path lokal)"),
  deskripsi: z.string().min(5),
  perawatan: z.string().min(5),
  suhuMin: z.number().optional().nullable(),
  suhuMax: z.number().optional().nullable(),
  kelembabanMin: z.number().optional().nullable(),
  kelembabanMax: z.number().optional().nullable(),
  kebutuhanCahaya: z.enum(["rendah", "sedang", "tinggi"]).optional().nullable(),
  masaPanen: z.string().max(60).optional().nullable(),
});

function slugify(nama: string) {
  return nama
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const species = await prisma.plantSpecies.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json({ species });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = plantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let slug = slugify(parsed.data.nama);
  const existing = await prisma.plantSpecies.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const created = await prisma.plantSpecies.create({
    data: { ...parsed.data, slug },
  });

  return NextResponse.json({ species: created }, { status: 201 });
}
