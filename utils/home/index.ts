const formatRupiah = (value: number | string) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

// Format angka dengan titik ribuan untuk isi input (contoh: 1.500.000)
const formatAngka = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

const parseAngka = (value: string) => Number(value.replace(/\D/g, "")) || 0;

const formatTanggal = (date: string) => {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Cek apakah tanggal jatuh di hari yang sama dengan hari ini
const isToday = (date: string | undefined | null, ref: Date | null) => {
  if (!date || !ref) return false;
  const d = new Date(date);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};


export {isToday, formatAngka, formatTanggal, formatRupiah, parseAngka}