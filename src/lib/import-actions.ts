"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  previewImport,
  commitImport,
  type ImportEntity,
  type PreviewResult,
  type CommitResult,
} from "@/lib/data/import";

function canImport(session: Parameters<typeof can>[0]): boolean {
  return (
    session.isInternal ||
    can(session, PERMISSIONS.contractWrite) ||
    can(session, PERMISSIONS.brandWrite)
  );
}

const LIST_PATH: Record<ImportEntity, string> = {
  licensees: "/licenciados",
  catalog: "/catalogo",
  suppliers: "/fornecedores",
};

function emptyPreview(entity: ImportEntity, error: string): PreviewResult {
  return {
    ok: false,
    error,
    entity,
    displayColumns: [],
    summary: { total: 0, valid: 0, duplicates: 0, errors: 0 },
    rows: [],
    shownRows: 0,
  };
}

async function fileBuffer(formData: FormData): Promise<Buffer | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return Buffer.from(await file.arrayBuffer());
}

export async function previewImportAction(
  entity: ImportEntity,
  formData: FormData,
): Promise<PreviewResult> {
  const session = await requireSession();
  if (!canImport(session)) return emptyPreview(entity, "Você não tem permissão para importar.");
  const buf = await fileBuffer(formData);
  if (!buf) return emptyPreview(entity, "Selecione um arquivo CSV ou Excel (.xlsx).");
  try {
    return await previewImport(session.tenantId, entity, buf);
  } catch (e) {
    return emptyPreview(entity, e instanceof Error ? e.message : "Falha ao ler o arquivo.");
  }
}

export async function commitImportAction(
  entity: ImportEntity,
  formData: FormData,
): Promise<CommitResult> {
  const session = await requireSession();
  if (!canImport(session))
    return { ok: false, error: "Sem permissão.", inserted: 0, skippedDuplicates: 0, failed: 0, failures: [] };
  const buf = await fileBuffer(formData);
  if (!buf)
    return { ok: false, error: "Arquivo ausente.", inserted: 0, skippedDuplicates: 0, failed: 0, failures: [] };
  let res: CommitResult;
  try {
    res = await commitImport(session.tenantId, entity, buf, session.userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na importação.", inserted: 0, skippedDuplicates: 0, failed: 0, failures: [] };
  }
  revalidatePath(LIST_PATH[entity]);
  return res;
}
