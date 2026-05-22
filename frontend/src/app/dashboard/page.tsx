import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <p className="text-sm text-zinc-600">Clean UI + Responsive summary for stock, sales, and best-sellers.</p>
      <DashboardView />
    </div>
  );
}
