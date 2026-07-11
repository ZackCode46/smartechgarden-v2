// Seed katalog tanaman (e-book) — data lama dari data_base.json dibersihkan:
// duplikat dihapus, link gambar yang rusak (mengarah ke halaman pencarian
// Shutterstock/iStock, bukan file gambar) diganti dengan gambar Wikimedia
// Commons yang valid, dan field detail ditambahkan (suhu, kelembaban, cahaya,
// masa panen) untuk melengkapi fitur e-book.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const species = [
  {
    nama: "Tomat", namaLatin: "Solanum lycopersicum", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg",
    deskripsi: "Menghasilkan buah bulat merah yang dipakai luas dalam masakan. Kaya vitamin C dan likopen.",
    perawatan: "Siram rutin, butuh sinar matahari penuh, tanah subur dengan drainase baik. Pupuk setiap 2 minggu.",
    suhuMin: 20, suhuMax: 27, kelembabanMin: 60, kelembabanMax: 80,
    kebutuhanCahaya: "tinggi", masaPanen: "70-90 hari",
  },
  {
    nama: "Cabai Merah", namaLatin: "Capsicum annuum", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Chili_peppers.jpg",
    deskripsi: "Buah pedas yang jadi bumbu dapur utama masakan Nusantara.",
    perawatan: "Tanah gembur kaya bahan organik, siram rutin, lindungi dari hama kutu daun.",
    suhuMin: 21, suhuMax: 30, kelembabanMin: 60, kelembabanMax: 75,
    kebutuhanCahaya: "tinggi", masaPanen: "75-90 hari",
  },
  {
    nama: "Bayam", namaLatin: "Amaranthus spp.", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Spinacia_oleracea3.jpg",
    deskripsi: "Sayuran daun hijau, cepat panen, kaya zat besi dan vitamin A.",
    perawatan: "Tanah lembap, sinar matahari sedang, siram 1-2 kali sehari.",
    suhuMin: 20, suhuMax: 28, kelembabanMin: 65, kelembabanMax: 85,
    kebutuhanCahaya: "sedang", masaPanen: "25-35 hari",
  },
  {
    nama: "Wortel", namaLatin: "Daucus carota", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/4/44/Carrots_of_many_colors.jpg",
    deskripsi: "Sayuran akar oranye, kaya beta-karoten, populer sebagai jus dan campuran sup.",
    perawatan: "Tanah gembur & dalam, hindari genangan air, jarangkan bibit yang terlalu rapat.",
    suhuMin: 16, suhuMax: 24, kelembabanMin: 55, kelembabanMax: 75,
    kebutuhanCahaya: "tinggi", masaPanen: "70-80 hari",
  },
  {
    nama: "Kentang", namaLatin: "Solanum tuberosum", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Patates.jpg",
    deskripsi: "Umbi yang jadi sumber karbohidrat alternatif, mudah diolah jadi berbagai hidangan.",
    perawatan: "Tanah gembur, pengairan cukup tapi tidak becek, gundukkan tanah saat tunas tumbuh.",
    suhuMin: 15, suhuMax: 20, kelembabanMin: 60, kelembabanMax: 80,
    kebutuhanCahaya: "tinggi", masaPanen: "90-120 hari",
  },
  {
    nama: "Kangkung", namaLatin: "Ipomoea aquatica", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Ipomoea_aquatica2.jpg",
    deskripsi: "Sayur air yang cepat tumbuh, biasa ditumis atau jadi lalapan.",
    perawatan: "Media lembap/tergenang ringan, siram teratur, panen bisa berkali-kali dari batang yang sama.",
    suhuMin: 20, suhuMax: 30, kelembabanMin: 70, kelembabanMax: 90,
    kebutuhanCahaya: "sedang", masaPanen: "25-30 hari",
  },
  {
    nama: "Terong", namaLatin: "Solanum melongena", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/2/29/Aubergine.jpg",
    deskripsi: "Buah berwarna ungu mengilap, umum dipakai di masakan Asia dan Mediterania.",
    perawatan: "Sinar matahari penuh, siram rutin, pangkas tunas samping untuk hasil buah lebih besar.",
    suhuMin: 21, suhuMax: 29, kelembabanMin: 60, kelembabanMax: 75,
    kebutuhanCahaya: "tinggi", masaPanen: "70-85 hari",
  },
  {
    nama: "Kubis", namaLatin: "Brassica oleracea", jenis: "sayur",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/3/34/Cabbage_and_cross_section_on_white.jpg",
    deskripsi: "Sayuran daun berlapis rapat, umum untuk salad, sup, dan sayur tumis.",
    perawatan: "Tanah subur, penyiraman teratur, cocok di dataran tinggi yang sejuk.",
    suhuMin: 15, suhuMax: 21, kelembabanMin: 60, kelembabanMax: 80,
    kebutuhanCahaya: "tinggi", masaPanen: "80-100 hari",
  },
  {
    nama: "Apel", namaLatin: "Malus domestica", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg",
    deskripsi: "Buah renyah dan manis, kaya serat dan antioksidan, tumbuh baik di dataran tinggi.",
    perawatan: "Butuh udara sejuk, sinar matahari penuh, pemangkasan & pemupukan musiman.",
    suhuMin: 15, suhuMax: 24, kelembabanMin: 55, kelembabanMax: 75,
    kebutuhanCahaya: "tinggi", masaPanen: "4-5 bulan setelah bunga mekar",
  },
  {
    nama: "Pisang", namaLatin: "Musa spp.", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg",
    deskripsi: "Buah tropis manis kaya kalium, salah satu buah paling mudah dibudidayakan.",
    perawatan: "Tanah subur & lembap, lindungi dari angin kencang, panen setelah 6-9 bulan.",
    suhuMin: 20, suhuMax: 30, kelembabanMin: 70, kelembabanMax: 90,
    kebutuhanCahaya: "tinggi", masaPanen: "6-9 bulan",
  },
  {
    nama: "Mangga", namaLatin: "Mangifera indica", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Hapus_Mango.jpg",
    deskripsi: "Buah tropis manis, kaya vitamin A dan C, disukai luas di Asia Tenggara.",
    perawatan: "Iklim tropis, penyiraman rutin saat berbunga, pemangkasan tahunan.",
    suhuMin: 24, suhuMax: 32, kelembabanMin: 50, kelembabanMax: 70,
    kebutuhanCahaya: "tinggi", masaPanen: "3-5 bulan setelah bunga",
  },
  {
    nama: "Jeruk", namaLatin: "Citrus spp.", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Oranges_-_whole-halved-segment.jpg",
    deskripsi: "Buah citrus kaya vitamin C, umum dikonsumsi langsung atau dijadikan jus.",
    perawatan: "Tanah subur berdrainase baik, waspadai kutu daun dan ulat.",
    suhuMin: 20, suhuMax: 30, kelembabanMin: 55, kelembabanMax: 75,
    kebutuhanCahaya: "tinggi", masaPanen: "8-12 bulan",
  },
  {
    nama: "Semangka", namaLatin: "Citrullus lanatus", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/2/29/Citrullus_lanatus3.jpg",
    deskripsi: "Buah berair segar dengan kandungan air tinggi, favorit musim panas.",
    perawatan: "Sinar matahari penuh, tanah subur berdrainase baik, siram lebih jarang menjelang panen.",
    suhuMin: 24, suhuMax: 32, kelembabanMin: 50, kelembabanMax: 70,
    kebutuhanCahaya: "tinggi", masaPanen: "70-100 hari",
  },
  {
    nama: "Melon", namaLatin: "Cucumis melo", jenis: "buah",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Cantaloupe.jpg",
    deskripsi: "Buah manis dan segar dengan daging renyah, populer sebagai buah potong.",
    perawatan: "Sinar matahari penuh, penyiraman rutin dikurangi menjelang panen agar rasa lebih manis.",
    suhuMin: 24, suhuMax: 30, kelembabanMin: 50, kelembabanMax: 70,
    kebutuhanCahaya: "tinggi", masaPanen: "65-90 hari",
  },
  {
    nama: "Monstera", namaLatin: "Monstera deliciosa", jenis: "hias",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Monstera_deliciosa2.jpg",
    deskripsi: "Tanaman hias populer dengan daun berlubang khas, cocok untuk dekorasi indoor.",
    perawatan: "Cahaya tidak langsung, siram saat media mulai kering, semprot daun sesekali.",
    suhuMin: 18, suhuMax: 27, kelembabanMin: 60, kelembabanMax: 80,
    kebutuhanCahaya: "sedang", masaPanen: null,
  },
  {
    nama: "Lidah Mertua", namaLatin: "Sansevieria trifasciata", jenis: "hias",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Sansevieria_trifasciata11.JPG",
    deskripsi: "Tanaman hias tahan banting, dikenal efektif menyaring udara dalam ruangan.",
    perawatan: "Tahan kekeringan, siram jarang (1-2 minggu sekali), cahaya rendah sampai terang.",
    suhuMin: 15, suhuMax: 30, kelembabanMin: 30, kelembabanMax: 60,
    kebutuhanCahaya: "rendah", masaPanen: null,
  },
  {
    nama: "Sirih Gading", namaLatin: "Epipremnum aureum", jenis: "hias",
    gambar: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Epipremnum_aureum_31082012.jpg",
    deskripsi: "Tanaman rambat hias yang mudah dirawat, cocok digantung atau merambat di rak.",
    perawatan: "Cahaya tidak langsung, siram saat media agak kering, cukup toleran ternaungi.",
    suhuMin: 18, suhuMax: 29, kelembabanMin: 50, kelembabanMax: 75,
    kebutuhanCahaya: "rendah", masaPanen: null,
  },
];

async function main() {
  for (const s of species) {
    const slug = s.nama
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await prisma.plantSpecies.upsert({
      where: { slug },
      update: { ...s, slug },
      create: { ...s, slug },
    });
  }
  console.log(`Seed selesai: ${species.length} spesies tanaman.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
