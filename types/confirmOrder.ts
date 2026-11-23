type BendaharaStatus = "PENDING" | "DITERIMA" | "DITOLAK" | string;

interface ConfirmOrderItem {
    id: string;
    namaBarang: string;
    namaSupplier: string | null;
    jumlahBarang: string | number;
    hargaBarang: string | number | null;
    totalHarga: string | number | null;
    catatanBarang: string | null;
    catatanPelanggan: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ConfirmOrders {
    id: string;
    namaSupplier: string | null;
    catatanPelanggan: string | null;
    bendaharaStatus: BendaharaStatus;
    createdAt: string;
    updatedAt: string;
    orderItems: ConfirmOrderItem[];
}


export type {ConfirmOrders, ConfirmOrderItem, BendaharaStatus}