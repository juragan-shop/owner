interface Pemasukan {
  id: string;
  namaBarang: string;
  hargaBarang: string;
  jumlahBarang: string;
  totalPemasukan: string;
  tanggalPemasukan: string;
  tanggalPembaruan: string;
}

interface Pengeluaran {
  id: string;
  namaBarang: string;
  hargaBarang: string;
  jumlahBarang: string;
  totalPengeluaran: string;
  tanggalPengeluaran: string;
  tanggalPembaruan: string;
}

interface Transaction {
  id: string;
  description: string;
  category: "Pemasukan" | "Pengeluaran";
  date: string;
  timestamp: number;
  amount: number;
  type: "income" | "expense";
}

interface OrderItem {
  id: string;
  namaBarang: string;
  namaSupplier: string | null;
  potonganHarga: string | number | null;
  catatanBarang: string | null;
  jumlahBarang: string | number;
  hargaBarang: string | number | null;
  catatanPelanggan: string | null;
  totalHarga: string | number | null;
  jenisPembayaran: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierGroup {
  namaSupplier: string;
  items: OrderItem[];
  total: number;
}


export type { Transaction, Pengeluaran, Pemasukan, OrderItem, SupplierGroup }

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