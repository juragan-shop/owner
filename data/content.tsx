
import {
  FaHome,
  FaUser,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

export const navItems = [
  {
    key: "home",
    label: "Beranda",
    icon: <FaHome size={17} />,
  },
  // {
  //   key: "pengeluaran",
  //   label: "Pengeluaran",
  //   icon: <FaArrowUp size={17} />,
  // },
  {
    key: "gajiKaryawan",
    label: "Gaji Karyawan",
    icon: <FaUser size={17} />,
  },
  // {
  //   key: "confirmOrder",
  //   label: "Konfirmasi Pesanan",
  //   icon: <FaClipboardCheck size={17} />,
  // },
  // {
  //   key: "orderKredit",
  //   label: "Pesanan Kredit",
  //   icon: <FaCreditCard size={17} />,
  // },
  {
    key: "createReseller",
    label: "Buat Reseller",
    icon: <FaUserPlus size={17} />,
  },
  {
    key: "resellers",
    label: "Daftar Reseller",
    icon: <FaUsers size={17} />,
  },
] as const;