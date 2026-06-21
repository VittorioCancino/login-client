import "server-only";

import { getIntegerEnv } from "./env";

export function getLoginRememberForSeconds(): number {
  return getIntegerEnv("LOGIN_REMEMBER_FOR_SECONDS", 3600);
}

export function getConsentRememberForSeconds(): number {
  return getIntegerEnv(
    "CONSENT_REMEMBER_FOR_SECONDS",
    getLoginRememberForSeconds(),
  );
}
