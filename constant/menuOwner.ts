
import { TabKeyOwner } from "@/store/tabKeyOwner";
import { List, LucideIcon, ShoppingBag, User } from "lucide-react";

type menuType = {
    id: string
    label: string
    icon: LucideIcon,
    items: {
        label: string,
        tab: TabKeyOwner
    }[]
}
export const menuGroups: menuType[] = [
    {
        id: "Order",
        label: "Order",
        icon: List,
        items: [
            { label: "Daftar Orderan", tab: "home" },
            { label: "Order Kredit", tab: "orderKredit" },
            { label: "Konfirmasi Order", tab: "confirmOrder" },

        ]
    },
    {
        id: "Eceran",
        label: "Eceran",
        icon: ShoppingBag,
        items: [
            { label: "Buat Reseller", tab: "createReseller" },
            { label: "Daftar Reseller", tab: "resellers" },

        ]
    },
    {
        id: "Keuangan",
        label: "Keuangan",
        icon: User,
        items: [
            { label: "Gaji Karyawan", tab: "gajiKaryawan" },

        ]
    }
]
