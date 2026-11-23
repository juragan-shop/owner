"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/utils";
import { formatAngka, parseAngka } from "@/utils/home";
import { useGetReseller } from "@/hooks/useGetReseller";

/* ------------------------------------------------------------------ */
/* Tipe: mengikuti model `resellerItem` di Prisma                       */
/* namaBarang, jumlahBarang, hargaBarang, potongan, totalHarga          */
/* Semua angka disimpan sebagai string digit supaya input bisa kosong.  */
/* totalHarga tidak diinput, dihitung otomatis.                         */
/* ------------------------------------------------------------------ */
type ItemDraft = {
  key: string;
  namaBarang: string;
  jumlahBarang: string;
  hargaBarang: string;
  potongan: string;
};

const makeKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

const newItem = (): ItemDraft => ({
  key: makeKey(),
  namaBarang: "",
  jumlahBarang: "1",
  hargaBarang: "",
  potongan: "",
});

const toNumber = (value: string) => (value === "" ? 0 : parseAngka(value));
const digitsOnly = (value: string) => value.replace(/\D/g, "");

const inputClass =
  "w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 dark:border-sky-900/30 dark:bg-slate-800 dark:text-white";

const labelClass =
  "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";

/* ------------------------------------------------------------------ */
/* Input angka dengan pemisah ribuan                                    */
/* ------------------------------------------------------------------ */
type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rupiah?: boolean;
  className?: string;
  invalid?: boolean;
};

function NumberField({
  label,
  value,
  onChange,
  disabled,
  placeholder = "0",
  rupiah,
  className,
  invalid,
}: NumberFieldProps) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>

      <div className="relative">
        {rupiah && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            Rp
          </span>
        )}

        <input
          type="text"
          inputMode="numeric"
          value={value === "" ? "" : formatAngka(toNumber(value))}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(digitsOnly(event.target.value))}
          className={cn(
            inputClass,
            "tabular-nums",
            rupiah && "pl-9",
            invalid && "border-rose-400 focus:ring-rose-400/40",
          )}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman                                                              */
