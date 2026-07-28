export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 h-7 w-64 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
    </div>
  );
}
