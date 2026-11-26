# Catatan Perubahan — Profit & Pembayaran di Update Reseller

Tanggal: 2026-11-26

Tujuan: menambahkan `profitOwner` / `profitReseller` (input manual rupiah) ke
fitur update transaksi reseller, dan mengubah input utang menjadi **uang yang
dibayarkan** yang akan dikurangkan backend dari sisa utang.

---

## Kontrak API yang dipakai

`PATCH /owner/updateReseller` (Bearer token Clerk). Body yang dikirim:

```json
{
  "id": "string",
  "bayar": 50000,
  "profitOwner": 20000,
  "profitReseller": 30000
}
```

- `bayar` = uang yang dibayarkan reseller, bilangan bulat `>= 0` dan
  **tidak boleh lebih dari sisa utang**; backend menolak dengan `400`
  (`BadRequestException`) bila terlanggar. `bayar === sisa` diperbolehkan
  (transaksi menjadi lunas).
- Backend menghitung `sisaUtang = sisaUtang saat ini - bayar`.
- `profitOwner` / `profitReseller` = angka rupiah manual, bilangan bulat `>= 0`,
  tidak ada aturan persentase atau jumlah 100%.
- `GET /owner/getResellerTransactions` mengembalikan kedua profit sebagai
  string (field BigInt dikonversi di `serializeReseller`).

---

## File frontend diubah

### `components/layoutOwner/resellers.tsx`

- `ResellerTransaction`: tambah `profitOwner` dan `profitReseller`
  (`string | null`). `TransactionPatch` dipakai untuk memperbarui tiga field
  (`sisaUtang`, `profitOwner`, `profitReseller`) sekaligus di layar.
- Input profit **manual saja**: toggle persentase, konversi rupiah ↔ persen,
  dan preview persentase dihapus. Dua input "Profit owner" dan
  "Profit reseller" memakai awalan `Rp`, diisi dari nilai tersimpan.
- Input "Sisa utang" diganti **"Uang dibayar"** (`bayar`). Bila `bayar > sisa`,
  tampil pesan error merah "Tidak boleh lebih dari sisa utang (…)" dan tombol
  simpan dinonaktifkan; `save()` juga memblokir sebagai pengaman kedua.
- `save()` mengirim `{ id, bayar, profitOwner, profitReseller }`. Setelah sukses,
  `sisaUtang` diambil dari `response.data.sisaUtang` (fallback lokal
  `sisa - bayar`), input bayar dikosongkan, dan pesan disesuaikan
  ("Ditandai lunas.", "Pembayaran dicatat.", atau "Profit diperbarui.").
- "Tandai lunas" mengirim `bayar = sisa` saat ini (bukan `0` lagi).
- Tombol dinonaktifkan bila tidak ada bayar/profit berubah, profit invalid,
  atau bayar melebihi sisa utang.
- Teks header diperbarui menjadi "melihat barang, mencatat pembayaran, dan
  membagi profit."

### `utils/httpTransport.ts`

- Import `@/types7` (typo, modul tidak ada) diperbaiki menjadi `@/types`;
  sebelumnya `tsc` gagal dengan TS2307.

---

## File backend yang diubah

Hanya modul `backend-fish/src/owner`:

- `dto/updateReseller.ts` — `sisaUtang?` diganti `bayar?`
  (`@IsOptional @Type(() => Number) @IsInt @Min(0)`); `profitOwner?` dan
  `profitReseller?` sudah ada.
- `types/reseller.ts` — `ResellerResponse` ditambah `profitOwner` dan
  `profitReseller` bertipe `string | null`.
- `repository/ownerRepository.ts` — `serializeReseller()` mengonversi kedua
  profit ke string; `updateReseller()` membangun `data` profit bila ada dan,
  bila `bayar` ada, mengambil `sisaUtang` saat ini, menolak `bayar > sisa`
  dengan `BadRequestException`, lalu menyimpan `sisa - bayar`. `controller`/
  `service` tidak berubah.
- `owner.service.spec.ts` — typo import `REPO_OWNER` diperbaiki menjadi
  `OWNER_REPO` (sesuai ekspor di `ports/ownerRepoPort.ts`), agar `tsc` bersih.
- `owner.controller.spec.ts` — body update pada spec diganti dari
  `sisaUtang: 5000` menjadi `bayar: 5000` mengikuti DTO baru.

---

## Verifikasi

Frontend (`owner`):

- `npx tsc --noEmit --incremental false` — bersih.
- `npm run lint` — 0 error; 5 warning lama di `orderKredit.tsx` (variabel
  tidak terpakai) tidak termasuk perubahan ini.

Backend (`backend-fish`):

- `npx tsc --noEmit --incremental false -p tsconfig.build.json` — bersih.
- `npx tsc --noEmit --incremental false` — bersih.
