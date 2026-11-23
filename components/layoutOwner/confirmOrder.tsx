"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    Clock,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Store,
    XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils";
import { OrderItem, Order, OrderRow, ReviewStatus, FilterStatus } from "@/types/confirmOrder/index";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";

const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);

const formatTanggal = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

/** Total item: pakai totalHarga kalau ada, kalau tidak harga × jumlah − potongan. */
const itemTotal = (item: OrderItem) =>
    item.totalHarga ?? item.hargaBarang * item.jumlahBarang - item.potonganHarga;

const uniqueTexts = (values: (string | null)[]) => [
    ...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))),
];

/** Hitung supplier, catatan, dan teks pencarian satu kali per order. */
const toRow = (order: Order): OrderRow => {
    const suppliers = uniqueTexts(order.orderItems.map((i) => i.namaSupplier));

    return {
        ...order,
        suppliers: suppliers.length > 0 ? suppliers.join(", ") : "Tanpa Supplier",
        customerNotes: uniqueTexts(order.orderItems.map((i) => i.catatanPelanggan)),
        searchText: [
            ...suppliers,
            order.namaPelanggan ?? "",
            ...order.orderItems.map((i) => i.namaBarang),
        ]
            .join(" ")
            .toLowerCase(),
    };
};

/* ------------------------------ Status ------------------------------ */

type StatusMeta = { label: string; badge: string; icon: LucideIcon };

const STATUS_META: Record<ReviewStatus, StatusMeta> = {
    PENDING: {
        label: "Menunggu Konfirmasi",
        badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        icon: Clock,
    },
    APPROVED: {
        label: "Diterima",
        badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        icon: CheckCircle2,
    },
    // REJECTED: {
    //     label: "Ditolak",
    //     badge: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    //     icon: XCircle,
    // },
};

const STATUS_TABS = Object.keys(STATUS_META) as ReviewStatus[];

const tabClass = (active: boolean) =>
    cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
        active
            ? "border-sky-500 bg-sky-500 text-white"
            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
    );

const cardClass = cn(
    "rounded-2xl border p-5 shadow-sm",
    "border-slate-200 bg-white",
    "dark:border-slate-800 dark:bg-slate-900/50",
);

/* ------------------------------ Component ------------------------------ */

