type ReviewStatus = "PENDING" | "APPROVED" ;
type FilterStatus = ReviewStatus ;
type OrderItem = {
    id: string;
    namaBarang: string;
    namaSupplier: string | null;
    jumlahBarang: number;
    hargaBarang: number;
    potonganHarga: number;
    totalHarga: number | null;
    catatanBarang: string | null;
    catatanPelanggan: string | null;
};

type Order = {
    id: string;
    namaPelanggan: string | null;
    createdAt: string;
    totalHarga: number;
    bendaharaStatus: ReviewStatus;
    orderItems: OrderItem[];
};

type OrderRow = Order & {
    suppliers: string;
    customerNotes: string[];
    searchText: string;
};


export type {
    OrderRow,
    Order,
    OrderItem,
    FilterStatus,
    ReviewStatus
}