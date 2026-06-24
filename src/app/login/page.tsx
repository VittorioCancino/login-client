import { redirect } from "next/navigation";

import { acceptLoginRequest, getLoginRequest } from "@/lib/hydra/login";
import type { HydraLoginRequest } from "@/lib/hydra/types";
import {
  getLoginAccountAcr,
  getLoginAccountType,
  getMaintainerServiceClientId,
  InvalidLoginAccountTypeError,
  type LoginAccountType,
} from "@/lib/login/account-type";
import { getLoginRememberForSeconds } from "@/lib/settings";

import { LoginForm } from "./LoginForm";

const shellClassName =
  "flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-10";

const loginCardClassName =
  "w-full max-w-[30rem] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-[0_1.5rem_4rem_rgba(0,0,0,0.34)] backdrop-blur-xl";

const eyebrowClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-ce-blue";

const titleClassName =
  "m-0 mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[1.7rem]";

const finePrintClassName =
  "m-0 text-[0.82rem] leading-6 text-ce-muted [@media(max-height:720px)]:text-[0.78rem]";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getClientName(loginRequest: HydraLoginRequest): string {
  return (
    loginRequest.client?.client_name ??
    loginRequest.client?.client_id ??
    "the requesting application"
  );
}

function getLoginHint(loginRequest: HydraLoginRequest): string | undefined {
  const hint = loginRequest.oidc_context?.login_hint;
  return typeof hint === "string" && hint.trim() ? hint : undefined;
}

function getLoginTitle(accountType: LoginAccountType): string {
  return accountType === "maintainer"
    ? "Sign in with your maintainer account"
    : "Sign in with your CE-Lab account";
}

function getLoginDescription(accountType: LoginAccountType): string {
  return accountType === "maintainer"
    ? "Use your maintainer credentials to continue to this application."
    : "Continue only if you recognize the requesting application.";
}

function LoginCard({
  accountType = "user",
  children,
  clientName,
}: {
  accountType?: LoginAccountType;
  children: React.ReactNode;
  clientName?: string;
}) {
  return (
    <main className={shellClassName}>
      <section className={loginCardClassName} aria-labelledby="login-title">
        <div className="p-6 pb-4 sm:p-7 sm:pb-4">
          <div className="mb-7 flex items-center gap-3" aria-hidden="true">
            <div className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white text-[0.7rem] font-black tracking-[-0.08em] text-slate-950 shadow-sm">
              CLLS
            </div>
            <div>
              <p className="m-0 text-sm font-semibold text-white">
                CE-Lab Login Server
              </p>
              <p className="m-0 text-xs text-ce-muted">Secure authentication</p>
            </div>
          </div>
          <p className={eyebrowClassName}>Computer Engineering LAB</p>
          <h1 className={titleClassName} id="login-title">
            {getLoginTitle(accountType)}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ce-muted">
            {getLoginDescription(accountType)}
          </p>
          <div
            className="mt-5 rounded-2xl border border-ce-yellow/30 bg-ce-yellow/10 px-4 py-3"
            aria-label="Requesting client"
          >
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-yellow-200/80">
              Connecting to
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-yellow-50">
              {clientName ?? "Unknown client"}
            </p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function LoginError({ message }: { message: string }) {
  return (
    <LoginCard>
      <div className="grid gap-4 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <p
          className="m-0 rounded-[0.9rem] border border-rose-400/40 bg-rose-400/10 px-[0.95rem] py-[0.85rem] leading-[1.45] text-rose-200"
          role="alert"
        >
          {message}
        </p>
        <p className={finePrintClassName}>
          Start the OAuth2 authorization request again from the client
          application.
        </p>
      </div>
    </LoginCard>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const loginChallenge = firstParam(params.login_challenge).trim();

  if (!loginChallenge) {
    return <LoginError message="Missing Hydra login challenge." />;
  }

  let loginRequest: HydraLoginRequest;
  let accountType: LoginAccountType;

  try {
    loginRequest = await getLoginRequest(loginChallenge);
    accountType = getLoginAccountType(loginRequest);
    getMaintainerServiceClientId(loginRequest, accountType);
  } catch (error) {
    if (error instanceof InvalidLoginAccountTypeError) {
      console.error("Unsupported Hydra login account type", error);
      return <LoginError message="Unsupported login account type." />;
    }

    console.error("Unable to fetch Hydra login request", error);
    return <LoginError message="Unable to read the Hydra login challenge." />;
  }

  if (accountType === "user" && loginRequest.skip && loginRequest.subject) {
    let redirectTo: string;

    try {
      const accepted = await acceptLoginRequest(loginChallenge, {
        acr: getLoginAccountAcr(accountType),
        context: { account_type: accountType },
        remember: true,
        rememberForSeconds: getLoginRememberForSeconds(),
        subject: loginRequest.subject,
      });
      redirectTo = accepted.redirect_to;
    } catch (error) {
      console.error("Unable to accept skipped Hydra login request", error);
      return <LoginError message="Unable to resume this login session." />;
    }

    redirect(redirectTo);
  }

  const clientName = getClientName(loginRequest);

  return (
    <LoginCard accountType={accountType} clientName={clientName}>
      <LoginForm
        loginChallenge={loginChallenge}
        loginHint={getLoginHint(loginRequest)}
      />
    </LoginCard>
  );
}
