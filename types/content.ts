
export interface Order {
  id: string;
  namaBarang: string;
  catatanBarang?: string | null;
  jumlahBarang?: string | number;
  catatanPelanggan?: string | null
  hargaBarang?: string | null;
  totalHarga?: string | null;
}



export interface dataUser {
  name: string
  alamat: string
  latitude: number
  longitude: number
}


export type Decision = "APPROVED" | "REJECTED";


