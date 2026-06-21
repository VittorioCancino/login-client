import "server-only";

import { getOptionalEnv, getRequiredEnv, stripTrailingSlash } from "@/lib/env";

const DEFAULT_HYDRA_PUBLIC_URL = "http://127.0.0.1:4444";

type ClientCredentialsTokenResponse = {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type: string;
};

export class HydraTokenError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HydraTokenError";
  }
}

function getHydraPublicUrl(): string {
  return stripTrailingSlash(
    getOptionalEnv("HYDRA_PUBLIC_URL") ?? DEFAULT_HYDRA_PUBLIC_URL,
  );
}

function getClientCredentialsBasicAuth(): string {
  const clientId = getRequiredEnv("LOGIN_SERVER_CLIENT_ID");
  const clientSecret = getRequiredEnv("LOGIN_SERVER_CLIENT_SECRET");
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function readHydraTokenError(
  payload: Record<string, unknown> | null,
  status: number,
): string {
  const message = payload?.error_description ?? payload?.error ?? payload?.message;
  return typeof message === "string" && message.trim()
    ? message
    : `Hydra token request failed with status ${status}.`;
}

export async function getResourceServerAccessToken(): Promise<string> {
  const audience = getRequiredEnv("RESOURCE_SERVER_AUDIENCE");
  const scope = getRequiredEnv("RESOURCE_SERVER_LOGIN_SCOPE");
  const body = new URLSearchParams({
    audience,
    grant_type: "client_credentials",
    scope,
  });

  const response = await fetch(`${getHydraPublicUrl()}/oauth2/token`, {
    body: body.toString(),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${getClientCredentialsBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const payload = await readJsonObject(response);

  if (!response.ok) {
    throw new HydraTokenError(
      response.status,
      readHydraTokenError(payload, response.status),
    );
  }

  const accessToken = payload?.access_token;
  const tokenType = payload?.token_type;

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new HydraTokenError(
      response.status,
      "Hydra token response did not include an access token.",
    );
  }

  if (typeof tokenType === "string" && tokenType.toLowerCase() !== "bearer") {
    throw new HydraTokenError(
      response.status,
      `Hydra token response returned unsupported token type ${tokenType}.`,
    );
  }

  return (payload as ClientCredentialsTokenResponse).access_token;
}
