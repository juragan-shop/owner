"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  Save,
  Users,
} from "lucide-react";

import { cn } from "@/utils";
import { formatAngka, formatRupiah, parseAngka } from "@/utils/home";

/* ------------------------------------------------------------------ */
/* Tipe data: sama dengan respons GET /owner/getResellerTransactions   */
/* Semua BigInt dari backend dikirim sebagai string.                    */
/* ------------------------------------------------------------------ */
type ResellerItem = {
  id: string;
  namaBarang: string;
  jumlahBarang: string;
  hargaBarang: string;
  potongan: string;
  totalHarga: string;
};

type ResellerTransaction = {
  id: string;
  userId: string;
  namaPelanggan: string | null;
  totalBayar: string;
  sisaUtang: string | null;
  createdAt: string;
  items: ResellerItem[];
};

type Filter = "semua" | "belum" | "lunas";

const toNum = (value: string | null | undefined) =>
  value == null || value === "" ? 0 : Number(value);

const isLunas = (tx: ResellerTransaction) => toNum(tx.sisaUtang) <= 0;

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Backend URL belum dikonfigurasi.");
  return baseUrl;
};

const readMessage = (result: unknown, fallback: string) => {
  const message = (result as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message || fallback;
};

/* ------------------------------------------------------------------ */
/* Halaman                                                              */
/* ------------------------------------------------------------------ */
export default function Resellers() {
  const { getToken } = useAuth();

  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<Filter>("semua");
  const [openId, setOpenId] = useState<string | null>(null);

  // GET /owner/getResellerTransactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();
      if (!token) throw new Error("Sesi login tidak ditemukan.");

    const response = await fetch(
  `${getBaseUrl()}/owner/getResellerTransactions`,
  { headers: { Authorization: `Bearer ${token}` } },
);

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readMessage(result, "Gagal memuat transaksi reseller."));
      }

      const list: ResellerTransaction[] = Array.isArray(result) ? result : [];


      setTransactions(
        list.map((tx) => ({
          ...tx,
          items: Array.isArray(tx.items) ? tx.items : [],
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  // Perbarui satu transaksi di layar setelah PATCH berhasil.
  const patchSisaUtang = useCallback((id: string, sisaUtang: number) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id ? { ...tx, sisaUtang: String(sisaUtang) } : tx,
      ),
    );
  }, []);

  const counts = useMemo(() => {
    const lunas = transactions.filter(isLunas).length;
    return {
      semua: transactions.length,
      lunas,
      belum: transactions.length - lunas,
    };
  }, [transactions]);

  const totalUtang = useMemo(
    () => transactions.reduce((sum, tx) => sum + toNum(tx.sisaUtang), 0),
    [transactions],
  );

  const visible = useMemo(() => {
    if (filter === "lunas") return transactions.filter(isLunas);
    if (filter === "belum") return transactions.filter((tx) => !isLunas(tx));
    return transactions;
  }, [transactions, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "semua", label: "Semua" },
    { value: "belum", label: "Belum lunas" },
    { value: "lunas", label: "Lunas" },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-24 pt-4 sm:px-6 lg:pt-8">
      {/* HEADER */}
      <header className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 p-5 shadow-sm sm:p-7 dark:border-sky-900/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-2">
          <Users size={20} className="shrink-0 text-sky-600 dark:text-sky-400" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Daftar reseller
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Buka transaksi untuk melihat barang dan memperbarui sisa utang.
        </p>

        {!loading && transactions.length > 0 && (
          <div className="mt-4 inline-flex flex-wrap items-baseline gap-x-2 rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="text-slate-600 dark:text-slate-400">
              Utang belum dibayar
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatRupiah(totalUtang)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              dari {counts.belum} transaksi
            </span>
          </div>
        )}
      </header>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10"
        >
          <AlertCircle size={20} className="shrink-0 text-rose-600" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void fetchTransactions()}
            className="ml-auto shrink-0 text-xs font-semibold text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* FILTER */}
      {!loading && transactions.length > 0 && (
        <div
          role="tablist"
          aria-label="Filter status pembayaran"
          className="flex gap-2 overflow-x-auto"
        >
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-sky-200 bg-white text-slate-600 hover:bg-sky-50 dark:border-sky-900/30 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {item.label}{" "}
                <span className={active ? "text-sky-100" : "text-slate-400"}>
                  {counts[item.value]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ISI */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white p-12 text-sm text-slate-500 dark:border-sky-900/20 dark:bg-slate-900/30 dark:text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          Memuat transaksi reseller...
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-white p-12 text-center dark:border-sky-900/30 dark:bg-slate-900/30">
          <Boxes size={28} className="mx-auto text-sky-400" />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
            Belum ada transaksi reseller.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Transaksi baru dibuat lewat menu Buat Reseller.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sky-200 p-10 text-center text-sm text-slate-500 dark:border-sky-900/30 dark:text-slate-400">
          Tidak ada transaksi dengan status ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {visible.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              open={openId === tx.id}
              onToggle={() =>
                setOpenId((prev) => (prev === tx.id ? null : tx.id))
              }
              onSaved={patchSisaUtang}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kartu transaksi                                                      */
/* ------------------------------------------------------------------ */
type TransactionCardProps = {
  tx: ResellerTransaction;
  open: boolean;
  onToggle: () => void;
  onSaved: (id: string, sisaUtang: number) => void;
};

function TransactionCard({ tx, open, onToggle, onSaved }: TransactionCardProps) {
  const { getToken } = useAuth();

  const total = toNum(tx.totalBayar);
  const sisa = toNum(tx.sisaUtang);
  const lunas = sisa <= 0;
  const dibayar = Math.max(0, total - sisa);
  const persen =
    total > 0 ? Math.min(100, Math.round((dibayar / total) * 100)) : 100;

  const [draft, setDraft] = useState(String(sisa));
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState("");
  const [saved, setSaved] = useState("");

  const draftValue = draft === "" ? 0 : parseAngka(draft);
  const draftTooBig = draftValue > total;
  const unchanged = draftValue === sisa;

  // PATCH /owner/updateReseller  { id, sisaUtang }
  const save = async (value: number) => {
    setCardError("");
    setSaved("");

    if (!Number.isSafeInteger(value) || value < 0) {
      setCardError("Sisa utang tidak valid.");
      return;
    }

    if (value > total) {
      setCardError("Sisa utang tidak boleh melebihi total pembayaran.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();
      if (!token) throw new Error("Sesi login tidak ditemukan.");

      const response = await fetch(`${getBaseUrl()}/owner/updateReseller`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: tx.id, sisaUtang: value }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readMessage(result, "Gagal memperbarui sisa utang."));
      }

      onSaved(tx.id, value);
      setDraft(String(value));
      setSaved(value === 0 ? "Ditandai lunas." : "Sisa utang diperbarui.");
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const panelId = `panel-${tx.id}`;

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm dark:border-sky-900/20 dark:bg-slate-900/30">
      {/* RINGKASAN (selalu tampil, bisa diklik) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full p-4 text-left transition-colors hover:bg-sky-50/50 sm:p-5 dark:hover:bg-slate-800/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {tx.namaPelanggan || "Tanpa nama"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {formatTanggal(tx.createdAt)} · {tx.items.length} barang
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                lunas
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
              )}
            >
              {lunas && <BadgeCheck size={13} />}
              {lunas ? "Lunas" : "Belum lunas"}
            </span>

            <ChevronDown
              size={18}
              className={cn(
                "text-slate-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total pembayaran
            </p>
            <p className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatRupiah(total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sisa utang
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                lunas
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {formatRupiah(sisa)}
            </p>
          </div>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label="Persentase sudah dibayar"
          aria-valuenow={persen}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              lunas ? "bg-emerald-500" : "bg-sky-500",
            )}
            style={{ width: `${persen}%` }}
          />
        </div>
      </button>

      {/* DETAIL */}
      {open && (
        <div
          id={panelId}
          className="space-y-5 border-t border-sky-100 p-4 sm:p-5 dark:border-sky-900/20"
        >
          {/* Barang */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Package size={16} className="text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Barang
              </h3>
            </div>

            <ul className="space-y-2">
              {tx.items.map((item) => {
                const potongan = toNum(item.potongan);
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2 dark:border-sky-900/20 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-900 dark:text-slate-100">
                        {item.namaBarang}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatAngka(toNum(item.jumlahBarang))} ×{" "}
                        {formatRupiah(toNum(item.hargaBarang))}
                        {potongan > 0 &&
                          `, potongan ${formatRupiah(potongan)}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatRupiah(toNum(item.totalHarga))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Update sisa utang */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 sm:p-4 dark:border-sky-900/20 dark:bg-slate-800/40">
            <label
              htmlFor={`utang-${tx.id}`}
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Sisa utang
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                Rp
              </span>
              <input
                id={`utang-${tx.id}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={draft === "" ? "" : formatAngka(parseAngka(draft))}
                placeholder="0"
                disabled={saving}
                aria-invalid={draftTooBig || undefined}
                onChange={(event) => {
                  setDraft(event.target.value.replace(/\D/g, ""));
                  setCardError("");
                  setSaved("");
                }}
                className={cn(
                  "w-full rounded-xl border border-sky-200 bg-white py-2.5 pl-10 pr-3 text-sm tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 dark:border-sky-900/30 dark:bg-slate-800 dark:text-white",
                  draftTooBig && "border-rose-400 focus:ring-rose-400/40",
                )}
              />
            </div>

            {draftTooBig && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                Tidak boleh lebih dari {formatRupiah(total)}.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={saving || unchanged || draftTooBig}
                onClick={() => void save(draftValue)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Simpan sisa utang
              </button>

              {!lunas && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save(0)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                >
                  <BadgeCheck size={16} />
                  Tandai lunas
                </button>
              )}
            </div>

            {cardError && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400"
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {cardError}
              </p>
            )}

            {saved && (
              <p
                role="status"
                className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 size={14} className="shrink-0" />
                {saved}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}