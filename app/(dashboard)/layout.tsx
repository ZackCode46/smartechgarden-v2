import NavRail from "@/components/NavRail";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <NavRail />
      <main className="flex-1 px-4 md:px-10 py-6 md:py-10 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
