export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpOption<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  token?: string | null;
}

export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface ApiEnvelope<TData> {
  success?: boolean;
  data?: TData;
  message?: string;
  statusCode?: number;
}

export interface PageMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface Paginated<TData> {
  data: TData[];
  meta?: PageMeta;
}
