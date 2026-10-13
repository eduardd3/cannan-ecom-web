import { LOW_STOCK_THRESHOLD } from "@/lib/inventory/rules";

//  Stock number, colored when it's out or running low.
export default function StockCount({ stock }: { stock: number }) {
  const tone =
    stock === 0 ? "text-red-700" : stock <= LOW_STOCK_THRESHOLD ? "text-amber-700" : "text-adm-fg";
  return <span className={`font-medium tabular-nums ${tone}`}>{stock}</span>;
}
