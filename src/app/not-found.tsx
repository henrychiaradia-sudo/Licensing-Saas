import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950">
          <Compass size={26} />
        </div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-sm text-neutral-500">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft size={15} /> Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
