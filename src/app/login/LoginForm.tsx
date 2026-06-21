"use client";

import { useActionState } from "react";

import { submitLogin, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

const fieldClassName = "grid gap-2";
const labelClassName =
  "text-sm font-medium text-slate-200";
const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-ce-text outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-white/35 focus:border-ce-blue/70 focus:bg-white/[0.09] focus:shadow-[0_0_0_0.2rem_rgba(56,189,248,0.12)]";
type LoginFormProps = {
  loginChallenge: string;
  loginHint?: string;
};

export function LoginForm({
  loginChallenge,
  loginHint,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitLogin,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 px-6 pb-6 pt-2 sm:px-7 sm:pb-7 sm:pt-2"
    >
      <input name="login_challenge" type="hidden" value={loginChallenge} />

      <div className={fieldClassName}>
        <label className={labelClassName} htmlFor="identifier">
          Email
        </label>
        <input
          autoComplete="username"
          autoFocus
          className={inputClassName}
          defaultValue={state.identifier ?? loginHint ?? ""}
          id="identifier"
          name="identifier"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div className={fieldClassName}>
        <label className={labelClassName} htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={inputClassName}
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p
          className="m-0 rounded-[0.9rem] border border-rose-400/40 bg-rose-400/10 px-[0.95rem] py-[0.85rem] leading-[1.45] text-rose-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="inline-flex cursor-pointer justify-center rounded-2xl border border-sky-300/25 bg-ce-blue px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_1rem_2rem_rgba(56,189,248,0.16)] transition-[filter,transform] duration-150 hover:not-disabled:-translate-y-px hover:not-disabled:brightness-105 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
