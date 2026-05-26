import ReportsView from "@/components/ReportsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รายงานสต็อกและการเงิน — MeeStock",
  description: "รายงานวิเคราะห์สต็อกสินค้าคงเหลือ รายงานกำไร-ขาดทุน และสินค้าใกล้หมดอายุ",
};

export default function ReportsPage() {
  return <ReportsView />;
}
