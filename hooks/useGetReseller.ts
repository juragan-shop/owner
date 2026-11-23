"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";

import GetFetch from "@/hooks/useGetFetch";
import { useResellerStore } from "@/store/useResellerStore";
import type { Reseller } from "@/types/reseller";
import {
  extractResellerError,
  extractResellerList,
  normalizeResellers,
} from "@/utils/reseller";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";

type TokenGetter = () => Promise<string | null>;

const fetchResellers = async (getToken: TokenGetter): Promise<Reseller[]> => {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL belum dikonfigurasi.");
  }

  const token = await getToken();
  if (!token) throw new Error("Token autentikasi tidak tersedia.");

  const response = await fetch(`${API_URL}/owner/getReseller`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data reseller (${response.status}).`);
  }

  const payload: unknown = await response.json();
  const apiError = extractResellerError(payload);
  if (apiError) throw new Error(apiError);
  if (!extractResellerList(payload)) {
    throw new Error("Format respons API reseller tidak dikenal.");
  }

  return normalizeResellers(payload);
};

export function useGetReseller() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const localResellers = useResellerStore((state) => state.localResellers);
  const overrides = useResellerStore((state) => state.overrides);
  const syncOwner = useResellerStore((state) => state.syncOwner);

  const query = GetFetch<Reseller[]>({
    queryKey: ["owner", "getReseller", userId ?? "anon"],
    func: () => fetchResellers(getToken),
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    syncOwner(isSignedIn ? (userId ?? null) : null);
  }, [isSignedIn, userId, syncOwner]);

  const resellers = useMemo(() => {
    const server = (query.data ?? []).map((item) => ({
      ...item,
      ...(overrides[item.id] ?? {}),
    }));
    return [...localResellers, ...server];
  }, [query.data, overrides, localResellers]);

  return {
    resellers,
    loading: query.isPending && query.isFetching,
    error: query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Gagal memuat data reseller."
      : "",
    refetch: () => void query.refetch(),
  };
}
