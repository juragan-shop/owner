import type { Reseller, ResellerItem } from "@/types/reseller";

const toText = (value: unknown): string =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const first = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const extractResellerList = (payload: unknown): unknown[] | null => {
  if (Array.isArray(payload)) return payload;

  const root = asRecord(payload);
  for (const key of ["data", "resellers", "items", "rows", "result"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }

  return null;
};

export const extractResellerError = (payload: unknown): string => {
  const root = asRecord(payload);
  if (root.success === false || Number(root.statusCode) >= 400) {
    const message = toText(first(root, ["message", "error", "pesan"]));
    return message || "Respons API reseller tidak berhasil.";
  }
  return "";
};

const normalizeItems = (value: unknown): ResellerItem[] => {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(asRecord(value).items)
      ? (asRecord(value).items as unknown[])
      : [];
  if (list.length === 0) return [];

  return list.map((raw, index) => {
    const item = asRecord(raw);
    return {
      productName:
        toText(first(item, ["productName", "namaBarang", "namaProduk", "name"])) ||
        `Item ${index + 1}`,
      productQuantity: Math.max(
        1,
        Math.round(
          toNumber(first(item, ["productQuantity", "jumlahBarang", "quantity", "qty"])),
        ) || 1,
      ),
    };
  });
};

export const normalizeResellers = (payload: unknown): Reseller[] => {
  const list = extractResellerList(payload) ?? [];

  return list.map((raw, index) => {
    const entry = asRecord(raw);
    return {
      id: toText(first(entry, ["id", "uuid", "clerkId"])) || `reseller-${index}`,
      name: toText(first(entry, ["name", "nama", "namaReseller"])) || "Reseller",
      items: normalizeItems(first(entry, ["items", "productItems", "resellerItems"])),
      totalHarga: toNumber(first(entry, ["totalHarga", "total"])),
      uangKembali: toNumber(
        first(entry, ["uangKembali", "uangkembali", "uangKembalian", "kembalian"]),
      ),
    };
  });
};
