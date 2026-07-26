import Link from "next/link";
import { Search, FileText, Users, ClipboardCheck, Factory } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { globalSearch } from "@/lib/data/search";
import { Card } from "@/components/ui";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await globalSearch(session.tenantId, query) : null;
  const totalCount = results
    ? results.contracts.length +
      results.licensees.length +
      results.products.length +
      results.suppliers.length
    : 0;

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Search size={20} className="text-neutral-400" />
        <h1 className="text-xl font-bold">
          Busca{query ? `: "${query}"` : ""}
        </h1>
      </div>

      {!query && (
        <Card className="p-8 text-center text-sm text-neutral-400">
          Digite um termo na barra de busca do topo para procurar em contratos, licenciados, produtos e
          fornecedores.
        </Card>
      )}

      {query && totalCount === 0 && (
        <Card className="p-8 text-center text-sm text-neutral-400">
          Nenhum resultado para “{query}”.
        </Card>
      )}

      {results && totalCount > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ResultGroup
            title="Contratos"
            icon={<FileText size={15} className="text-blue-600" />}
            empty={results.contracts.length === 0}
          >
            {results.contracts.map((c) => (
              <Row
                key={c.id}
                href={`/contratos/${c.id}`}
                primary={c.contractNumber}
                secondary={c.licenseeName ?? "—"}
              />
            ))}
          </ResultGroup>

          <ResultGroup
            title="Licenciados"
            icon={<Users size={15} className="text-emerald-600" />}
            empty={results.licensees.length === 0}
          >
            {results.licensees.map((l) => (
              <Row key={l.id} href={`/licenciados/${l.id}`} primary={l.legalName} secondary="" />
            ))}
          </ResultGroup>

          <ResultGroup
            title="Produtos"
            icon={<ClipboardCheck size={15} className="text-violet-600" />}
            empty={results.products.length === 0}
          >
            {results.products.map((p) => (
              <Row
                key={p.id}
                href={`/produtos/${p.id}`}
                primary={p.name}
                secondary={`${p.sku}${p.brandName ? ` · ${p.brandName}` : ""}`}
              />
            ))}
          </ResultGroup>

          <ResultGroup
            title="Fornecedores"
            icon={<Factory size={15} className="text-amber-600" />}
            empty={results.suppliers.length === 0}
          >
            {results.suppliers.map((s) => (
              <Row
                key={s.id}
                href={`/fornecedores/${s.id}`}
                primary={s.tradeName ?? s.legalName}
                secondary={s.code}
              />
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-neutral-100 p-4 dark:border-neutral-800">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {empty ? (
        <p className="px-4 py-6 text-center text-xs text-neutral-400">Nenhum resultado.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</ul>
      )}
    </Card>
  );
}

function Row({ href, primary, secondary }: { href: string; primary: string; secondary: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div className="text-sm font-medium text-blue-600">{primary}</div>
        {secondary && <div className="text-xs text-neutral-400">{secondary}</div>}
      </Link>
    </li>
  );
}
