"use server";

import { redirect } from "next/navigation";

import {
  acceptConsentRequest,
  rejectConsentRequest,
} from "@/lib/hydra/consent";
import { getConsentRememberForSeconds } from "@/lib/settings";

export type ConsentFormState = {
  error?: string;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFormStrings(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function submitConsent(
  _previousState: ConsentFormState,
  formData: FormData,
): Promise<ConsentFormState> {
  const consentChallenge = readFormString(formData, "consent_challenge");
  const decision = readFormString(formData, "decision");

  if (!consentChallenge) {
    return { error: "Missing Hydra consent challenge." };
  }

  let redirectTo: string;

  try {
    if (decision === "reject") {
      const rejected = await rejectConsentRequest(consentChallenge);
      redirectTo = rejected.redirect_to;
    } else {
      const shareScopes = formData.get("share_scopes") === "accepted";

      if (!shareScopes) {
        return { error: "You must approve the requested access to continue." };
      }

      const accepted = await acceptConsentRequest(consentChallenge, {
        grantAccessTokenAudience: readFormStrings(formData, "audience"),
        grantScope: readFormStrings(formData, "scope"),
        remember: true,
        rememberForSeconds: getConsentRememberForSeconds(),
      });
      redirectTo = accepted.redirect_to;
    }
  } catch (error) {
    console.error("Unable to complete Hydra consent request", error);
    return {
      error: "Unable to complete consent right now. Please try again later.",
    };
  }

  redirect(redirectTo);
}
