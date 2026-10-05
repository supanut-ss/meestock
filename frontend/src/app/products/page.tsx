import ProductManagement from "@/components/ProductManagement";
import { isAdmin } from "@/lib/authActions";

export default async function ProductsPage() {
  return <ProductManagement isAdmin={await isAdmin()} />;
}
