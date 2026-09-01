// Host API HTTP client helpers for dsh-gemini-oauth

import { API_PATH } from "../common/constants";
import type { ApiResponse } from "../common/types";

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PATH}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
  });
  const body = (await response.json().catch(() => ({ ok: false, error: "invalid-json" }))) as ApiResponse<T>;
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body.value as T;
}

export async function netFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PATH}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
  });
  if (response.status === 404) {
    throw { __netHostStale: true };
  }
  const body = (await response.json().catch(() => ({ ok: false, error: "invalid-json" }))) as ApiResponse<T>;
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body.value as T;
}
