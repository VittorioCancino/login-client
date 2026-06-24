import type { HydraLoginRequest } from "@/lib/hydra/types";

export const USER_ACCOUNT_ACR = "user-account";
export const MAINTAINER_ACCOUNT_ACR = "maintainer-account";

export type LoginAccountType = "user" | "maintainer";

const accountTypeByAcr = new Map<string, LoginAccountType>([
  [USER_ACCOUNT_ACR, "user"],
  [MAINTAINER_ACCOUNT_ACR, "maintainer"],
]);

export class InvalidLoginAccountTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLoginAccountTypeError";
  }
}

export function getLoginAccountAcr(accountType: LoginAccountType): string {
  return accountType === "maintainer" ? MAINTAINER_ACCOUNT_ACR : USER_ACCOUNT_ACR;
}

export function getMaintainerServiceClientId(
  loginRequest: Pick<HydraLoginRequest, "client">,
  accountType: LoginAccountType,
): string | undefined {
  if (accountType !== "maintainer") return undefined;

  const clientId = loginRequest.client?.client_id?.trim();

  if (!clientId) {
    throw new InvalidLoginAccountTypeError(
      "Hydra maintainer login challenge is missing a client id.",
    );
  }

  return clientId;
}

export function getLoginAccountType(
  loginRequest: Pick<HydraLoginRequest, "oidc_context">,
): LoginAccountType {
  const acrValues = loginRequest.oidc_context?.acr_values ?? [];
  const unknownAcrValues = acrValues.filter((value) => !accountTypeByAcr.has(value));

  if (unknownAcrValues.length) {
    throw new InvalidLoginAccountTypeError(
      `Unsupported ACR value: ${unknownAcrValues.join(", ")}.`,
    );
  }

  const requestedAccountTypes = new Set(
    acrValues.map((value) => accountTypeByAcr.get(value)).filter(Boolean),
  );

  if (requestedAccountTypes.size > 1) {
    throw new InvalidLoginAccountTypeError(
      "Hydra login challenge requested multiple account types.",
    );
  }

  return requestedAccountTypes.values().next().value ?? "user";
}
