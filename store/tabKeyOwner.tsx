import Home from "@/components/layoutOwner/home";
import Pengeluaran from "@/components/layoutOwner/pengeluaran";
import GajiKaryawan from "@/components/layoutOwner/gajiKaryawan";
import OrderKredit from "@/components/layoutOwner/orderKredit";
import ConfirmOrder from "@/components/layoutOwner/confirmOrder";
import CreateReseller from "@/components/layoutOwner/createReseller";
import Resellers from "@/components/layoutOwner/resellers";

export const tabKeyOwner = {
    home: <Home />,
    pengeluaran: <Pengeluaran/>,
    gajiKaryawan: <GajiKaryawan />,
    orderKredit: <OrderKredit />,
    confirmOrder: <ConfirmOrder />,
    createReseller: <CreateReseller />,
    resellers: <Resellers />


} as const;

export type TabKeyOwner = keyof typeof tabKeyOwner;
