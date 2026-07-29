import { NextResponse } from "next/server";
import { fetchLiveQuotes } from "@/lib/fx-live";

// Avaliada a cada requisição; o cache de 60s vem do fetch interno e do header.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchLiveQuotes();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
