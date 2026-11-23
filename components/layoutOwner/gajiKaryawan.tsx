"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  User,
  Search,
  Wallet,
  Pencil,
  X,
  Save,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/utils";
import { formatRupiah } from "@/utils/formatRupiah";
import type { GajiKaryawan, FormGaji, PrismaGajiKaryawan } from "@/types/gajiKaryawan"
import { initialForm, formatTanggal } from "@/utils/gajiKaryawan"



export default function GajiKaryawan() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [data, setData] = useState<GajiKaryawan[]>([]);
  const [form, setForm] = useState<FormGaji>(initialForm);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const url = process.env.NEXT_PUBLIC_BACKEND_URL!
  const apiUrl =
    `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "")}` +
    "/bendahara/createGajiKaryawan";

  const gajiInput = Number(form.gaji) || 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalGaji = useMemo(
    () => data.reduce((sum, item) => sum + (item.gaji ?? BigInt(0)), BigInt(0)),
    [data]
  );

  const filteredData = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();
    if (!keyword) return data;
    return data.filter(
      (item) =>
        item.namaKaryawan.toLowerCase().includes(keyword)
    );
  }, [data, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const loadData = useCallback(async () => {
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

      if (!token) {
        throw new Error("Token autentikasi Clerk tidak ditemukan.");
      }

      const response = await fetch(`${url}/bendahara`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message || `Gagal mengambil data (${response.status}).`
        );
      }

      const result = await response.json();
      const items = Array.isArray(result) ? result : result.data ?? [];

      const mapped = items.map((item: PrismaGajiKaryawan) => ({
        id: item.id,
        namaKaryawan: item.namaKaryawan,
        utangPiutang: item.utangPiutang ? BigInt(item.utangPiutang) : null,
        gaji: item.gaji ? BigInt(item.gaji) : null,
        tanggalPembayaran: item.tanggalPembayaran,
        pembaruanTanggal: item.pembaruanTanggal,
      }));

      setData(mapped);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data gaji karyawan."
      );
    } finally {
      setLoading(false);
    }
  }, [url, getToken, isLoaded, isSignedIn]);



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.namaKaryawan.trim()) {
      setError("Nama karyawan wajib diisi.");
      return;
    }

    if (!form.tanggalPembayaran) {
      setError("Tanggal pembayaran wajib diisi.");
      return;
    }

    if (!Number.isSafeInteger(gajiInput)) {
      setError("Gaji harus berupa bilangan bulat positif.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        throw new Error("Token autentikasi Clerk tidak ditemukan.");
      }

      const endpoint = editingId ? `${apiUrl}/${editingId}` : apiUrl;

      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          namaKaryawan: form.namaKaryawan.trim(),
          utangPiutang: form.utangPiutang ? Number(form.utangPiutang) : null,
          gaji: Number(form.gaji),

        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message ||
          `Gagal menyimpan data gaji karyawan (${response.status}).`
        );
      }

      resetForm();
      setSuccess(
        editingId
          ? "Data gaji karyawan berhasil diperbarui."
          : "Data gaji karyawan berhasil ditambahkan."
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data gaji karyawan."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: GajiKaryawan) => {
    setEditingId(item.id);
    setForm({
      namaKaryawan: item.namaKaryawan,
      utangPiutang: item.utangPiutang ? item.utangPiutang.toString() : "",
      gaji: item.gaji ? item.gaji.toString() : "",
      tanggalPembayaran: item.tanggalPembayaran,
    });
    setError("");
    setSuccess("");
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;

    setError("");
    setSuccess("");

    try {
      setDeletingId(confirmDeleteId);

      const token = await getToken();

      if (!token) {
        throw new Error("Token autentikasi Clerk tidak ditemukan.");
      }

      const response = await fetch(
        `${url}/bendahara/deleteGajiKaryawan/${encodeURIComponent(confirmDeleteId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message || "Gagal menghapus data gaji karyawan."
        );
      }

      setData((current) =>
        current.filter((item) => item.id !== confirmDeleteId)
      );
      setSuccess("Data gaji karyawan berhasil dihapus.");
      setConfirmDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus data gaji karyawan."
      );
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  return (
    <section className="space-y-6 p-10 mb-25">
      {/* Header */}
      <div className="rounded-3xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 p-8 sm:p-10 shadow-sm shadow-sky-100/50 dark:border-sky-900/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-sky-600" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Gaji Karyawan
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Kelola dan catat data gaji karyawan usaha.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-sky-200 px-4 py-2.5 text-sm bg-white/50 dark:bg-slate-800/50 dark:border-sky-900/30">
            <Clock size={17} className="text-sky-600" />
            <span className="capitalize text-slate-700 dark:text-slate-300">
              {new Date().toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm shadow-rose-100/40 dark:border-rose-900/30 dark:bg-rose-900/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-rose-800 dark:text-rose-200">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-lg border border-rose-200 px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/20"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm shadow-emerald-100/40 dark:border-emerald-900/30 dark:bg-emerald-900/10">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              {success}
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <article
          className={cn(
            "min-w-0 rounded-2xl border border-sky-100 p-6 bg-sky-50 dark:border-sky-900/20 dark:bg-slate-900/30",
            "hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-sky-50/40 dark:shadow-none"
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm shadow-sky-200/50">
              <User size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Karyawan
            </span>
          </div>
          <h2 className="break-words text-3xl font-bold text-slate-900 dark:text-white">
            {data.length}
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Total data gaji karyawan yang tersimpan.
          </p>
        </article>

        <article
          className={cn(
            "min-w-0 rounded-2xl border border-emerald-100 p-6 bg-emerald-50 dark:border-emerald-900/20 dark:bg-slate-900/30",
            "hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-emerald-50/40 dark:shadow-none"
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-200/50">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Gaji Bulanan
            </span>
          </div>
          <h2 className="break-words text-3xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(totalGaji.toString())}
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Akumulasi seluruh gaji karyawan yang tercatat.
          </p>
        </article>
      </div>

      {/* Form Card */}
      <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/20 dark:bg-slate-900/30">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingId ? "Edit Gaji Karyawan" : "Catat Gaji Karyawan Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Isi data gaji karyawan dengan lengkap.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            aria-label="Tutup formulir"
            className="rounded-lg border border-sky-200 p-2 hover:bg-sky-50 transition-colors dark:border-sky-900/20 dark:hover:bg-slate-800"
          >
            <X size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="namaKaryawan"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Nama Karyawan
              </label>
              <input
                id="namaKaryawan"
                type="text"
                value={form.namaKaryawan}
                onChange={(e) =>
                  setForm({ ...form, namaKaryawan: e.target.value })
                }
                placeholder="Contoh: Budi Santoso"
                required
                className="w-full rounded-lg border border-sky-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="utangPiutang"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Utang Piutang (Rp)
              </label>
              <input
                id="utangPiutang"
                type="number"
                min="0"
                step="1"
                value={form.utangPiutang}
                onChange={(e) =>
                  setForm({ ...form, utangPiutang: e.target.value })
                }
                placeholder="0"
                className="w-full rounded-lg border border-sky-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="gaji"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Gaji (Rp)
              </label>
              <input
                id="gaji"
                type="number"
                min="0"
                step="1"
                value={form.gaji}
                onChange={(e) => setForm({ ...form, gaji: e.target.value })}
                placeholder="5000000"

                className="w-full rounded-lg border border-sky-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            {/* <div>
              <label
                htmlFor="tanggalPembayaran"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Tanggal Pembayaran
              </label>
              <input
                id="tanggalPembayaran"
                type="date"
                value={form.tanggalPembayaran}
                onChange={(e) =>
                  setForm({ ...form, tanggalPembayaran: e.target.value })
                }
                required
                className="w-full rounded-lg border border-sky-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div> */}
          </div>

          <div className="rounded-lg border border-sky-200 p-3 bg-sky-50 dark:border-sky-900/20 dark:bg-sky-900/10">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Preview gaji
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {Number.isSafeInteger(gajiInput) && gajiInput > 0
                ? formatRupiah(String(gajiInput))
                : "Rp0"}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-sky-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving || !isLoaded || !isSignedIn}
              className="flex items-center gap-2 rounded-lg border border-sky-500 bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-sky-200/50 hover:from-sky-600 hover:to-sky-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save size={17} />
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Simpan Gaji Karyawan"}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-lg dark:border-sky-900/20 dark:bg-slate-900/30 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Hapus Data Gaji Karyawan?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Data yang dihapus tidak dapat dikembalikan. Yakin ingin melanjutkan?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deletingId === confirmDeleteId}
                className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === confirmDeleteId}
                className="rounded-lg border border-rose-500 bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {deletingId === confirmDeleteId ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/20 dark:bg-slate-900/30">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Daftar Gaji Karyawan
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Total {data.length} data gaji karyawan
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-sky-300 px-3 py-2 bg-white dark:border-slate-600 dark:bg-slate-800">
            <Search size={17} className="text-sky-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama karyawan..."
              aria-label="Cari nama karyawan"
              className="w-full bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600 dark:border-sky-900/20 dark:border-t-sky-400 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Memuat data...
            </p>
          </div>
        ) : error && data.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-lg border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-400 dark:hover:bg-slate-800"
            >
              Coba lagi
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="rounded-full bg-sky-100 p-4 mx-auto mb-3">
              <Search size={32} className="text-sky-500" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {search
                ? "Tidak ada data yang cocok dengan pencarian."
                : "Belum ada data gaji karyawan."}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {search
                ? "Coba kata kunci pencarian lain."
                : "Mulai tambah data gaji karyawan pertama Anda."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-y border-sky-100 bg-sky-50 dark:border-sky-900/20 dark:bg-slate-900/40">
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      Nama Karyawan
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      Utang Piutang
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      Gaji
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      Tanggal Pembayaran
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-sky-50 last:border-0 hover:bg-sky-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {item.namaKaryawan}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {item.utangPiutang
                          ? formatRupiah(item.utangPiutang.toString())
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {item.gaji ? formatRupiah(item.gaji.toString()) : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatTanggal(item.tanggalPembayaran)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            aria-label={`Edit ${item.namaKaryawan}`}
                            className="rounded-lg border border-emerald-200 p-2 hover:bg-emerald-50 text-emerald-600 transition-colors dark:border-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            aria-label={`Hapus ${item.namaKaryawan}`}
                            className="rounded-lg border border-rose-200 p-2 hover:bg-rose-50 text-rose-600 disabled:opacity-50 transition-colors dark:border-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/20"
                          >
                            {deletingId === item.id ? "..." : (
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Halaman {currentPage} dari {totalPages}
                </p>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(p - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        page === currentPage
                          ? "bg-sky-600 text-white shadow-sm shadow-sky-200/50"
                          : "border border-sky-300 text-slate-700 hover:bg-sky-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
