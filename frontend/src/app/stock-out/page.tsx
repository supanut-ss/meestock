import StockOutView from "@/components/StockOutView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จ่ายสินค้าออก / ขาย — MeeStock",
  description: "บันทึกการขายสินค้าและออกใบเสร็จ/Invoice",
};

export default function StockOutPage() {
  return <StockOutView />;
}
