import "server-only";

import { getOptionalEnv, stripTrailingSlash } from "@/lib/env";

const DEFAULT_HYDRA_ADMIN_URL = "http://127.0.0.1:4445";

export type HydraLogoutAcceptResponse = {
  redirect_to: string;
};

export class HydraLogoutRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HydraLogoutRequestError";
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
    throw new HydraLogoutRequestError(
      response.status,
      readHydraErrorMessage(body, response.status),
    );
  }

  return (await response.json()) as T;
}

export async function acceptLogoutRequest(
  logoutChallenge: string,
): Promise<HydraLogoutAcceptResponse> {
  const params = new URLSearchParams({ logout_challenge: logoutChallenge });
  return hydraJson<HydraLogoutAcceptResponse>(
    `/admin/oauth2/auth/requests/logout/accept?${params.toString()}`,
    { method: "PUT" },
  );
}
