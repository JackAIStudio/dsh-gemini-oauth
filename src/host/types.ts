// Host-specific types for dsh-gemini-oauth

import type { Server } from "node:http";
import type { AccountRecord, ModelDescriptor } from "../common/types";

export interface LoginSession {
  state: string;
  verifier: string;
  server: Server;
  authUrl: string;
  status: "pending" | "complete" | "error";
  error?: string;
}

export interface EgressInfo {
  ip: string;
  country?: string;
  city?: string;
  org?: string;
}

export interface ClientCredentialsConfig {
  clientId: string;
  clientSecret: string;
}

export interface FetchJsonResult<T = any> {
  status: number;
  ok: boolean;
  json?: T;
  text: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface ModelConfigData {
  enabledModelIds?: string[];
}

export interface CatalogCache {
  list: ModelDescriptor[];
  expiresAt: number;
}
