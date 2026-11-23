interface GajiKaryawan {
  id: string;
  namaKaryawan: string;
  utangPiutang: bigint | null;
  gaji: bigint | null;
  tanggalPembayaran: string;
  pembaruanTanggal: string;
}

interface PrismaGajiKaryawan {
  id: string;
  namaKaryawan: string;
  utangPiutang: string | null;
  gaji: string | null;
  tanggalPembayaran: string;
  pembaruanTanggal: string;
}

interface FormGaji {
  namaKaryawan: string;
  utangPiutang: string;
  gaji: string;
  tanggalPembayaran: string;
}


export type {
    FormGaji,
    PrismaGajiKaryawan,
    GajiKaryawan
}