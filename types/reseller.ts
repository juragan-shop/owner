export interface ResellerItem {
  productName: string;
  productQuantity: number;
}

export interface Reseller {
  id: string;
  name: string;
  items: ResellerItem[];
  totalHarga: number;
  uangKembali: number;
}

export type  ResellerPatch = Partial<Pick<Reseller, "totalHarga" | "uangKembali">>;
