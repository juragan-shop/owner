import { FormGaji } from "@/types/gajiKaryawan";

const initialForm: FormGaji = {
  namaKaryawan: "",
  utangPiutang: "",
  gaji: "",
  tanggalPembayaran: new Date().toISOString().split("T")[0],
};

function formatTanggal(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


export  {
    formatTanggal,
    initialForm
}