"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
    Wallet,
    Search,
    Trash2,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    Package,
    ReceiptText,
    X,
} from "lucide-react";
import { cn } from "@/utils";

interface Pengeluaran {
    id: string;
    namaBarang: string;
    hargaBarang: string;
    jumlahBarang: string;
    totalPengeluaran: string;
    tanggalPengeluaran: string;
    tanggalPembaruan: string;
}

interface FormPengeluaran {
    namaBarang: string;
    hargaBarang: string;
    jumlahBarang: string;
}

const initialForm: FormPengeluaran = {
    namaBarang: "",
    hargaBarang: "",
    jumlahBarang: "",
};

function formatRupiah(value: string | number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatTanggal(value: string) {
    return new Date(value).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function Pengeluaran() {
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [data, setData] = useState<Pengeluaran[]>([]);
    const [form, setForm] = useState<FormPengeluaran>(initialForm);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "")}/bendahara/pengeluaran`;

    const harga = Number(form.hargaBarang);
    const jumlah = Number(form.jumlahBarang);
    const totalPreview = harga * jumlah;

    const filteredData = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) return data;

        return data.filter((item) =>
            item.namaBarang.toLowerCase().includes(keyword),
        );
    }, [data, search]);

    const fetchPengeluaran = useCallback(async () => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setError("Silakan login terlebih dahulu.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const token = await getToken();

            const response = await fetch(apiUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Gagal mengambil data (${response.status}).`);
            }

            const result: Pengeluaran[] = await response.json();
            setData(result);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Terjadi kesalahan saat mengambil data.",
            );
        } finally {
            setLoading(false);
        }
    }, [apiUrl, getToken, isLoaded, isSignedIn]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPengeluaran();
    }, [fetchPengeluaran]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.namaBarang.trim()) {
            setError("Nama barang wajib diisi.");
            return;
        }

        if (
            !Number.isSafeInteger(harga) ||
            !Number.isSafeInteger(jumlah) ||
            harga <= 0 ||
            jumlah <= 0
        ) {
            setError("Harga dan jumlah harus berupa bilangan bulat positif.");
            return;
        }

        if (!Number.isSafeInteger(totalPreview)) {
            setError("Total pengeluaran terlalu besar.");
            return;
        }

        try {
            setSaving(true);

            const token = await getToken();

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    namaBarang: form.namaBarang.trim(),
                    hargaBarang: harga,
                    jumlahBarang: jumlah,
                }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => null);
                const message = Array.isArray(result?.message)
                    ? result.message.join(", ")
                    : result?.message;

                throw new Error(message || "Gagal menyimpan pengeluaran.");
            }

            setForm(initialForm);
            setShowForm(false);
            setSuccess("Pengeluaran berhasil ditambahkan.");

            await fetchPengeluaran();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Terjadi kesalahan saat menyimpan data.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        const confirmed = window.confirm(
            "Yakin ingin menghapus catatan pengeluaran ini?",
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            setDeletingId(id);

            const token = await getToken();

            const response = await fetch(`${apiUrl}/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const result = await response.json().catch(() => null);
                throw new Error(result?.message || "Gagal menghapus pengeluaran.");
            }

            setData((current) => current.filter((item) => item.id !== id));
            setSuccess("Pengeluaran berhasil dihapus.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Terjadi kesalahan saat menghapus data.",
            );
        } finally {
            setDeletingId(null);
        }
    }

    const totalSemuaPengeluaran = useMemo(
        () =>
            data.reduce(
                (total, item) => total + Number(item.totalPengeluaran),
                0,
            ),
        [data],
    );

    const inputClass = cn(
        "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors",
        "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500",
    );

    const cardClass = cn(
        "rounded-2xl border p-5 shadow-sm",
        "border-slate-200 bg-white",
        "dark:border-slate-800 dark:bg-slate-900/50",
    );

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
                        <ReceiptText size={20} className="text-sky-500" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                            Catatan Pengeluaran
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Kelola dan pantau pengeluaran usaha.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setForm(initialForm);
                        setError("");
                        setSuccess("");
                        setShowForm((prev) => !prev);
                    }}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors",
                        "bg-sky-500 hover:bg-sky-600",
                    )}
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? "Tutup" : "Tambah Pengeluaran"}
                </button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
                <article className={cardClass}>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Total Pengeluaran
                        </p>
                        <span className="rounded-xl bg-rose-50 p-2 text-rose-500 dark:bg-rose-900/20">
                            <Wallet size={20} />
                        </span>
                    </div>
                    <h2 className="mt-4 break-words text-2xl font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(totalSemuaPengeluaran)}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Akumulasi seluruh catatan pengeluaran.
                    </p>
                </article>

                <article className={cardClass}>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Jumlah Catatan
                        </p>
                        <span className="rounded-xl bg-sky-50 p-2 text-sky-500 dark:bg-sky-900/20">
                            <Package size={20} />
                        </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                        {data.length}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Total data pengeluaran yang tersimpan.
                    </p>
                </article>
            </div>

            {/* Form */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className={cn(cardClass, "space-y-5")}
                >
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Catat Pengeluaran Baru
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Total dihitung dari harga dikali jumlah.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-2">
                            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Nama Barang
                            </span>
                            <input
                                type="text"
                                value={form.namaBarang}
                                onChange={(event) =>
                                    setForm({ ...form, namaBarang: event.target.value })
                                }
                                placeholder="Contoh: Es batu"
                                required
                                className={inputClass}
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Harga Satuan (Rp)
                            </span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={form.hargaBarang}
                                onChange={(event) =>
                                    setForm({ ...form, hargaBarang: event.target.value })
                                }
                                placeholder="Contoh: 10000"
                                required
                                className={inputClass}
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Jumlah
                            </span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={form.jumlahBarang}
                                onChange={(event) =>
                                    setForm({ ...form, jumlahBarang: event.target.value })
                                }
                                placeholder="Contoh: 5"
                                required
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Estimasi total pengeluaran
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Harga satuan × jumlah barang
                            </p>
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-white">
                            {Number.isSafeInteger(totalPreview) && totalPreview > 0
                                ? formatRupiah(totalPreview)
                                : "Rp0"}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !isLoaded || !isSignedIn}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors",
                            "bg-sky-500 hover:bg-sky-600",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                    >
                        {saving && <Loader2 size={17} className="animate-spin" />}
                        {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
                    </button>
                </form>
            )}

            {/* Alerts */}
            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10">
                    <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-500" />
                    <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-200">
                        {success}
                    </p>
                </div>
            )}

            {/* List */}
            <div className={cardClass}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Daftar Pengeluaran
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Total {data.length} catatan
                        </p>
                    </div>

                    <label
                        className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2",
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
                            placeholder="Cari nama barang..."
                            aria-label="Cari nama barang"
                            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:w-56 dark:text-white dark:placeholder:text-slate-500"
                        />
                    </label>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                        <Loader2 size={28} className="animate-spin" />
                        <p className="text-sm">Memuat data...</p>
                    </div>
                ) : error && data.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={() => void fetchPengeluaran()}
                            className="mt-3 rounded-xl border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20"
                        >
                            Coba lagi
                        </button>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-16 text-slate-400 dark:border-slate-700">
                        <Package size={32} />
                        <p className="text-sm">
                            {search
                                ? "Tidak ada barang yang cocok dengan pencarian."
                                : "Belum ada catatan pengeluaran."}
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    <th className="px-3 py-3 font-medium">Nama Barang</th>
                                    <th className="px-3 py-3 font-medium">Harga Satuan</th>
                                    <th className="px-3 py-3 font-medium">Jumlah</th>
                                    <th className="px-3 py-3 font-medium">Total</th>
                                    <th className="px-3 py-3 font-medium">Tanggal</th>
                                    <th className="px-3 py-3 text-right font-medium">Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                    >
                                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                                            {item.namaBarang}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                            {formatRupiah(item.hargaBarang)}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                            {Number(item.jumlahBarang).toLocaleString("id-ID")}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900 dark:text-white">
                                            {formatRupiah(item.totalPengeluaran)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-2">
                                                <CalendarDays size={15} className="text-slate-400" />
                                                {formatTanggal(item.tanggalPengeluaran)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(item.id)}
                                                    disabled={deletingId === item.id}
                                                    aria-label={`Hapus ${item.namaBarang}`}
                                                    className={cn(
                                                        "rounded-lg border border-rose-200 p-2 text-rose-500 transition-colors",
                                                        "hover:bg-rose-50",
                                                        "disabled:opacity-50",
                                                        "dark:border-rose-900/30 dark:hover:bg-rose-900/20",
                                                    )}
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
