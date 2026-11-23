"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ReceiptText,
  CalendarDays,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ClipboardCheck,
  Landmark,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/utils";
import { Pemasukan, Pengeluaran, Transaction } from "@/types";
import { useTabStore } from "@/store/useTabstoreOwner";
import {
  formatAngka, parseAngka, formatRupiah, formatTanggal, isToday
} from "@/utils/home";
const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";



export default function Home() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const setActiveTab = useTabStore((state) => state.setActiveTab);

  const [pemasukan, setPemasukan] = useState<Pemasukan[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);

  // Modal awal
  const [modalAwal, setModalAwal] = useState(0);
  const [modalInput, setModalInput] = useState("");
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const fetchData = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setError("Silakan login terlebih dahulu.");
      setLoading(false);
      return;
    }

    if (!API_URL) {
      setError("NEXT_PUBLIC_BACKEND_URL belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        throw new Error("Token autentikasi tidak tersedia.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [responsePemasukan, responsePengeluaran] = await Promise.all([
        fetch(`${API_URL}/bendahara/pemasukan`, { headers }),
        fetch(`${API_URL}/bendahara/pengeluaran`, { headers }),
      ]);

      if (!responsePemasukan.ok) {
        throw new Error(
          `Gagal mengambil pemasukan (${responsePemasukan.status}).`,
        );
      }

      if (!responsePengeluaran.ok) {
        throw new Error(
          `Gagal mengambil pengeluaran (${responsePengeluaran.status}).`,
        );
      }

      const [dataPemasukan, dataPengeluaran] = await Promise.all([
        responsePemasukan.json(),
        responsePengeluaran.json(),
      ]);

      if (!Array.isArray(dataPemasukan) || !Array.isArray(dataPengeluaran)) {
        throw new Error("Format respons API tidak sesuai.");
      }

      setPemasukan(dataPemasukan);
      setPengeluaran(dataPengeluaran);

      // TODO (backend): ambil modal awal tersimpan, lalu isi state-nya.
      const responseModal = await fetch(`${API_URL}/bendahara/modal`, { headers });
      if (responseModal.ok) {
        const dataModal = await responseModal.json();
        const nilai = Number(dataModal?.modalAwal) || 0;
        setModalAwal(nilai);
        setModalInput(nilai ? formatAngka(nilai) : "");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data keuangan.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const handleSimpanModal = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");
    setModalMessage("");

    if (modalInput.trim() === "") {
      setModalError("Masukkan nominal modal awal terlebih dahulu.");
      return;
    }

    const nilai = parseAngka(modalInput);

    try {
      setSavingModal(true);

      const token = await getToken();
      if (!token) throw new Error("Token autentikasi tidak tersedia.");
      const response = await fetch(`${API_URL}/bendahara/modal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modalAwal: nilai }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? `Gagal menyimpan modal (${response.status}).`);
      }

      setModalAwal(nilai);
      setModalInput(formatAngka(nilai));
      setModalMessage("Modal awal berhasil disimpan.");
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Gagal menyimpan modal awal.",
      );
    } finally {
      setSavingModal(false);
    }
  };

  const pemasukanHariIni = useMemo(
    () => pemasukan.filter((item) => isToday(item.tanggalPemasukan, now)),
    [pemasukan, now],
  );

  const pengeluaranHariIni = useMemo(
    () => pengeluaran.filter((item) => isToday(item.tanggalPengeluaran, now)),
    [pengeluaran, now],
  );

  const financialData = useMemo(() => {
    const totalPemasukan = pemasukanHariIni.reduce(
      (total, item) => total + Number(item.totalPemasukan),
      0,
    );

    const totalPengeluaran = pengeluaranHariIni.reduce(
      (total, item) => total + Number(item.totalPengeluaran),
      0,
    );

    const saldoOperasional = totalPemasukan - totalPengeluaran;
    const saldoAkhir = modalAwal + saldoOperasional;

    return {
      totalPemasukan,
      totalPengeluaran,
      saldoOperasional,
      saldoAkhir,
    };
  }, [pemasukanHariIni, pengeluaranHariIni, modalAwal]);

  const transactions = useMemo<Transaction[]>(() => {
    return pengeluaranHariIni
      .map((item): Transaction => ({
        id: `pengeluaran-${item.id}`,
        description: item.namaBarang,
        category: "Pengeluaran",
        date: formatTanggal(item.tanggalPengeluaran),
        timestamp: new Date(item.tanggalPengeluaran).getTime(),
        amount: Number(item.totalPengeluaran),
        type: "expense",
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [pengeluaranHariIni]);

  const namaBulan = now
    ? now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "";

  const maxPerbandingan = Math.max(
    financialData.totalPemasukan,
    financialData.totalPengeluaran,
  );

  const lebarPemasukan =
    maxPerbandingan === 0
      ? 0
      : (financialData.totalPemasukan / maxPerbandingan) * 100;

  const lebarPengeluaran =
    maxPerbandingan === 0
      ? 0
      : (financialData.totalPengeluaran / maxPerbandingan) * 100;

  const isSaldoPositif = financialData.saldoOperasional >= 0;

  // const getDatas = useCallback(async () => {

  //   try {
  //    const token = await getToken()
  //     const res = await fetch(`${API_URL}/bendahara/modal`, {
  //       headers: {
  //         authorization: `bearer${token}`,
  //         "content-type" : "application/json"
  //       }
  //     }) 

  //      const data: number = await res.json() 



  //   } catch (err: unknown) {
  //     if (err instanceof Error) {
  //       setError(err.message)
  //     }
  //   }



  // }, [getToken])



  return (
    <Suspense>
      <section className="w-full space-y-6 px-4 pb-24 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">
        {/* Header */}
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 p-5 shadow-sm shadow-sky-100/50 sm:rounded-3xl sm:p-8 dark:border-sky-900/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="shrink-0 text-sky-600 dark:text-sky-400" />
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  Dashboard Owner
                </h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Pantau modal, pengeluaran, dan saldo usaha.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-sky-200 bg-white/60 px-3 py-2 text-xs sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm dark:border-sky-900/30 dark:bg-slate-800/50">
              <CalendarDays size={16} className="text-sky-600 dark:text-sky-400" />
              <span className="capitalize text-slate-700 dark:text-slate-300">
                {namaBulan}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm shadow-rose-100/40 dark:border-rose-900/30 dark:bg-rose-900/10">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="rounded-lg border border-rose-200 px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {[
            {
              title: "Total Modal",
              value: formatRupiah(modalAwal),
              description: "Modal awal usaha",
              icon: Wallet,
              gradFrom: "from-sky-400",
              gradTo: "to-sky-600",
              text: "text-sky-600",
              bg: "bg-sky-50",
              darkText: "text-sky-400",
              darkBg: "dark:bg-sky-900/20",
            },
            {
              title: "Total Pemasukan",
              value: formatRupiah(financialData.totalPemasukan),
              description: "Hari ini",
              icon: TrendingUp,
              gradFrom: "from-emerald-400",
              gradTo: "to-emerald-600",
              text: "text-emerald-600",
              bg: "bg-emerald-50",
              darkText: "text-emerald-400",
              darkBg: "dark:bg-emerald-900/20",
            },
            {
              title: "Total Pengeluaran",
              value: formatRupiah(financialData.totalPengeluaran),
              description: "Hari ini",
              icon: TrendingDown,
              gradFrom: "from-rose-400",
              gradTo: "to-rose-600",
              text: "text-rose-600",
              bg: "bg-rose-50",
              darkText: "text-rose-400",
              darkBg: "dark:bg-rose-900/20",
            },
            {
              title: "Saldo Kas",
              value: formatRupiah(financialData.saldoAkhir),
              description: "Modal + pemasukan - pengeluaran",
              icon: ArrowLeftRight,
              gradFrom: isSaldoPositif ? "from-violet-400" : "from-amber-400",
              gradTo: isSaldoPositif ? "to-violet-600" : "to-amber-600",
              text: isSaldoPositif ? "text-violet-600" : "text-amber-600",
              bg: isSaldoPositif ? "bg-violet-50" : "bg-amber-50",
              darkText: isSaldoPositif ? "text-violet-400" : "text-amber-400",
              darkBg: isSaldoPositif
                ? "dark:bg-violet-900/20"
                : "dark:bg-amber-900/20",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.title}
                className={cn(
                  "min-w-0 rounded-2xl border border-sky-100 p-4 sm:p-6",
                  stat.bg,
                  "dark:border-sky-900/20 dark:bg-slate-900/30",
                  stat.darkBg,
                  "transition-all duration-200 hover:-translate-y-1",
                  "shadow-sm shadow-sky-50/40 dark:shadow-none",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "rounded-xl p-2.5 shadow-sm",
                      stat.gradFrom,
                      stat.gradTo,
                      "dark:shadow-none",
                    )}
                  >
                    <Icon size={18} strokeWidth={1.7} className="text-white" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      stat.text,
                      stat.darkText,
                    )}
                  >
                    {stat.title}
                  </span>
                </div>

                <h2 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  {loading ? "Memuat..." : stat.value}
                </h2>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {stat.description}
                </p>
              </article>
            );
          })}
        </div>

        {/* Input Modal Awal */}
        <article className="min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 dark:border-sky-900/20 dark:bg-slate-900/30">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Modal Awal
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Isi atau ubah modal awal usaha. Nilai ini dipakai untuk
                menghitung saldo kas.
              </p>
            </div>
            <Landmark size={20} className="shrink-0 text-sky-500" />
          </div>

          <form
            onSubmit={handleSimpanModal}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="modal-awal"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Nominal modal awal
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Rp
                </span>
                <input
                  id="modal-awal"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={modalInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setModalInput(digits ? formatAngka(Number(digits)) : "");
                    setModalError("");
                    setModalMessage("");
                  }}
                  disabled={savingModal}
                  className="w-full rounded-xl border border-sky-200 bg-white py-3 pl-10 pr-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 dark:border-sky-900/30 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingModal}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
            >
              {savingModal ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {savingModal ? "Menyimpan..." : "Simpan Modal"}
            </button>
          </form>

          {modalError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-300"
            >
              {modalError}
            </p>
          )}

          {modalMessage && (
            <p
              role="status"
              className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300"
            >
              {modalMessage}
            </p>
          )}
        </article>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[
            {
              label: "Pengeluaran",
              tab: "pengeluaran" as const,
              icon: Plus,
              classes:
                "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/20",
            },
            {
              label: "Konfirmasi",
              tab: "confirmOrder" as const,
              icon: ClipboardCheck,
              classes:
                "border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/20",
            },
            {
              label: "Order Kredit",
              tab: "orderKredit" as const,
              icon: CreditCard,
              classes:
                "border-sky-200 text-sky-600 hover:bg-sky-50 dark:border-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/20",
            },
            {
              label: "Gaji Karyawan",
              tab: "gajiKaryawan" as const,
              icon: Wallet,
              classes:
                "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/20",
            },
          ].map(({ label, tab, icon: Icon, classes }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex min-w-0 items-center justify-center gap-2 rounded-xl border bg-white p-3 text-xs font-medium shadow-sm transition-all hover:shadow-md sm:justify-start sm:p-4 sm:text-sm dark:bg-slate-900/30",
                classes,
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Ringkasan Keuangan */}
          <article className="min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:col-span-2 dark:border-sky-900/20 dark:bg-slate-900/30">
            <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center sm:gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Ringkasan Keuangan
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Perbandingan pemasukan dan pengeluaran hari ini.
                </p>
              </div>
              <Clock size={20} className="text-sky-400" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <ArrowUpRight size={16} className="text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Pemasukan
                  </span>
                </div>

                <p className="break-words text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  {loading
                    ? "Memuat..."
                    : formatRupiah(financialData.totalPemasukan)}
                </p>

                <div className="h-2 overflow-hidden rounded-full border border-sky-200 bg-sky-100 dark:border-sky-900/20 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full border-r border-emerald-300 bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${lebarPemasukan}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rose-100 p-2">
                    <ArrowDownRight size={16} className="text-rose-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Pengeluaran
                  </span>
                </div>

                <p className="break-words text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  {loading
                    ? "Memuat..."
                    : formatRupiah(financialData.totalPengeluaran)}
                </p>

                <div className="h-2 overflow-hidden rounded-full border border-sky-200 bg-sky-100 dark:border-sky-900/20 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full border-r border-rose-300 bg-gradient-to-r from-rose-400 to-rose-600"
                    style={{ width: `${lebarPengeluaran}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-sky-100 pt-6 dark:border-sky-900/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Selisih pemasukan dan pengeluaran
                  </p>
                  <p className="mt-1 break-words text-xl font-semibold text-slate-900 dark:text-white">
                    {loading
                      ? "Memuat..."
                      : formatRupiah(financialData.saldoOperasional)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full p-2 shadow-sm",
                    isSaldoPositif
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
                  )}
                >
                  {isSaldoPositif ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                </div>
              </div>
            </div>
          </article>

          {/* Ringkasan Kas */}
          <article className="min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 dark:border-sky-900/20 dark:bg-slate-900/30">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Ringkasan Kas
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Perhitungan saldo akhir usaha.
                </p>
              </div>
              <Wallet size={20} className="text-sky-500" />
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Modal awal
                </span>
                <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                  {formatRupiah(modalAwal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-sky-100 pt-4 dark:border-sky-900/20">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total pemasukan
                </span>
                <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                  {loading
                    ? "Memuat..."
                    : formatRupiah(financialData.totalPemasukan)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-sky-100 pt-4 dark:border-sky-900/20">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total pengeluaran
                </span>
                <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                  {loading
                    ? "Memuat..."
                    : formatRupiah(financialData.totalPengeluaran)}
                </span>
              </div>

              <div className="border-t border-sky-200 pt-4 dark:border-sky-900/20">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Saldo akhir
                  </span>
                  <span className="break-words text-right text-lg font-bold text-slate-900 dark:text-white">
                    {loading
                      ? "Memuat..."
                      : formatRupiah(financialData.saldoAkhir)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Modal awal + pemasukan - pengeluaran
                </p>
              </div>
            </div>
          </article>
        </div>

        {/* Transaksi Terbaru (hanya pengeluaran hari ini) */}
        <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm sm:rounded-3xl dark:border-sky-900/20 dark:bg-slate-900/30">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <ReceiptText size={18} className="text-sky-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Transaksi Terbaru
                </h2>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Pengeluaran hari ini.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-sky-100 bg-sky-50 dark:border-sky-900/20 dark:bg-slate-900/40">
                  <th className="hidden px-4 py-3 font-medium text-slate-700 md:table-cell md:px-5 md:py-4 dark:text-slate-300">
                    ID Transaksi
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700 md:px-5 md:py-4 dark:text-slate-300">
                    Keterangan
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700 md:px-5 md:py-4 dark:text-slate-300">
                    Kategori
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700 md:px-5 md:py-4 dark:text-slate-300">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700 md:px-5 md:py-4 dark:text-slate-300">
                    Nominal
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center md:px-5">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600 dark:border-sky-400" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Memuat transaksi...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center md:px-5">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-sky-100 p-3">
                          <ReceiptText size={24} className="text-sky-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Belum ada transaksi.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Belum ada pengeluaran hari ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-sky-50 transition-colors last:border-0 hover:bg-sky-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell md:px-5 md:py-4 dark:text-slate-400">
                        {transaction.id}
                      </td>

                      <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-900 sm:max-w-none md:px-5 md:py-4 dark:text-white">
                        {transaction.description}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 md:px-5 md:py-4">
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium",
                            transaction.type === "income"
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-400"
                              : "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/20 dark:bg-rose-900/10 dark:text-rose-400",
                          )}
                        >
                          {transaction.category}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 md:px-5 md:py-4 dark:text-slate-400">
                        {transaction.date}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium md:px-5 md:py-4">
                        <span
                          className={cn(
                            transaction.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                        </span>{" "}
                        {formatRupiah(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </Suspense>
  );
}