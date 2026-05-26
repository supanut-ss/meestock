import { getCurrentUser } from "@/lib/authActions";
import { redirect } from "next/navigation";
import UsersView from "@/components/UsersView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการผู้ใช้งาน — MeeStock",
  description: "หน้าจอควบคุมและจัดการบัญชีผู้ใช้งานระบบ MeeStock Pro สำหรับผู้บริหาร",
};

export default async function UsersPage() {
  const user = await getCurrentUser();

  // ป้องกันการเข้าถึงหากไม่ใช่ Admin หรือ Owner
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    redirect("/dashboard");
  }

  return <UsersView />;
}
