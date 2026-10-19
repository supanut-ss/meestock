import DashboardView from "@/components/DashboardView";
import { isAdmin } from "@/lib/authActions";

export default async function DashboardPage() {
  return <DashboardView isAdmin={await isAdmin()} />;
}
