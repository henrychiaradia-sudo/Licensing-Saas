import { eq, type SQL, type AnyColumn } from "drizzle-orm";

/** Dimensão da "Visão global" (Consolidada × por Marca/Licenciado/Fornecedor). */
export type ViewDim = "marca" | "licenciado" | "fornecedor";

export type ParsedView = { dim: ViewDim; id: string } | null;

/** Escopo aplicável às queries: só um dos três estará preenchido por vez. */
export type ViewScope = {
  brandId?: string;
  licenseeId?: string;
  supplierId?: string;
};

const DIMS: ViewDim[] = ["marca", "licenciado", "fornecedor"];

/** Faz o parse do parâmetro `view` (formato "dim:uuid"). Retorna null se inválido/consolidada. */
export function parseView(raw: string | undefined | null): ParsedView {
  if (!raw) return null;
  const [dim, id] = raw.split(":");
  if (!id || !(DIMS as string[]).includes(dim)) return null;
  return { dim: dim as ViewDim, id };
}

/** Converte um ParsedView (já validado contra as opções) num ViewScope. */
export function viewToScope(view: ParsedView): ViewScope {
  if (!view) return {};
  if (view.dim === "marca") return { brandId: view.id };
  if (view.dim === "licenciado") return { licenseeId: view.id };
  return { supplierId: view.id };
}

/**
 * Gera as condições Drizzle do escopo para uma tabela, informando quais colunas
 * ela tem para cada dimensão. Só aplica a dimensão ativa E que a tabela suporta —
 * métricas sem aquela dimensão simplesmente ficam consolidadas (comportamento correto).
 */
export function scopeConds(
  scope: ViewScope | undefined,
  cols: { licensee?: AnyColumn; supplier?: AnyColumn; brand?: AnyColumn },
): SQL[] {
  const out: SQL[] = [];
  if (!scope) return out;
  if (scope.licenseeId && cols.licensee) out.push(eq(cols.licensee, scope.licenseeId));
  if (scope.supplierId && cols.supplier) out.push(eq(cols.supplier, scope.supplierId));
  if (scope.brandId && cols.brand) out.push(eq(cols.brand, scope.brandId));
  return out;
}

export const VIEW_DIM_LABEL: Record<ViewDim, string> = {
  marca: "Marca",
  licenciado: "Licenciado",
  fornecedor: "Fornecedor",
};
