import { getSession } from "@/lib/auth";
import { getDocumentForDownload } from "@/lib/data/generated-documents";

export const dynamic = "force-dynamic";

/** Serve o PDF do documento (inline). Interno acessa os do tenant; licenciado, só os seus. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new Response("Não autorizado", { status: 401 });

  const doc = await getDocumentForDownload(session.tenantId, id);
  if (!doc) return new Response("Documento não encontrado", { status: 404 });

  if (!session.isInternal) {
    if (!session.licenseeId || session.licenseeId !== doc.licenseeId) {
      return new Response("Não autorizado", { status: 403 });
    }
  }

  const bytes = new Uint8Array(doc.content);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
