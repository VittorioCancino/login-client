"use client";

import { useActionState } from "react";

import { submitConsent, type ConsentFormState } from "./actions";

const initialState: ConsentFormState = {};

type ConsentFormProps = {
  clientName: string;
  consentChallenge: string;
  requestedAudience: string[];
  requestedScopes: string[];
};

type AccessSummary = {
  key: string;
  label: string;
};

const finePrintClassName = "m-0 text-xs leading-5 text-ce-muted";

function hasAnyScope(scopes: Set<string>, candidates: string[]): boolean {
  return candidates.some((scope) => scopes.has(scope));
}

function titleCase(value: string): string {
  return value
    .split(/[-_.:]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeServiceKey(serviceKey: string): string {
  const knownServices: Record<string, string> = {
    hydra: "Hydra Admin",
    "user-portal": "User Portal",
  };

  return knownServices[serviceKey] ?? titleCase(serviceKey);
}

function getAccessSummaries(requestedScopes: string[]): AccessSummary[] {
  const scopes = new Set(requestedScopes);
  const summaries: AccessSummary[] = [];

  if (
    hasAnyScope(scopes, ["openid", "profile", "email", "users.me.profile.read"])
  ) {
    summaries.push({
      key: "profile",
      label: "Sign you in and read your profile",
    });
  }

  const serviceRoleScopes = requestedScopes
    .map((scope) => /^users\.me\.services\.([a-z0-9-]+)\.roles\.read$/i.exec(scope))
    .filter((match): match is RegExpExecArray => Boolean(match));

  for (const match of serviceRoleScopes) {
    const serviceName = humanizeServiceKey(match[1]);
    summaries.push({
      key: `roles-${match[1]}`,
      label: `Read your ${serviceName} roles`,
    });
  }

  const hasInvitationAccess = [
    "user-registration.invitations.write",
    "user-registration.invitations.read",
    "user-registration.invitations.approve",
    "user-registration.invitations.delete",
  ].some((scope) => scopes.has(scope));

  if (hasInvitationAccess) {
    summaries.push({
      key: "registration-invitations",
      label: "Manage registration invitations",
    });
  }

  const summarizedScopes = new Set([
    "email",
    "openid",
    "profile",
    "user-registration.invitations.approve",
    "user-registration.invitations.delete",
    "user-registration.invitations.read",
    "user-registration.invitations.write",
    "users.me.profile.read",
  ]);
  const unknownScopes = requestedScopes.filter(
    (scope) =>
      !summarizedScopes.has(scope) &&
      !/^users\.me\.services\.([a-z0-9-]+)\.roles\.read$/i.test(scope),
  );

  if (unknownScopes.length) {
    summaries.push({
      key: "additional-access",
      label: "Use additional CE-Lab access",
    });
  }

  return summaries;
}

export function ConsentForm({
  clientName,
  consentChallenge,
  requestedAudience,
  requestedScopes,
}: ConsentFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitConsent,
    initialState,
  );
  const accessSummaries = getAccessSummaries(requestedScopes);

  return (
    <form
      action={formAction}
      className="grid gap-4 px-6 pb-6 pt-2 sm:px-7 sm:pb-7 sm:pt-2"
    >
      <input name="consent_challenge" type="hidden" value={consentChallenge} />
      {requestedScopes.map((scope, index) => (
        <input key={`${scope}-${index}`} name="scope" type="hidden" value={scope} />
      ))}
      {requestedAudience.map((audience, index) => (
        <input
          key={`${audience}-${index}`}
          name="audience"
          type="hidden"
          value={audience}
        />
      ))}

      <section
        className="grid gap-4 rounded-2xl border border-ce-yellow/25 bg-ce-yellow/[0.07] p-4"
        aria-labelledby="consent-title"
      >
        <div>
          <p
            className="m-0 mb-1 text-sm font-semibold text-yellow-50"
            id="consent-title"
          >
            Allow {clientName} to:
          </p>
          <p className={finePrintClassName}>
            Review this short access summary before continuing.
          </p>
        </div>

        {accessSummaries.length ? (
          <ul className="grid gap-2" aria-label="Requested access summary">
            {accessSummaries.map((summary) => (
              <li
                className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2.5"
                key={summary.key}
              >
                <p className="m-0 text-sm font-semibold text-yellow-50">
                  {summary.label}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={finePrintClassName}>No user permissions were requested.</p>
        )}

        <details className="rounded-2xl border border-white/10 bg-black/15 p-3 text-xs text-ce-muted">
          <summary className="cursor-pointer font-semibold text-slate-200 transition hover:text-white">
            Technical details
          </summary>
          <div className="mt-3 grid gap-3">
            {requestedScopes.length ? (
              <div className="grid gap-2">
                <p className="m-0 font-semibold text-slate-300">Scopes</p>
                <ul className="flex flex-wrap gap-1.5" aria-label="Requested scopes">
                  {requestedScopes.map((scope, index) => (
                    <li
                      className="rounded-full border border-ce-yellow/25 bg-slate-950/40 px-2 py-0.5 text-[0.7rem] text-yellow-100"
                      key={`${scope}-detail-${index}`}
                    >
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {requestedAudience.length ? (
              <div className="grid gap-2">
                <p className="m-0 font-semibold text-slate-300">Audience</p>
                <ul className="flex flex-wrap gap-1.5" aria-label="Requested audience">
                  {requestedAudience.map((audience, index) => (
                    <li
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.7rem] text-slate-200"
                      key={`${audience}-detail-${index}`}
                    >
                      {audience}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>

        <label
          className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 text-sm leading-5 text-slate-200"
          htmlFor="share-scopes"
        >
          <input
            className="mt-0.5 size-4 accent-ce-yellow"
            id="share-scopes"
            name="share_scopes"
            required
            type="checkbox"
            value="accepted"
          />
          <span>I approve this access for {clientName}.</span>
        </label>
      </section>

      {state.error ? (
        <p
          className="m-0 rounded-[0.9rem] border border-rose-400/40 bg-rose-400/10 px-[0.95rem] py-[0.85rem] leading-[1.45] text-rose-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          className="inline-flex cursor-pointer justify-center rounded-2xl border border-sky-300/25 bg-ce-blue px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_1rem_2rem_rgba(56,189,248,0.16)] transition-[filter,transform] duration-150 hover:not-disabled:-translate-y-px hover:not-disabled:brightness-105 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-70"
          disabled={isPending}
          name="decision"
          type="submit"
          value="accept"
        >
          {isPending ? "Authorizing..." : "Authorize"}
        </button>
        <button
          className="inline-flex cursor-pointer justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition-[background,border-color] duration-150 hover:not-disabled:border-white/20 hover:not-disabled:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          formNoValidate
          name="decision"
          type="submit"
          value="reject"
        >
          Deny
        </button>
      </div>
    </form>
  );
}
