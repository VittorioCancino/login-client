import { redirect } from "next/navigation";

import { acceptLogoutRequest } from "@/lib/hydra/logout";

type LogoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function LogoutError({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <section className="w-full max-w-[30rem] rounded-3xl border border-white/10 bg-slate-950/85 p-6 text-white shadow-[0_1.5rem_4rem_rgba(0,0,0,0.34)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ce-blue">
          Logout Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
          Unable to complete logout
        </h1>
        <p className="mt-4 rounded-[0.9rem] border border-rose-400/40 bg-rose-400/10 px-[0.95rem] py-[0.85rem] text-sm leading-6 text-rose-200">
          {message}
        </p>
      </section>
    </main>
  );
}

export default async function LogoutPage({ searchParams }: LogoutPageProps) {
  const params = await searchParams;
  const logoutChallenge = firstParam(params.logout_challenge).trim();

  if (!logoutChallenge) {
    return <LogoutError message="Missing Hydra logout challenge." />;
  }

  let redirectTo: string;

  try {
    const accepted = await acceptLogoutRequest(logoutChallenge);
    redirectTo = accepted.redirect_to;
  } catch (error) {
    console.error("Unable to accept Hydra logout request", error);
    return <LogoutError message="Unable to complete this logout request." />;
  }

  redirect(redirectTo);
}
