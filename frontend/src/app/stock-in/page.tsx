import StockInView from "@/components/StockInView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รับสินค้าเข้าคลัง — MeeStock",
  description: "บันทึกการรับสินค้าเข้าคลัง พร้อมระบุ Lot, วันหมดอายุ และ Supplier",
};

export default function StockInPage() {
  return <StockInView />;
}
