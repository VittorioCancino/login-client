import "server-only";

import {
  getOptionalEnv,
  getRequiredEnv,
  joinUrl,
  stripTrailingSlash,
} from "@/lib/env";
import { getResourceServerAccessToken } from "@/lib/hydra/token";

type ResourceCredentials = {
  identifier: string;
  password: string;
};

export type AuthenticatedResourceUser = {
  context: Record<string, unknown>;
  subject: string;
};

type UnknownRecord = Record<string, unknown>;

const DEFAULT_LOGIN_PATH = "/auth/login";
const DEFAULT_IDENTIFIER_FIELD = "email";
const DEFAULT_PASSWORD_FIELD = "password";
const DEFAULT_SUBJECT_FIELDS = ["subject", "sub", "id", "user_id", "userId"];

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid resource server credentials.");
    this.name = "InvalidCredentialsError";
  }
}

export class ResourceServerError extends Error {
  constructor(
    public readonly status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ResourceServerError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getResourceLoginUrl(): string {
  const explicitUrl = getOptionalEnv("RESOURCE_SERVER_LOGIN_URL");

  if (explicitUrl) return explicitUrl;

  const baseUrl = stripTrailingSlash(getRequiredEnv("RESOURCE_SERVER_URL"));
  const path = getOptionalEnv("RESOURCE_SERVER_LOGIN_PATH") ?? DEFAULT_LOGIN_PATH;

  return joinUrl(baseUrl, path);
}

function getCredentialBody(credentials: ResourceCredentials): Record<string, string> {
  const identifierField =
    getOptionalEnv("RESOURCE_SERVER_IDENTIFIER_FIELD") ?? DEFAULT_IDENTIFIER_FIELD;
  const passwordField =
    getOptionalEnv("RESOURCE_SERVER_PASSWORD_FIELD") ?? DEFAULT_PASSWORD_FIELD;

  return {
    [identifierField]: credentials.identifier,
    [passwordField]: credentials.password,
  };
}

function getCandidateRecords(payload: UnknownRecord): UnknownRecord[] {
  const candidates = [payload];

  if (isRecord(payload.user)) candidates.push(payload.user);
  if (isRecord(payload.data)) {
    candidates.push(payload.data);
    if (isRecord(payload.data.user)) candidates.push(payload.data.user);
  }

  return candidates;
}

function findString(records: UnknownRecord[], keys: string[]): string | undefined {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
  }

  return undefined;
}

function getSubjectFields(): string[] {
  const preferredField = getOptionalEnv("RESOURCE_SERVER_SUBJECT_FIELD");
  return preferredField
    ? [preferredField, ...DEFAULT_SUBJECT_FIELDS]
    : DEFAULT_SUBJECT_FIELDS;
}

function getSafeContext(records: UnknownRecord[]): Record<string, unknown> {
  const context: Record<string, unknown> = { authenticated_by: "resource-server" };
  const email = findString(records, ["email"]);
  const name = findString(records, ["name", "full_name", "fullName"]);

  if (email) context.email = email;
  if (name) context.name = name;

  for (const record of records) {
    for (const key of ["claims", "traits", "context"]) {
      if (isRecord(record[key])) Object.assign(context, record[key]);
    }
  }

  return context;
}

async function readJsonObject(response: Response): Promise<UnknownRecord | null> {
  const payload = await response.json().catch(() => null);
  return isRecord(payload) ? payload : null;
}

function readErrorMessage(payload: UnknownRecord | null, status: number): string {
  const message = payload?.message ?? payload?.error_description ?? payload?.error;
  return typeof message === "string" && message.trim()
    ? message
    : `Resource server request failed with status ${status}.`;
}

function assertAuthenticated(payload: UnknownRecord): void {
  if (payload.authenticated === false || payload.success === false) {
    throw new InvalidCredentialsError();
  }
}

export async function authenticateResourceUser(
  credentials: ResourceCredentials,
): Promise<AuthenticatedResourceUser> {
  const token = await getResourceServerAccessToken();
  const response = await fetch(getResourceLoginUrl(), {
    body: JSON.stringify(getCredentialBody(credentials)),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await readJsonObject(response);

  if (!response.ok) {
    throw new ResourceServerError(
      response.status,
      readErrorMessage(payload, response.status),
    );
  }

  if (!payload) {
    throw new ResourceServerError(
      response.status,
      "Resource server login response must be a JSON object.",
    );
  }

  assertAuthenticated(payload);

  const records = getCandidateRecords(payload);
  const subject = findString(records, getSubjectFields());

  if (!subject) {
    throw new ResourceServerError(
      response.status,
      "Resource server login response did not include a user subject.",
    );
  }

  return {
    context: getSafeContext(records),
    subject,
  };
}
