import { useCallback, useEffect, useState } from "react";
import { Search, History, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import { adjustInventory, getInventory, getInventoryHistory, type InventoryMovement, type InventoryProduct } from "../../api/inventoryApi";

type Filter = "all" | "low" | "out";
const movementNames: Record<string, string> = {
  INITIAL_STOCK: "Initial stock", ORDER_DEDUCTION: "Order deduction", MANUAL_ADJUSTMENT: "Manual adjustment",
  ORDER_CANCELLATION_RESTORATION: "Cancellation restoration", UNPAID_ORDER_EXPIRY_RESTORATION: "Unpaid order restoration",
};

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [overview, setOverview] = useState({ totalProducts: 0, totalUnitsInStock: 0, lowStockProducts: 0, outOfStockProducts: 0, unknownStockProducts: 0 });
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [threshold, setThreshold] = useState(5);
  const [selected, setSelected] = useState<InventoryProduct | null>(null); const [quantity, setQuantity] = useState(""); const [reason, setReason] = useState("");
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null); const [history, setHistory] = useState<InventoryMovement[]>([]); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { const result = await getInventory({ search, filter, threshold }); setProducts(result.products); setOverview(result.overview); setThreshold(result.threshold); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load inventory."); }
  }, [search, filter, threshold]);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    const delta = Number(quantity);
    if (!selected || !Number.isInteger(delta) || delta === 0 || !reason.trim()) return toast.error("Enter a non-zero whole quantity and a reason.");
    if (selected.stock === null) return toast.error("Stock is unknown. Set a known stock value before adjusting.");
    if (selected.stock + delta < 0) return toast.error("Stock cannot become negative.");
    if (!window.confirm(`Apply ${delta > 0 ? "+" : ""}${delta} units to ${selected.name}?`)) return;
    setSaving(true);
    try { await adjustInventory(selected.id, delta, reason.trim()); toast.success("Inventory updated."); setSelected(null); setQuantity(""); setReason(""); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not adjust inventory."); }
    finally { setSaving(false); }
  };
  const openHistory = async (product: InventoryProduct) => {
    setHistoryProduct(product); setHistory([]);
    try { setHistory(await getInventoryHistory(product.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load history."); }
  };
  const status = (stock: number | null) => stock === null ? "Unknown" : stock === 0 ? "Out of stock" : stock <= threshold ? "Low stock" : "In stock";
  const metrics = [
    ["Products", overview.totalProducts], ["Units in stock", overview.totalUnitsInStock],
    ["Low stock", overview.lowStockProducts], ["Out of stock", overview.outOfStockProducts], ["Unknown stock", overview.unknownStockProducts],
  ];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-app-blue">Inventory</h1><p className="mt-1 text-sm text-app-text-light">Stock totals exclude products with unknown stock.</p></div><label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm"><SlidersHorizontal className="size-4"/> Low stock threshold <input aria-label="Low stock threshold" className="w-16 border-0 text-right outline-none" min="0" type="number" value={threshold} onChange={e => setThreshold(Math.max(0, Number(e.target.value)))} /></label></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-app-border bg-white p-4"><p className="text-2xl font-semibold text-app-blue">{value}</p><p className="text-sm text-app-text-light">{label}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-app-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border p-4"><div className="flex gap-2">{(["all", "low", "out"] as Filter[]).map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-sm capitalize ${filter === item ? "bg-app-blue text-white" : "bg-app-cream text-app-text-light"}`}>{item === "low" ? "Low stock" : item === "out" ? "Out of stock" : "All products"}</button>)}</div><label className="flex items-center gap-2 rounded-lg border border-app-border px-3 py-2"><Search className="size-4 text-zinc-400"/><input className="w-52 outline-none" placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-app-cream/50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU / ID</th><th className="px-4 py-3">Current stock</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-app-border">{products.map(product => <tr key={product.id}><td className="px-4 py-3"><div className="flex items-center gap-3"><img className="size-11 rounded-lg object-cover" src={product.image || ""} alt=""/><span className="font-medium">{product.name || "Unnamed product"}</span></div></td><td className="px-4 py-3 font-mono text-xs text-zinc-500">{product.partNumber || product.id.slice(0, 8)}</td><td className="px-4 py-3">{product.stock ?? "Unknown"}</td><td className="px-4 py-3">{status(product.stock)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => setSelected(product)} className="rounded-lg bg-app-cream px-3 py-2 text-xs font-medium">Adjust</button><button onClick={() => void openHistory(product)} title="View history" className="rounded-lg bg-app-cream p-2"><History className="size-4"/></button></div></td></tr>)}{products.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No products found.</td></tr>}</tbody></table></div>
    </section>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex justify-between"><div><h2 className="text-lg font-semibold">Adjust stock</h2><p className="text-sm text-zinc-500">{selected.name} · Current: {selected.stock ?? "Unknown"}</p></div><button onClick={() => setSelected(null)}><X/></button></div><label className="mb-3 block text-sm">Adjustment quantity<input className="mt-1 w-full rounded-lg border p-3" type="number" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label className="mb-3 block text-sm">Reason<textarea className="mt-1 w-full rounded-lg border p-3" maxLength={500} value={reason} onChange={e => setReason(e.target.value)}/></label><p className="mb-4 text-sm text-zinc-600">Resulting stock: {selected.stock === null || !Number.isInteger(Number(quantity)) ? "Unknown" : selected.stock + Number(quantity)}</p><button disabled={saving} onClick={() => void submit()} className="w-full rounded-xl bg-app-green p-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Confirm adjustment"}</button></section></div>}
    {historyProduct && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Stock history</h2><p className="text-sm text-zinc-500">{historyProduct.name}</p></div><button onClick={() => setHistoryProduct(null)}><X/></button></div>{history.length === 0 ? <p className="py-8 text-center text-zinc-500">No movements recorded.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-zinc-500"><th className="p-2">Movement</th><th className="p-2">Change</th><th className="p-2">Before → after</th><th className="p-2">Reason / actor</th><th className="p-2">Date</th></tr></thead><tbody>{history.map(move => <tr key={move.id} className="border-b"><td className="p-2">{movementNames[move.movementType] || move.movementType}</td><td className="p-2">{move.quantityChange === null ? "Not applied" : `${move.quantityChange > 0 ? "+" : ""}${move.quantityChange}`}</td><td className="p-2">{move.stockBefore ?? "Unknown"} → {move.stockAfter ?? "Unknown"}</td><td className="p-2">{move.reason}<span className="block text-xs text-zinc-500">{move.adminActor?.name || move.adminActor?.email || "System"}</span></td><td className="p-2">{new Date(move.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</section></div>}
  </div>;
}
