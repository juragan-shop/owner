"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  Store,
} from "lucide-react";

import { cn } from "@/utils";
import { formatRupiah } from "@/utils/formatRupiah";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";

/* ------------------------------- Types ------------------------------- */

// BigInt dari Prisma biasanya dikirim backend sebagai string/number.
type Num = string | number | null | undefined;

type CicilItem = {
  id: string;
  namaBarang: string;
  namaSupplier?: string | null;
  jumlahBarang: Num;
  hargaBarang?: Num;
  potonganHarga?: Num;
  totalHarga?: Num;
  catatanPelanggan?: string | null;
};

type CicilOrder = {
  id: string;
  namaPelanggan?: string | null;
  alamatPelanggan?: string | null;
  totalHarga: Num;
  ongkir?: Num;
  bendaharaStatus?: string | null;
  createdAt?: string;
  orderItems: CicilItem[];
};

/* ------------------------------ Helpers ------------------------------ */

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const rupiah = (value: number) => formatRupiah(String(Math.round(value)));

const itemTotal = (item: CicilItem) =>
  item.totalHarga != null
    ? toNumber(item.totalHarga)
    : toNumber(item.hargaBarang) * toNumber(item.jumlahBarang) -
    toNumber(item.potonganHarga);

const formatTanggal = (value?: string) => {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "-";
};

const supplierName = (item: CicilItem) =>
  item.namaSupplier?.trim() || "Tanpa Supplier";

const uniqueSuppliers = (items: CicilItem[]) => [
  ...new Set(items.map(supplierName)),
];

/* --------------------------- Sub-components --------------------------- */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-4">
      <p className="text-[10px] opacity-80 sm:text-xs">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-tight sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function ItemRow({ item }: { item: CicilItem }) {
  const potongan = toNumber(item.potonganHarga);
  const hasil = toNumber(item.hargaBarang) - potongan


  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800 sm:text-base dark:text-slate-100">
          {item.namaBarang}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 sm:text-xs dark:text-sky-400">
          <Store size={12} />
          {supplierName(item)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
          {toNumber(item.jumlahBarang)} x {rupiah(toNumber(hasil))}

        </p>
        {item.catatanPelanggan && (
          <p className="mt-1 break-words text-[11px] italic text-slate-400 sm:text-xs dark:text-slate-500">
            &quot;{item.catatanPelanggan}&quot;
          </p>
        )}
      </div>

      <span className="w-full border-t border-slate-100 pt-2 text-sm font-semibold text-slate-700 sm:w-auto sm:shrink-0 sm:border-0 sm:pt-0 sm:text-right dark:border-slate-800 dark:text-slate-200">
        {rupiah(itemTotal(item))}
      </span>
    </div>
  );
}

function OrderCard({
  order,
  isOpen,
  onToggle,
}: {
  order: CicilOrder;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const suppliers = uniqueSuppliers(order.orderItems);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full flex-col gap-3 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5 dark:bg-slate-900/70 dark:hover:bg-slate-800"
      >
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white sm:h-11 sm:w-11">
            <ReceiptText size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 sm:text-base dark:text-slate-100">
              {order.namaPelanggan?.trim() || "Tanpa Nama"}
            </p>
            <p className="text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
              {formatTanggal(order.createdAt)} · {order.orderItems.length} item
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suppliers.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 sm:text-[11px] dark:bg-sky-950/60 dark:text-sky-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 border-t border-slate-200 pt-3 sm:w-auto sm:justify-end sm:border-0 sm:pt-0 dark:border-slate-700">
          <div className="text-right">
            <span className="block break-words text-xs font-bold text-sky-700 sm:text-base dark:text-sky-400">
              {rupiah(toNumber(order.totalHarga))}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-amber-600 sm:text-[11px] dark:text-amber-400">
              Cicil
            </span>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 text-slate-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {order.orderItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          {toNumber(order.ongkir) > 0 && (
            <div className="flex justify-between p-3 text-xs text-slate-500 sm:p-5 sm:text-sm dark:text-slate-400">
              <span>Potongan</span>
              <span>{rupiah(toNumber(order.ongkir))}</span>
            </div>
          )}
          {/* Tempat tombol "Tandai Lunas" nanti */}
        </div>
      )}
    </div>
  );
}

function ButtonConfirm() {
  const { getToken } = useAuth()

  const handleConfirm = async () => {
    try {
      const token = await getToken()
         const result = await fetch(`${API_URL}/bendahara/order/:orderId/lunas`)
    } catch {

    }


  }

  return (
    <div>

    </div>
  )


}

/* ---------------------------- Component ---------------------------- */

export default function OrderCicil() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [orders, setOrders] = useState<CicilOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setError("Silakan login terlebih dahulu.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const res = await fetch(`${API_URL}/bendahara/getOrderItemsKredit`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message ?? `Gagal mengambil data: HTTP ${res.status}`);
      }

      const list = Array.isArray(body) ? body : body?.data;

      if (!Array.isArray(list)) {
        throw new Error("Format data order tidak valid.");
      }

      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const allItems = orders.flatMap((o) => o.orderItems);
    return {
      orders: orders.length,
      suppliers: uniqueSuppliers(allItems).length,
      items: allItems.length,
      total: orders.reduce((sum, o) => sum + toNumber(o.totalHarga), 0),
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Memuat data order cicil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24 sm:space-y-6 sm:p-6 sm:pb-24 lg:p-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-950 via-sky-700 to-sky-500 p-4 text-white shadow-md sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <ReceiptText size={20} className="shrink-0 sm:h-6 sm:w-6" />
          <h2 className="text-lg font-semibold sm:text-2xl">Utang Piutang</h2>
        </div>
        <p className="mt-1 text-[11px] opacity-90 sm:text-sm">
          Order yang belum lunas beserta semua item dan supplier-nya
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-4">
          <StatCard label="Order" value={stats.orders} />
          <StatCard label="Supplier" value={stats.suppliers} />
          <StatCard label="Item" value={stats.items} />
          <StatCard label="Total" value={rupiah(stats.total)} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 sm:p-4 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-current transition active:scale-95"
          >
            <RefreshCw size={14} />
            Coba lagi
          </button>
        </div>
      )}

      {/* Kosong */}
      {orders.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Package size={32} />
          <p className="text-sm">Tidak ada order cicil.</p>
        </div>
      )}

      {/* Daftar order */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:gap-5">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isOpen={openId === order.id}
            onToggle={() =>
              setOpenId((current) => (current === order.id ? null : order.id))
            }
          />
        ))}
      </div>
    </div>
  );
}