"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { ChevronDown, ChevronRight, Menu, Moon, Sun } from "lucide-react";
import { FaFolderMinus } from "react-icons/fa";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTabStore } from "@/store/useTabstoreOwner";
import { tabKeyOwner, TabKeyOwner } from "@/store/tabKeyOwner";
import { menuGroups } from "@/constant/menuOwner";
import { navItems } from "@/data/content";
import useTheme from "@/hooks/useTheme";
import { formatTanggalIndonesia } from "@/utils/formatterDate";
import { cn } from "@/utils";
import type { dataUser } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function BottomNav() {
  const activeTab = useTabStore((state) => state.activeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);

  const { user } = useUser();
  const { getToken } = useAuth();
  const { ThemeToggle, isDark } = useTheme();

  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [profile, setProfile] = useState<dataUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());

    if (!BACKEND_URL) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(`${BACKEND_URL}/users/getProfile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Gagal mengambil data user (${res.status}).`);
        }

        const data = (await res.json()) as dataUser;
        if (!cancelled) setProfile(data);
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = isDark ? "bg-black text-white" : "bg-white text-black";
  const displayName = profile?.name ?? user?.fullName ?? "Memuat...";

  const closeMenu = () => {
    setOpen(false);
    setOpenMenu(null);
  };

  return (
    <div className={cn("flex min-h-dvh flex-col", theme)}>
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-40 flex items-center gap-3",
          "px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
          "text-white shadow-md",
          "bg-gradient-to-br from-sky-950 via-sky-700 to-sky-500",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10 active:scale-95"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs capitalize opacity-90">
            {now ? formatTanggalIndonesia(now) : ""}
          </p>
          <h1 className="truncate font-semibold">{displayName}</h1>
        </div>

        <button
          type="button"
          onClick={ThemeToggle}
          aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <span
            key={isDark ? "dark" : "light"}
            className="animate-in spin-in-90 zoom-in-75 duration-300"
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </span>
          <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
        </button>
      </header>

      {/* Konten halaman: ruang bawah menyesuaikan tinggi bottom nav + safe area */}
      <main className={cn("w-full flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]", theme)}>
        {tabKeyOwner[activeTab as TabKeyOwner]}
      </main>

      {/* Menu samping */}
      <Sheet open={open} onOpenChange={(value) => (value ? setOpen(true) : closeMenu())}>
        <SheetContent
          side="left"
          className={cn(
            "h-dvh w-72 max-w-[85vw]",
            "overflow-y-auto scrollbar-none",
            "p-0 text-white",
            "bg-gradient-to-br from-sky-950 via-sky-700 to-sky-500",
          )}
        >
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <SheetTitle
              className={cn(
                "mb-4 flex items-center justify-center",
                "border-b-2 border-white pb-4",
                "text-lg font-bold text-white",
              )}
            >
              Menu Utama
            </SheetTitle>

            <button
              type="button"
              className="mt-2 flex w-full items-center gap-2 rounded px-2 py-2.5 hover:bg-white/10"
              onClick={() => {
                setActiveTab("home");
                closeMenu();
              }}
            >
              <FaFolderMinus size={18} />
              Dashboard
            </button>

            <div className="mt-2">
              {menuGroups.map((group) => {
                const Icon = group.icon;
                const isOpen = openMenu === group.id;

                return (
                  <div key={group.id} className="mt-1">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenMenu(isOpen ? null : group.id)}
                      className="flex w-full items-center justify-between rounded px-2 py-2.5 text-left hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={18} />
                        <span>{group.label}</span>
                      </span>
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {isOpen && (
                      <div className="ml-6 mt-1 space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-white/10"
                            onClick={() => {
                              setActiveTab(item.tab);
                              closeMenu();
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom navigation */}
      <nav
        aria-label="Navigasi utama"
        className={cn(
          "fixed inset-x-2 z-50 mx-auto w-auto max-w-md sm:max-w-lg",
          "bottom-[max(0.5rem,env(safe-area-inset-bottom))]",
          "grid auto-cols-fr grid-flow-col gap-1 rounded-2xl border p-1.5",
          "shadow-lg backdrop-blur-md",
          isDark
            ? "border-sky-900/40 bg-slate-950/85"
            : "border-sky-200 bg-white/90",
        )}
      >
        {navItems.map(({ key, label, icon }) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1",
                "rounded-xl px-1 py-1.5",
                "text-[10px] font-medium leading-none sm:text-xs",
                "transition-colors duration-200 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                isActive
                  ? isDark
                    ? "bg-sky-900/30 text-sky-400"
                    : "bg-sky-50 text-sky-600"
                  : isDark
                    ? "text-slate-400 hover:bg-sky-900/20 hover:text-sky-400"
                    : "text-slate-500 hover:bg-sky-50 hover:text-sky-600",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-9 items-center justify-center rounded-full sm:h-8 sm:w-10",
                  isActive
                    ? "bg-sky-500 text-white"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-600",
                )}
              >
                {icon}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}