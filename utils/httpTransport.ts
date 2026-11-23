import type { HttpOption } from "@/types7";

export type {
  HttpMethod,
  HttpOption,
  ApiErrorPayload,
  ApiEnvelope,
  PageMeta,
  Paginated,
} from "@/types7";

export class HttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.payload = payload;
  }
}

const flattenMessage = (payload: unknown): string => {
  if (typeof payload === "string") return payload;
  if (payload === null || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const message = record.message;

  if (Array.isArray(message)) {
    return message
      .filter((part): part is string => typeof part === "string")
      .join(", ");
  }
  if (typeof message === "string") return message;
  if (typeof record.error === "string") return record.error;

  return "";
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export async function HttpTransport<TResponse, TBody = unknown>(
  url: string,
  options: HttpOption<TBody> = {},
): Promise<TResponse> {
  const { method = "GET", body, headers, signal, cache, token } = options;

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache,
  });

  const payload = await parseBody(response);

  if (!response.ok) {
    const message =
      flattenMessage(payload) || `Permintaan gagal (${response.status}).`;
    throw new HttpError(message, response.status, payload);
  }

  return payload as TResponse;
}

type BaseOption = Omit<HttpOption, "method" | "body">;

export const httpGet = <TResponse>(url: string, options: BaseOption = {}) =>
  HttpTransport<TResponse>(url, { ...options, method: "GET" });

export const httpPost = <TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options: Omit<HttpOption<TBody>, "method" | "body"> = {},
) => HttpTransport<TResponse, TBody>(url, { ...options, method: "POST", body });

export const httpPut = <TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options: Omit<HttpOption<TBody>, "method" | "body"> = {},
) => HttpTransport<TResponse, TBody>(url, { ...options, method: "PUT", body });

export const httpPatch = <TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options: Omit<HttpOption<TBody>, "method" | "body"> = {},
) => HttpTransport<TResponse, TBody>(url, { ...options, method: "PATCH", body });

export const httpDelete = <TResponse>(url: string, options: BaseOption = {}) =>
  HttpTransport<TResponse>(url, { ...options, method: "DELETE" });

export default HttpTransport;
