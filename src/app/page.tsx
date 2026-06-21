export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-8 sm:px-8 sm:py-10 md:px-10">
      <section
        className="w-full max-w-[34rem] rounded-3xl border border-white/10 bg-slate-950/85 p-6 shadow-[0_1.5rem_4rem_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8"
        aria-labelledby="home-title"
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-ce-blue">
          CLLS
        </p>
        <h1
          className="m-0 text-2xl font-semibold tracking-[-0.035em] text-white"
          id="home-title"
        >
          CE-Lab Login Server
        </h1>
        <p className="mt-4 text-sm leading-6 text-ce-muted">
          Computer Engineering LAB Login Server is intended to be called by Ory
          Hydra with a login challenge. Configure Hydra&apos;s login URL to this
          route:
        </p>
        <code className="mt-4 block overflow-x-auto rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-yellow-100">
          /login?login_challenge=...
        </code>
      </section>
    </main>
  );
}
