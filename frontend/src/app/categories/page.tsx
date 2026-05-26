import CategoryManager from "@/components/CategoryManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการหมวดหมู่สินค้า — MeeStock",
  description: "จัดการหมวดหมู่สินค้าแบบ 2 ระดับเพื่อความสะดวกในการจัดการคลังสินค้า",
};

export default function CategoriesPage() {
  return <CategoryManager />;
}
