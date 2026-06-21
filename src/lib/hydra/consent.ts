import "server-only";

import { getOptionalEnv, stripTrailingSlash } from "@/lib/env";

import type {
  HydraConsentAcceptResponse,
  HydraConsentRejectResponse,
  HydraConsentRequest,
} from "./types";

const DEFAULT_HYDRA_ADMIN_URL = "http://127.0.0.1:4445";

type AcceptConsentInput = {
  grantAccessTokenAudience?: string[];
  grantScope: string[];
  remember?: boolean;
  rememberForSeconds?: number;
  session?: {
    access_token?: Record<string, unknown>;
    id_token?: Record<string, unknown>;
  };
};

type RejectConsentInput = {
  error?: string;
  errorDescription?: string;
  statusCode?: number;
};

export class HydraConsentError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HydraConsentError";
  }
}

function getHydraAdminUrl(): string {
  return stripTrailingSlash(
    getOptionalEnv("HYDRA_ADMIN_URL") ?? DEFAULT_HYDRA_ADMIN_URL,
  );
}

async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function readHydraErrorMessage(
  body: Record<string, unknown> | null,
  status: number,
): string {
  const message = body?.error_description ?? body?.error ?? body?.message;
  return typeof message === "string" && message.trim()
    ? message
    : `Hydra consent request failed with status ${status}.`;
}

async function hydraJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getHydraAdminUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await readJsonObject(response);
    throw new HydraConsentError(
      response.status,
      readHydraErrorMessage(body, response.status),
    );
  }

  return (await response.json()) as T;
}

export async function getConsentRequest(
  consentChallenge: string,
): Promise<HydraConsentRequest> {
  const params = new URLSearchParams({ challenge: consentChallenge });
  return hydraJson<HydraConsentRequest>(
    `/admin/oauth2/auth/requests/consent?${params.toString()}`,
  );
}

export async function acceptConsentRequest(
  consentChallenge: string,
  input: AcceptConsentInput,
): Promise<HydraConsentAcceptResponse> {
  const params = new URLSearchParams({ challenge: consentChallenge });

  return hydraJson<HydraConsentAcceptResponse>(
    `/admin/oauth2/auth/requests/consent/accept?${params.toString()}`,
    {
      body: JSON.stringify({
        grant_access_token_audience: input.grantAccessTokenAudience ?? [],
        grant_scope: input.grantScope,
        remember: input.remember ?? true,
        remember_for: input.rememberForSeconds,
        session: input.session ?? { access_token: {}, id_token: {} },
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

export async function rejectConsentRequest(
  consentChallenge: string,
  input: RejectConsentInput = {},
): Promise<HydraConsentRejectResponse> {
  const params = new URLSearchParams({ challenge: consentChallenge });

  return hydraJson<HydraConsentRejectResponse>(
    `/admin/oauth2/auth/requests/consent/reject?${params.toString()}`,
    {
      body: JSON.stringify({
        error: input.error ?? "access_denied",
        error_description:
          input.errorDescription ?? "The user denied the requested access.",
        status_code: input.statusCode ?? 403,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}
