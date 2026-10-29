export default function EventsLoading() {
  return (
    <div className="pb-10 pt-28 lg:pt-32">
      <div className="shell">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mt-6 h-14 w-72 animate-pulse rounded-xl bg-white/10 sm:h-20 sm:w-96" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-white/5" />
        <div className="panel mt-8 h-44 animate-pulse rounded-3xl" aria-hidden="true" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-[1.6rem] border border-white/5 bg-white/[0.03]"
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-ash" role="status">
          Carregando encontros…
        </p>
      </div>
    </div>
  );
}
