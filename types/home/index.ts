interface OwnerStats {
  totalPenjualan: number;
  totalOrder: number;
  totalProfit: number;
  totalKaryawan: number;
}

interface RecentTransaction {
  id: string;
  namaBarang: string;
  jumlah: number;
  total: number;
  status: string;
  tanggal: string;
}

export type { OwnerStats, RecentTransaction }