export default function ConfirmOrders() {
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [orders, setOrders] = useState<Order[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("PENDING");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const callApi = useCallback(
        async <T,>(path: string, init?: RequestInit): Promise<T> => {
            const token = await getToken();

            const res = await fetch(`${API_URL}${path}`, {
                ...init,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                cache: "no-store",
            });

            const body = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(body?.message ?? `Permintaan gagal: HTTP ${res.status}`);
            }

            return body as T;
        },
        [getToken],
    );

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
            setOrders(await callApi<Order[]>("/bendahara/orders"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data order.");
        } finally {
            setLoading(false);
        }
    }, [callApi, isLoaded, isSignedIn]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    const rows = useMemo(() => orders.map(toRow), [orders]);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return rows.filter(
            (row) =>
                (filterStatus === "APPROVED" || row.bendaharaStatus === filterStatus) &&
                (!keyword || row.searchText.includes(keyword)),
        );
    }, [rows, search, filterStatus]);

    const grandTotal = useMemo(
        () => filteredRows.reduce((sum, row) => sum + Number(row.totalHarga), 0),
        [filteredRows],
    );

    const handleConfirm = async (row: OrderRow, status: "APPROVED" | "REJECTED") => {
        const action = status === "APPROVED" ? "menerima" : "menolak";
        if (!window.confirm(`Yakin ingin ${action} order dari ${row.suppliers}?`)) return;

        setError("");
        setSuccess("");
        setProcessingId(row.id);

        try {
            const updated = await callApi<{ bendaharaStatus: ReviewStatus }>(
                `/bendahara/orders/${row.id}/status`,
                { method: "PATCH", body: JSON.stringify({ status }) },
            );

            setOrders((current) =>
                current.map((o) =>
                    o.id === row.id ? { ...o, bendaharaStatus: updated.bendaharaStatus } : o,
                ),
            );
            setSuccess(
                status === "APPROVED" ? "Order berhasil dikonfirmasi." : "Order berhasil ditolak.",
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui status.");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Memuat data order...</p>
            </div>
        );
    }

    return (
        <section className="mb-20 w-full space-y-6 p-4 sm:p-6 lg:p-10">
            {/* Header */}
            <div
                className={cn(
                    "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 sm:p-6",
                    "border-slate-200 bg-gradient-to-br from-white to-slate-50",
                    "dark:border-slate-800 dark:from-slate-900 dark:to-slate-950",
                )}
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck size={20} className="text-sky-500" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                            konfirmasi orderan kurir
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tinjau dan konfirmasi order yang sudah selesai dikirim kurir.
                    </p>
                </div>

                <label
                    className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                        "border-slate-200 bg-white",
                        "focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30",
                        "dark:border-slate-700 dark:bg-slate-900",
                    )}
                >
                    <Search size={17} className="text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari supplier / pelanggan / barang..."
                        aria-label="Cari supplier, pelanggan, atau barang"
                        className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:w-64 dark:text-white dark:placeholder:text-slate-500"
                    />
                </label>
            </div>

            {/* Filter status */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((status) => {
                    const { label, icon: Icon } = STATUS_META[status];

                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setFilterStatus(status)}
                            className={tabClass(filterStatus === status)}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    );
                })}

                {/* <button
                    type="button"
                    onClick={() => setFilterStatus("SEMUA")}
                    className={tabClass(filterStatus === "SEMUA")}
                >
                    Semua
                </button> */}
            </div>

            {/* Ringkasan */}
            <div className={cardClass}>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total nilai order terfilter</p>
                    <span className="rounded-xl bg-sky-50 p-2 text-sky-500 dark:bg-sky-900/20">
                        <Package size={20} />
                    </span>
                </div>
                <h2 className="mt-4 break-words text-2xl font-semibold text-slate-900 dark:text-white">
                    {formatRupiah(grandTotal)}
                </h2>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {filteredRows.length} order ditampilkan.
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <div
                    role="alert"
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10"
                >
                    <AlertCircle size={20} className="shrink-0 text-rose-500" />
                    <p className="min-w-0 flex-1 text-sm text-rose-700 dark:text-rose-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadData()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-current transition active:scale-95 dark:text-rose-200"
                    >
                        <RefreshCw size={14} />
                        Muat ulang
                    </button>
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10"
                >
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-200">{success}</p>
                </div>
            )}

            {/* Daftar order */}
            {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-16 text-slate-400 dark:border-slate-700">
                    <Package size={32} />
                    <p className="text-sm">Tidak ada order pada filter ini.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRows.map((row) => {
                        const meta = STATUS_META[row.bendaharaStatus];
                        const StatusIcon = meta.icon;
                        const isOpen = openId === row.id;
                        const isProcessing = processingId === row.id;

                        return (
                            <div
                                key={row.id}
                                className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"
                            >
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenId(isOpen ? null : row.id)}
                                    className="flex w-full items-center justify-between gap-3 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/60"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                                            <Store size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                                                {row.suppliers}
                                            </p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                                                <CalendarDays size={13} />
                                                {formatTanggal(row.createdAt)}
                                                <span>•</span>
                                                <span>{row.orderItems.length} item</span>
                                                {row.namaPelanggan && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate">{row.namaPelanggan}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="hidden text-sm font-bold text-sky-700 sm:inline dark:text-sky-400">
                                            {formatRupiah(Number(row.totalHarga))}
                                        </span>
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                                meta.badge,
                                            )}
                                        >
                                            <StatusIcon size={13} />
                                            {meta.label}
                                        </span>
                                        <ChevronDown
                                            size={18}
                                            className={cn(
                                                "text-slate-400 transition-transform",
                                                isOpen && "rotate-180",
                                            )}
                                        />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {row.orderItems.map((item) => (
                                            <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                                                        {item.namaBarang}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {item.jumlahBarang} x {formatRupiah(item.hargaBarang)}
                                                        {item.potonganHarga > 0 &&
                                                            ` - ${formatRupiah(item.potonganHarga)}`}
                                                    </p>
                                                    {item.catatanBarang && (
                                                        <p className="mt-1 text-xs italic text-slate-400">
                                                            Catatan barang: {item.catatanBarang}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {formatRupiah(itemTotal(item))}
                                                </span>
                                            </div>
                                        ))}

                                        {row.customerNotes.length > 0 && (
                                            <div className="space-y-1 bg-slate-50 p-4 text-xs italic text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                                                {row.customerNotes.map((note) => (
                                                    <p key={note}>Catatan pelanggan: {note}</p>
                                                ))}
                                            </div>
                                        )}

                                        {row.bendaharaStatus === "PENDING" && (
                                            <div className="flex flex-wrap justify-end gap-2 p-4">
                                                <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    onClick={() => void handleConfirm(row, "REJECTED")}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                                                        "border-rose-200 text-rose-600 hover:bg-rose-50",
                                                        "disabled:cursor-not-allowed disabled:opacity-50",
                                                        "dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/20",
                                                    )}
                                                >
                                                    <XCircle size={16} />
                                                    Tolak
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    onClick={() => void handleConfirm(row, "APPROVED")}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
                                                        "bg-emerald-500 hover:bg-emerald-600",
                                                        "disabled:cursor-not-allowed disabled:opacity-50",
                                                    )}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={16} />
                                                    )}
                                                    Konfirmasi
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}