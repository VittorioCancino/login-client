import { redirect } from "next/navigation";

import {
  acceptConsentRequest,
  getConsentRequest,
} from "@/lib/hydra/consent";
import type { HydraConsentRequest } from "@/lib/hydra/types";
import { getConsentRememberForSeconds } from "@/lib/settings";

import { ConsentForm } from "./ConsentForm";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const shellClassName =
  "flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-10";

const cardClassName =
  "w-full max-w-[34rem] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-[0_1.5rem_4rem_rgba(0,0,0,0.34)] backdrop-blur-xl";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getClientName(consentRequest: HydraConsentRequest): string {
  return (
    consentRequest.client?.client_name ??
    consentRequest.client?.client_id ??
    "the requesting application"
  );
}

function ConsentCard({
  children,
  clientName,
}: {
  children: React.ReactNode;
  clientName?: string;
}) {
  return (
    <main className={shellClassName}>
      <section className={cardClassName} aria-labelledby="consent-heading">
        <div className="p-6 pb-4 sm:p-7 sm:pb-4">
          <div className="mb-7 flex items-center gap-3" aria-hidden="true">
            <div className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white text-[0.7rem] font-black tracking-[-0.08em] text-slate-950 shadow-sm">
              CLLS
            </div>
            <div>
              <p className="m-0 text-sm font-semibold text-white">
                CE-Lab Login Server
              </p>
              <p className="m-0 text-xs text-ce-muted">Access approval</p>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ce-blue">
            Computer Engineering LAB
          </p>
          <h1
            className="m-0 mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[1.7rem]"
            id="consent-heading"
          >
            Approve requested access
          </h1>
          <p className="mt-3 text-sm leading-6 text-ce-muted">
            Review what this client is asking to access before continuing.
          </p>
          <div
            className="mt-5 rounded-2xl border border-ce-yellow/30 bg-ce-yellow/10 px-4 py-3"
            aria-label="Requesting client"
          >
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-yellow-200/80">
              Requesting client
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

function ConsentError({ message }: { message: string }) {
  return (
    <ConsentCard>
      <div className="grid gap-4 px-6 pb-6 pt-2 sm:px-7 sm:pb-7 sm:pt-2">
        <p
          className="m-0 rounded-[0.9rem] border border-rose-400/40 bg-rose-400/10 px-[0.95rem] py-[0.85rem] leading-[1.45] text-rose-200"
          role="alert"
        >
          {message}
        </p>
        <p className="m-0 text-xs leading-5 text-ce-muted">
          Start the OAuth2 authorization request again from the client
          application.
        </p>
      </div>
    </ConsentCard>
  );
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const consentChallenge = firstParam(params.consent_challenge).trim();

  if (!consentChallenge) {
    return <ConsentError message="Missing Hydra consent challenge." />;
  }

  let consentRequest: HydraConsentRequest;

  try {
    consentRequest = await getConsentRequest(consentChallenge);
  } catch (error) {
    console.error("Unable to fetch Hydra consent request", error);
    return <ConsentError message="Unable to read the Hydra consent challenge." />;
  }

  const requestedScopes = consentRequest.requested_scope ?? [];
  const requestedAudience = consentRequest.requested_access_token_audience ?? [];

  if (consentRequest.skip) {
    let redirectTo: string;

    try {
      const accepted = await acceptConsentRequest(consentChallenge, {
        grantAccessTokenAudience: requestedAudience,
        grantScope: requestedScopes,
        remember: true,
        rememberForSeconds: getConsentRememberForSeconds(),
      });
      redirectTo = accepted.redirect_to;
    } catch (error) {
      console.error("Unable to accept skipped Hydra consent request", error);
      return <ConsentError message="Unable to resume this consent session." />;
    }

    redirect(redirectTo);
  }

  const clientName = getClientName(consentRequest);

  return (
    <ConsentCard clientName={clientName}>
      <ConsentForm
        clientName={clientName}
        consentChallenge={consentChallenge}
        requestedAudience={requestedAudience}
        requestedScopes={requestedScopes}
      />
    </ConsentCard>
  );
}
