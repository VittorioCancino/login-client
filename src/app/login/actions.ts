"use server";

import { redirect } from "next/navigation";

import { acceptLoginRequest, getLoginRequest } from "@/lib/hydra/login";
import {
  getLoginAccountAcr,
  getLoginAccountType,
  getMaintainerServiceClientId,
  InvalidLoginAccountTypeError,
} from "@/lib/login/account-type";
import {
  authenticateResourceUser,
  InvalidCredentialsError,
  ResourceServerError,
} from "@/lib/resource-server/auth";
import { getLoginRememberForSeconds } from "@/lib/settings";

export type LoginFormState = {
  error?: string;
  identifier?: string;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitLogin(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const loginChallenge = readFormString(formData, "login_challenge");
  const identifier = readFormString(formData, "identifier");
  const password = readFormString(formData, "password");

  if (!loginChallenge) {
    return { error: "Missing Hydra login challenge.", identifier };
  }

  if (!identifier || !password) {
    return { error: "Enter your email and password.", identifier };
  }

  if (!isEmail(identifier)) {
    return { error: "Enter a valid email address.", identifier };
  }

  let redirectTo: string;

  try {
    const loginRequest = await getLoginRequest(loginChallenge);
    const accountType = getLoginAccountType(loginRequest);
    const serviceClientId = getMaintainerServiceClientId(
      loginRequest,
      accountType,
    );
    const user = await authenticateResourceUser({
      accountType,
      identifier,
      password,
      serviceClientId,
    });
    const accepted = await acceptLoginRequest(loginChallenge, {
      acr: getLoginAccountAcr(accountType),
      context: user.context,
      remember: true,
      rememberForSeconds: getLoginRememberForSeconds(),
      subject: user.subject,
    });

    redirectTo = accepted.redirect_to;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { error: "Invalid credentials.", identifier };
    }

    if (error instanceof InvalidLoginAccountTypeError) {
      return { error: "Unsupported login account type.", identifier };
    }

    if (error instanceof ResourceServerError && error.status === 400) {
      return { error: "Enter a valid email and password.", identifier };
    }

    console.error("Unable to complete Hydra login request", error);
    return {
      error: "Unable to complete login right now. Please try again later.",
      identifier,
    };
  }

  redirect(redirectTo);
}
