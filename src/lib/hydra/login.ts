import "server-only";

import { getOptionalEnv, stripTrailingSlash } from "@/lib/env";

import type {
  HydraLoginAcceptResponse,
  HydraLoginRequest,
} from "./types";

const DEFAULT_HYDRA_ADMIN_URL = "http://127.0.0.1:4445";

type AcceptLoginInput = {
  context?: Record<string, unknown>;
  remember?: boolean;
  rememberForSeconds?: number;
  subject: string;
};

export class HydraRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HydraRequestError";
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
    : `Hydra admin request failed with status ${status}.`;
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
    throw new HydraRequestError(
      response.status,
      readHydraErrorMessage(body, response.status),
    );
  }

  return (await response.json()) as T;
}

export async function getLoginRequest(
  loginChallenge: string,
): Promise<HydraLoginRequest> {
  const params = new URLSearchParams({ login_challenge: loginChallenge });
  return hydraJson<HydraLoginRequest>(
    `/admin/oauth2/auth/requests/login?${params.toString()}`,
  );
}

export async function acceptLoginRequest(
  loginChallenge: string,
  input: AcceptLoginInput,
): Promise<HydraLoginAcceptResponse> {
  const params = new URLSearchParams({ login_challenge: loginChallenge });

  return hydraJson<HydraLoginAcceptResponse>(
    `/admin/oauth2/auth/requests/login/accept?${params.toString()}`,
    {
      body: JSON.stringify({
        context: input.context ?? {},
        remember: input.remember ?? true,
        remember_for: input.rememberForSeconds,
        subject: input.subject,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}