/* ------------------------------------------------------------------ */
export default function CreateReseller() {
  const { getToken } = useAuth();
  const { resellers, loading, error, refetch } = useGetReseller();

  // reseller.userId (id dari tabel users dengan role "reseller")
  const [selectedUserId, setSelectedUserId] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  // reseller.sisaUtang
  const [sisaUtang, setSisaUtang] = useState("");

  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedReseller = useMemo(
    () => resellers.find((reseller) => reseller.id === selectedUserId),
    [resellers, selectedUserId],
  );

  // Hasil hitung per item. `draft` tetap berisi string asli dari input.
  const rows = useMemo(
    () =>
      items.map((draft) => {
        const jumlah = toNumber(draft.jumlahBarang);
        const harga = toNumber(draft.hargaBarang);
        const potongan = toNumber(draft.potongan);

        const subtotal = jumlah * harga;
        const totalHarga = Math.max(0, subtotal - potongan);

        return {
          draft,
          jumlah,
          harga,
          potongan,
          subtotal,
          totalHarga,
          potonganBerlebih: potongan > subtotal,
        };
      }),
    [items],
  );

  const subtotalSemua = rows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalBayar = rows.reduce((sum, row) => sum + row.totalHarga, 0);
  const totalPotongan = subtotalSemua - totalBayar;

  const utang = toNumber(sisaUtang);
  const dibayar = Math.max(0, totalBayar - utang);
  const utangBerlebih = utang > totalBayar;

  const clearMessages = () => {
    setFormError("");
    setSuccess("");
  };

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
    clearMessages();
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
    clearMessages();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    if (!selectedUserId || !selectedReseller) {
      setFormError("Pilih reseller terlebih dahulu.");
      return;
    }

    // Baris kosong total (tanpa nama dan tanpa harga) dilewati.
    // Baris yang sudah diisi tetapi tanpa nama dianggap salah input.
    const filledRows = rows.filter(
      (row) => row.draft.namaBarang.trim() !== "" || row.harga > 0,
    );

    if (filledRows.length === 0) {
      setFormError("Tambahkan minimal satu barang.");
      return;
    }

    for (const row of filledRows) {
      const nomor = rows.indexOf(row) + 1;
      const nama = row.draft.namaBarang.trim();

      if (!nama) {
        setFormError(`Nama barang pada item ${nomor} belum diisi.`);
        return;
      }

      if (row.jumlah < 1) {
        setFormError(`Jumlah ${nama} minimal 1.`);
        return;
      }

      if (row.potonganBerlebih) {
        setFormError(`Potongan ${nama} melebihi subtotal.`);
        return;
      }

      if (!Number.isSafeInteger(row.subtotal)) {
        setFormError(`Subtotal ${nama} melebihi batas angka aman.`);
        return;
      }
    }

    const totalFilled = filledRows.reduce((sum, row) => sum + row.totalHarga, 0);

    if (!Number.isSafeInteger(totalFilled)) {
      setFormError("Total pembayaran melebihi batas angka aman.");
      return;
    }

    if (utang > totalFilled) {
      setFormError("Sisa utang tidak boleh melebihi total pembayaran.");
      return;
    }

    try {
      setSubmitting(true);

      const token = await getToken();
      if (!token) throw new Error("Sesi login tidak ditemukan.");

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
      if (!baseUrl) throw new Error("Backend URL belum dikonfigurasi.");

      // Bentuk payload sama dengan CreateResellerDto di backend.
      // namaPelanggan tidak dikirim: server mengisinya dari users.name.
      const payload = {
        userId: selectedUserId,
        totalBayar: totalFilled,
        sisaUtang: utang,
        items: filledRows.map((row) => ({
          namaBarang: row.draft.namaBarang.trim(),
          jumlahBarang: row.jumlah,
          hargaBarang: row.harga,
          potongan: row.potongan,
          totalHarga: row.totalHarga,
        })),
      };

      const response = await fetch(`${baseUrl}/owner/createReseller`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(result?.message)
            ? result.message.join(", ")
            : result?.message || "Gagal menyimpan transaksi reseller.",
        );
      }

      const namaReseller = selectedReseller.name;

      await refetch();

      setItems([newItem()]);
      setSelectedUserId("");
      setSisaUtang("");
      setSuccess(`Transaksi ${namaReseller} berhasil disimpan.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-24 pt-4 sm:px-6 lg:pt-8">
      {/* HEADER */}
      <header className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 p-5 shadow-sm sm:p-7 dark:border-sky-900/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-2">
          <Users size={21} className="text-sky-600 dark:text-sky-400" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Transaksi reseller
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Pilih reseller, isi barang yang dijual, lalu simpan.
        </p>
      </header>

      {/* ERROR LOAD RESELLER */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10"
        >
          <AlertCircle className="shrink-0 text-rose-600" size={20} />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-auto shrink-0 text-xs font-semibold text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
          >
            Coba lagi
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-6 dark:border-sky-900/20 dark:bg-slate-900/30"
      >
        {/* 1. RESELLER */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users size={18} className="text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Reseller
            </h2>
          </div>

          <label
            htmlFor="reseller"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Nama reseller
          </label>

          <select
            id="reseller"
            value={selectedUserId}
            disabled={busy}
            onChange={(event) => {
              setSelectedUserId(event.target.value);
              clearMessages();
            }}
            className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 dark:border-sky-900/30 dark:bg-slate-800 dark:text-white"
          >
            <option value="">
              {loading
                ? "Memuat reseller..."
                : resellers.length === 0
                  ? "Belum ada reseller terdaftar"
                  : "Pilih reseller"}
            </option>

            {resellers.map((reseller) => (
              <option key={reseller.id} value={reseller.id}>
                {reseller.name}
              </option>
            ))}
          </select>

          {selectedReseller && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Transaksi akan dicatat atas nama{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {selectedReseller.name}
              </span>
              .
            </p>
          )}
        </div>

        <hr className="border-sky-100 dark:border-sky-900/30" />

        {/* 2. BARANG */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Package size={18} className="text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Barang yang dijual
            </h2>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const { draft } = row;

              return (
                <div
                  key={draft.key}
                  className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 sm:p-4 dark:border-sky-900/20 dark:bg-slate-800/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Barang {index + 1}
                    </span>

                    <button
                      type="button"
                      aria-label={`Hapus barang ${index + 1}`}
                      disabled={items.length === 1 || submitting}
                      onClick={() => removeItem(draft.key)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-900/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Nama barang</label>
                      <input
                        type="text"
                        value={draft.namaBarang}
                        disabled={submitting}
                        placeholder="Contoh: Ikan tuna"
                        onChange={(event) =>
                          updateItem(draft.key, {
                            namaBarang: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <NumberField
                        label="Jumlah"
                        value={draft.jumlahBarang}
                        placeholder="1"
                        disabled={submitting}
                        onChange={(value) =>
                          updateItem(draft.key, { jumlahBarang: value })
                        }
                      />

                      <NumberField
                        label="Harga satuan"
                        rupiah
                        value={draft.hargaBarang}
                        disabled={submitting}
                        onChange={(value) =>
                          updateItem(draft.key, { hargaBarang: value })
                        }
                      />

                      <NumberField
                        label="Potongan"
                        rupiah
                        className="col-span-2 sm:col-span-1"
                        value={draft.potongan}
                        invalid={row.potonganBerlebih}
                        disabled={submitting}
                        onChange={(value) =>
                          updateItem(draft.key, { potongan: value })
                        }
                      />
                    </div>

                    {row.potonganBerlebih && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        Potongan lebih besar dari subtotal (Rp{" "}
                        {formatAngka(row.subtotal)}).
                      </p>
                    )}

                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Total harga
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        Rp {formatAngka(row.totalHarga)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => setItems((prev) => [...prev, newItem()])}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 py-3 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-900/20"
          >
            <Plus size={16} />
            Tambah barang
          </button>
        </div>

        <hr className="border-sky-100 dark:border-sky-900/30" />

        {/* 3. PEMBAYARAN */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={18} className="text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pembayaran
            </h2>
          </div>

          <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4 dark:border-sky-900/20 dark:bg-slate-800/40">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Subtotal</dt>
                <dd className="tabular-nums text-slate-900 dark:text-white">
                  Rp {formatAngka(subtotalSemua)}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-600 dark:text-slate-400">
                  Total potongan
                </dt>
                <dd className="tabular-nums text-slate-900 dark:text-white">
                  - Rp {formatAngka(totalPotongan)}
                </dd>
              </div>

              <div className="flex items-center justify-between border-t border-sky-100 pt-2 dark:border-sky-900/30">
                <dt className="font-medium text-slate-700 dark:text-slate-200">
                  Total pembayaran
                </dt>
                <dd className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  Rp {formatAngka(totalBayar)}
                </dd>
              </div>
            </dl>

            <NumberField
              label="Sisa utang"
              rupiah
              value={sisaUtang}
              invalid={utangBerlebih}
              disabled={submitting}
              onChange={(value) => {
                setSisaUtang(value);
                clearMessages();
              }}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSisaUtang("0");
                  clearMessages();
                }}
                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-900/30 dark:bg-slate-800 dark:text-sky-300"
              >
                Lunas
              </button>

              <button
                type="button"
                disabled={submitting || totalBayar === 0}
                onClick={() => {
                  setSisaUtang(String(totalBayar));
                  clearMessages();
                }}
                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-900/30 dark:bg-slate-800 dark:text-sky-300"
              >
                Utang penuh
              </button>
            </div>

            {utangBerlebih ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Sisa utang tidak boleh melebihi total pembayaran.
              </p>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-500 dark:text-slate-400">
                  Sudah dibayar
                </span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  Rp {formatAngka(dibayar)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PESAN */}
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-300"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {formError}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300"
          >
            <CheckCircle2 size={17} className="shrink-0" />
            {success}
          </p>
        )}

        {/* SIMPAN */}
        <button
          type="submit"
          disabled={busy || resellers.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          {submitting ? "Menyimpan transaksi..." : "Simpan transaksi"}
        </button>
      </form>
    </section>
  );
}