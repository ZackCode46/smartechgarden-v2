import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Profil</h1>
        <p className="text-ink/60 text-sm mt-1">Informasi akun kamu di Smartech Garden.</p>
      </header>

      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email,
          bio: user.bio ?? "",
          location: user.location ?? "",
          phone: user.phone ?? "",
          image: user.image ?? null,
        }}
      />
    </div>
  );
}
