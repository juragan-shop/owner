import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

type QueryKeyLike = UseQueryOptions<unknown, Error, unknown>["queryKey"];

export type GetFetchParams<TData> = Omit<
  UseQueryOptions<TData, Error, TData>,
  "queryKey" | "queryFn"
> & {
  func: () => Promise<TData>;
  queryKey?: readonly unknown[];
  nameQuery?: readonly unknown[];
};

export function GetFetch<TData>({
  func,
  queryKey,
  nameQuery,
  ...options
}: GetFetchParams<TData>): UseQueryResult<TData, Error> {
  return useQuery<TData, Error, TData>({
    ...options,
    queryKey: (queryKey ?? nameQuery ?? []) as QueryKeyLike,
    queryFn: func,
  });
}

export const useGetFetch = GetFetch;

export default GetFetch;
