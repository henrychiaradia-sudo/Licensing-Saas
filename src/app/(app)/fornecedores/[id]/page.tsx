import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Pencil,
  Gauge,
  ShieldAlert,
  Users,
  Landmark,
  Factory,
  Award,
  ClipboardCheck,
  Boxes,
  Globe,
  Trash2,
  Star,
  FileText,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSupplierDetail, listServedCategoryOptions } from "@/lib/data/suppliers";
import { computeSupplierPerformance, listEvaluations } from "@/lib/data/evaluations";
import { listSupplierDocuments } from "@/lib/data/documents";
import { getSupplierHomologation, listActiveChecklists } from "@/lib/data/homologation";
import {
  changeStatusAction,
  deleteSubAction,
  setServedCategoriesAction,
  setDocStatusAction,
  deleteDocumentAction,
  startHomologationAction,
  saveAnswerAction,
  decideHomologationAction,
} from "../actions";
import { EvaluationForm } from "../evaluation-form";
import { ContactForm, BankForm, PlantForm, CertForm, AuditForm } from "../sub-forms";
import { DocumentForm } from "../doc-forms";
import { Card, Badge, Button, Select } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL, SUPPLIER_STATUS_OPTIONS, validityTone } from "../supplier-meta";
import {
  DOC_TYPE_LABEL,
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  HOMOLOG_STATUS_LABEL,
  HOMOLOG_STATUS_TONE,
  ITEM_RESULT_LABEL,
  ITEM_RESULT_TONE,
  ITEM_RESULT_OPTIONS,
} from "../doc-meta";
import type { PoStatus, SupplierRiskLevel, SupplierType } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const riskTone: Record<SupplierRiskLevel, Tone> = { baixo: "good", medio: "info", alto: "warn", critico: "danger" };
const riskLabel: Record<SupplierRiskLevel, string> = { baixo: "Risco baixo", medio: "Risco médio", alto: "Risco alto", critico: "Risco crítico" };
const poTone: Record<PoStatus, Tone> = { rascunho: "neutral", enviado: "info", confirmado: "info", em_producao: "warn", embarcado: "warn", recebido: "good", cancelado: "danger" };
const poLabel: Record<PoStatus, string> = { rascunho: "Rascunho", enviado: "Enviado", confirmado: "Confirmado", em_producao: "Em produção", embarcado: "Embarcado", recebido: "Recebido", cancelado: "Cancelado" };
const auditTone: Record<string, Tone> = { aprovado: "good", condicional: "warn", reprovado: "danger" };

export default async function FornecedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const [data, perf, evaluations, catOptions, documents, homolog, activeChecklists] = await Promise.all([
    getSupplierDetail(session.tenantId, id),
    computeSupplierPerformance(session.tenantId, id),
    listEvaluations(session.tenantId, id),
    listServedCategoryOptions(session.tenantId),
    listSupplierDocuments(session.tenantId, id),
    getSupplierHomologation(session.tenantId, id),
    listActiveChecklists(session.tenantId),
  ]);
  if (!data) notFound();
  const { supplier: s, orders, contacts, banks, plants, certs, audits, served } = data;
  const latestEval = evaluations[0] ?? null;
  const servedIds = new Set(served.map((x) => x.categoryId));
  const homologation = homolog?.homologation ?? null;
  const homologChecklist = homolog?.checklist ?? null;
  const homologItems = homolog?.items ?? [];

  return (
    <div>
      <Link href="/fornecedores" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600">
        <ArrowLeft size={15} /> Fornecedores
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {s.supplierType && <Badge tone="info">{TYPE_LABEL[s.supplierType as SupplierType]}</Badge>}
            <h1 className="text-xl font-bold">{s.tradeName ?? s.legalName}</h1>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">
            {s.legalName} · {s.code}
            {s.economicGroup ? ` · ${s.economicGroup}` : ""}
            {s.cnpj ? ` · CNPJ ${s.cnpj}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestEval && <Badge tone={riskTone[latestEval.riskLevel]}>{riskLabel[latestEval.riskLevel]}</Badge>}
          <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
          <Link href={`/fornecedores/${id}/editar`}>
            <Button variant="outline" size="sm"><Pencil size={14} /> Editar</Button>
          </Link>
        </div>
      </div>

      {/* Status */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Situação cadastral (ciclo de homologação).</p>
        <form action={changeStatusAction.bind(null, id)} className="flex items-center gap-2">
          <Select name="status" defaultValue={s.status} className="h-9 w-52">
            {SUPPLIER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Button type="submit" size="sm" variant="outline">Aplicar</Button>
        </form>
      </Card>

      {/* Dados gerais + performance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados gerais</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Inscrição estadual" value={s.stateRegistration} />
            <Field label="Local" value={[s.city, s.stateProvince, s.countryName].filter(Boolean).join(" · ") || "—"} />
            <Field label="Endereço" value={s.address} />
            <Field label="Lead time" value={s.leadTimeDays != null ? `${s.leadTimeDays} dias` : "—"} />
            <Field label="MOQ" value={s.moq != null ? s.moq.toLocaleString("pt-BR") : "—"} />
            <Field label="Capacidade" value={s.capacity} />
            <Field label="Pagamento" value={s.paymentTerms} />
            <Field label="Incoterms" value={s.incoterms} />
            <Field label="Moedas" value={s.currencies} />
            <Field label="Avaliação" value={s.rating != null ? `${Number(s.rating).toFixed(1).replace(".", ",")} / 5` : "—"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
            {s.email && <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300"><Mail size={14} /> {s.email}</span>}
            {s.phone && <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300"><Phone size={14} /> {s.phone}</span>}
            {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600"><Globe size={14} /> {s.website}</a>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Gauge size={15} className="text-blue-500" /> Performance (real)</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Metric label="Aprov. qualidade" value={perf.approvalRate != null ? `${perf.approvalRate}%` : "—"} hint={`${perf.inspections} insp.`} />
            <Metric label="Entrega no prazo" value={perf.onTimeRate != null ? `${perf.onTimeRate}%` : "—"} hint={`${perf.ordersReceived} rec.`} />
            <Metric label="Gasto" value={fmtMoney(perf.committedSpend)} hint={`${perf.poCount} PO`} />
            <Metric label="NCs abertas" value={String(perf.openNc)} tone={perf.openNc > 0 ? "danger" : undefined} />
          </dl>
        </Card>
      </div>

      {/* Contatos */}
      <SubCard title="Contatos" icon={<Users size={16} className="text-blue-500" />}>
        <SubTable
          rows={contacts.map((c) => ({
            id: c.id,
            cells: [c.name + (c.isPrimary ? "  ★" : ""), c.role ?? "—", c.email ?? "—", c.phone ?? "—"],
          }))}
          headers={["Nome", "Cargo", "E-mail", "Telefone"]}
          table="contact"
          supplierId={id}
          empty="Nenhum contato."
        />
        <FormRow><ContactForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Bancário */}
      <SubCard title="Dados bancários" icon={<Landmark size={16} className="text-blue-500" />}>
        <SubTable
          rows={banks.map((b) => ({ id: b.id, cells: [b.bankName, b.agency ?? "—", b.accountNumber ?? "—", b.pixKey ?? "—", b.currency] }))}
          headers={["Banco", "Agência", "Conta", "PIX/SWIFT", "Moeda"]}
          table="bank"
          supplierId={id}
          empty="Nenhuma conta cadastrada."
        />
        <FormRow><BankForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Categorias atendidas */}
      <SubCard title="Categorias atendidas" icon={<Boxes size={16} className="text-blue-500" />}>
        <form action={setServedCategoriesAction.bind(null, id)}>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {catOptions.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={servedIds.has(c.id)} />
                {c.name} <span className="text-[11px] text-neutral-400">{c.code}</span>
              </label>
            ))}
            {catOptions.length === 0 && <p className="text-sm text-neutral-400">Cadastre categorias de compras primeiro.</p>}
          </div>
          {catOptions.length > 0 && (
            <div className="mt-3"><Button type="submit" size="sm" variant="outline">Salvar categorias</Button></div>
          )}
        </form>
      </SubCard>

      {/* Plantas */}
      <SubCard title="Plantas / unidades" icon={<Factory size={16} className="text-blue-500" />}>
        <SubTable
          rows={plants.map((p) => ({ id: p.id, cells: [p.name, [p.city, p.country].filter(Boolean).join(" · ") || "—", p.capacity ?? "—", p.certifications ?? "—"] }))}
          headers={["Planta", "Local", "Capacidade", "Certificações"]}
          table="plant"
          supplierId={id}
          empty="Nenhuma planta cadastrada."
        />
        <FormRow><PlantForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Certificações */}
      <SubCard title="Certificações" icon={<Award size={16} className="text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-2 py-2 font-medium">Certificação</th><th scope="col" className="px-2 py-2 font-medium">Nº</th><th scope="col" className="px-2 py-2 font-medium">Emissor</th><th scope="col" className="px-2 py-2 font-medium">Validade</th><th scope="col" className="px-2 py-2 font-medium">Situação</th><th scope="col" className="px-2 py-2"></th>
            </tr></thead>
            <tbody>
              {certs.map((c) => {
                const v = validityTone(c.validUntil as unknown as string | null);
                return (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-2 py-2 font-medium">{c.name}</td>
                    <td className="px-2 py-2 text-neutral-500">{c.number ?? "—"}</td>
                    <td className="px-2 py-2 text-neutral-500">{c.issuer ?? "—"}</td>
                    <td className="px-2 py-2 tabular-nums text-neutral-500">{fmtDate(c.validUntil)}</td>
                    <td className="px-2 py-2"><Badge tone={v.tone}>{v.label}</Badge></td>
                    <td className="px-2 py-2 text-right"><DeleteBtn supplierId={id} table="cert" subId={c.id} /></td>
                  </tr>
                );
              })}
              {certs.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-sm text-neutral-400">Nenhuma certificação.</td></tr>}
            </tbody>
          </table>
        </div>
        <FormRow><CertForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Auditorias */}
      <SubCard title="Auditorias" icon={<ClipboardCheck size={16} className="text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-2 py-2 font-medium">Data</th><th scope="col" className="px-2 py-2 font-medium">Tipo</th><th scope="col" className="px-2 py-2 font-medium">Resultado</th><th scope="col" className="px-2 py-2 text-right font-medium">Score</th><th scope="col" className="px-2 py-2 font-medium">Auditor</th><th scope="col" className="px-2 py-2"></th>
            </tr></thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-2 py-2 tabular-nums">{fmtDate(a.auditDate)}</td>
                  <td className="px-2 py-2">{a.auditType ?? "—"}</td>
                  <td className="px-2 py-2"><Badge tone={auditTone[a.result] ?? "neutral"}>{a.result}</Badge></td>
                  <td className="px-2 py-2 text-right tabular-nums">{a.score ?? "—"}</td>
                  <td className="px-2 py-2 text-neutral-500">{a.auditor ?? "—"}</td>
                  <td className="px-2 py-2 text-right"><DeleteBtn supplierId={id} table="audit" subId={a.id} /></td>
                </tr>
              ))}
              {audits.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-sm text-neutral-400">Nenhuma auditoria.</td></tr>}
            </tbody>
          </table>
        </div>
        <FormRow><AuditForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Documentos */}
      <SubCard title="Documentos" icon={<FileText size={16} className="text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th scope="col" className="px-2 py-2 font-medium">Tipo</th>
                <th scope="col" className="px-2 py-2 font-medium">Documento</th>
                <th scope="col" className="px-2 py-2 font-medium">Emissor</th>
                <th scope="col" className="px-2 py-2 font-medium">Validade</th>
                <th scope="col" className="px-2 py-2 font-medium">Status</th>
                <th scope="col" className="px-2 py-2 font-medium">Responsável</th>
                <th scope="col" className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => {
                const v = validityTone(d.validUntil as unknown as string | null);
                return (
                  <tr key={d.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-2 py-2 font-medium">{DOC_TYPE_LABEL[d.docType]}</td>
                    <td className="px-2 py-2">
                      <div>{d.name ?? "—"}</div>
                      {d.number && <div className="text-[11px] text-neutral-400">Nº {d.number}</div>}
                    </td>
                    <td className="px-2 py-2 text-neutral-500">{d.issuer ?? "—"}</td>
                    <td className="px-2 py-2">
                      <div className="tabular-nums text-neutral-500">{d.validUntil ? fmtDate(d.validUntil) : "—"}</div>
                      {d.validUntil && (
                        <Badge tone={v.tone}>{v.label}</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={DOC_STATUS_TONE[d.status]}>{DOC_STATUS_LABEL[d.status]}</Badge>
                      <div className="mt-1 flex gap-2">
                        <form action={setDocStatusAction.bind(null, id, d.id, "aprovado")}>
                          <button type="submit" className="text-[11px] text-emerald-600 hover:underline">Aprovar</button>
                        </form>
                        <form action={setDocStatusAction.bind(null, id, d.id, "reprovado")}>
                          <button type="submit" className="text-[11px] text-red-500 hover:underline">Reprovar</button>
                        </form>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-neutral-500">
                      {d.responsible ?? "—"}
                      {d.approvedBy && (
                        <div className="text-[11px] text-emerald-600">✓ {d.approvedBy} · {fmtDate(d.approvedAt)}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <DeleteDoc supplierId={id} docId={d.id} />
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-sm text-neutral-400">
                    Nenhum documento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <FormRow><DocumentForm supplierId={id} /></FormRow>
      </SubCard>

      {/* Homologação */}
      <Card className="mt-4 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks size={16} className="text-blue-500" /> Homologação
          </h2>
          {homologation && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">
                Conformidade: <strong className="tabular-nums">{homologation.score ?? 0}%</strong>
              </span>
              <Badge tone={HOMOLOG_STATUS_TONE[homologation.status]}>
                {HOMOLOG_STATUS_LABEL[homologation.status]}
              </Badge>
            </div>
          )}
        </div>

        {!homologation ? (
          activeChecklists.length > 0 ? (
            <form action={startHomologationAction.bind(null, id)} className="flex flex-wrap items-end gap-2">
              <div>
                <p className="mb-1 text-xs text-neutral-400">Selecione um checklist e inicie o processo.</p>
                <Select name="checklistId" className="h-9 w-72" defaultValue={activeChecklists[0]?.id}>
                  {activeChecklists.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.supplierType ? ` (${TYPE_LABEL[c.supplierType]})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" size="sm">Iniciar homologação</Button>
            </form>
          ) : (
            <p className="text-sm text-neutral-400">
              Nenhum checklist ativo. Crie um em <span className="font-medium">Homologação</span> (menu lateral).
            </p>
          )
        ) : (
          <>
            <p className="mb-3 text-xs text-neutral-500">
              Checklist: <strong>{homologChecklist?.name ?? "—"}</strong>
              {homologation.startedAt ? ` · iniciada em ${fmtDate(homologation.startedAt)}` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                    <th scope="col" className="px-2 py-2 font-medium">Item</th>
                    <th scope="col" className="px-2 py-2 font-medium">Categoria</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Peso</th>
                    <th scope="col" className="px-2 py-2 font-medium">Resultado</th>
                    <th scope="col" className="px-2 py-2 font-medium">Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {homologItems.map(({ item, answer }) => (
                    <tr key={item.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="px-2 py-2 font-medium">
                        {item.label}
                        {item.required && <span className="text-red-500"> *</span>}
                      </td>
                      <td className="px-2 py-2 text-neutral-500">{item.category ?? "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-neutral-500">{item.weight}</td>
                      <td className="px-2 py-2">
                        <form action={saveAnswerAction.bind(null, id, homologation.id, item.id)} className="flex items-center gap-1">
                          <Select name="result" defaultValue={answer?.result ?? "pendente"} className="h-8 w-36 text-xs">
                            {ITEM_RESULT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </Select>
                          <Button type="submit" size="sm" variant="outline">OK</Button>
                        </form>
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={ITEM_RESULT_TONE[answer?.result ?? "pendente"]}>
                          {ITEM_RESULT_LABEL[answer?.result ?? "pendente"]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {homologItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-sm text-neutral-400">
                        O checklist selecionado não tem itens.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {homologation.status === "em_andamento" ? (
                <>
                  <span className="mr-1 text-xs text-neutral-500">Decisão:</span>
                  <form action={decideHomologationAction.bind(null, id, homologation.id, "aprovada")}>
                    <Button type="submit" size="sm"><CheckCircle2 size={14} /> Aprovar</Button>
                  </form>
                  <form action={decideHomologationAction.bind(null, id, homologation.id, "condicional")}>
                    <Button type="submit" size="sm" variant="outline">Condicional</Button>
                  </form>
                  <form action={decideHomologationAction.bind(null, id, homologation.id, "reprovada")}>
                    <Button type="submit" size="sm" variant="outline">Reprovar</Button>
                  </form>
                </>
              ) : (
                <span className="text-xs text-neutral-500">
                  Decidida{homologation.decidedAt ? ` em ${fmtDate(homologation.decidedAt)}` : ""}
                  {homologation.decidedBy ? ` por ${homologation.decidedBy}` : ""}.
                </span>
              )}
              {activeChecklists.length > 0 && (
                <form action={startHomologationAction.bind(null, id)} className="ml-auto flex items-center gap-2">
                  <Select name="checklistId" className="h-8 w-56 text-xs" defaultValue={activeChecklists[0]?.id}>
                    {activeChecklists.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" variant="outline">Nova homologação</Button>
                </form>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Scorecard */}
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={16} className="text-amber-500" /> Scorecard &amp; risco</h2>
          {latestEval && <span className="text-xs text-neutral-500">Última ({latestEval.periodLabel}): <strong>{latestEval.overallScore}</strong>/100</span>}
        </div>
        {evaluations.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th scope="col" className="px-3 py-2 font-medium">Período</th><th scope="col" className="px-3 py-2 text-right font-medium">Qual.</th><th scope="col" className="px-3 py-2 text-right font-medium">Entr.</th><th scope="col" className="px-3 py-2 text-right font-medium">Custo</th><th scope="col" className="px-3 py-2 text-right font-medium">Conf.</th><th scope="col" className="px-3 py-2 text-right font-medium">Geral</th><th scope="col" className="px-3 py-2 font-medium">Risco</th>
              </tr></thead>
              <tbody>
                {evaluations.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">{e.periodLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.qualityScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.deliveryScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.costScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.complianceScore}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{e.overallScore}</td>
                    <td className="px-3 py-2"><Badge tone={riskTone[e.riskLevel]}>{riskLabel[e.riskLevel]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-5 text-sm text-neutral-400">Nenhuma avaliação registrada ainda.</p>
        )}
        <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold">Nova avaliação</h3>
          <EvaluationForm supplierId={id} />
        </div>
      </Card>

      {/* Pedidos */}
      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><Star size={15} className="text-blue-500" /> Pedidos de compra</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <th scope="col" className="px-5 py-2 font-medium">Pedido</th><th scope="col" className="px-5 py-2 font-medium">Data</th><th scope="col" className="px-5 py-2 font-medium">Previsão</th><th scope="col" className="px-5 py-2 text-right font-medium">Valor</th><th scope="col" className="px-5 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2"><Link href={`/compras/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.poNumber}</Link></td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.orderDate)}</td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.expectedDate)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(o.totalAmount)}</td>
                <td className="px-5 py-2"><Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">Nenhum pedido de compra.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className={`text-base font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>{value}</dd>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}
function SubCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="mt-4 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">{icon} {title}</h2>
      {children}
    </Card>
  );
}
function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">{children}</div>;
}
function DeleteBtn({ supplierId, table, subId }: { supplierId: string; table: string; subId: string }) {
  return (
    <form action={deleteSubAction.bind(null, supplierId, table, subId)}>
      <button type="submit" aria-label="Remover" className="text-neutral-300 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </form>
  );
}
function DeleteDoc({ supplierId, docId }: { supplierId: string; docId: string }) {
  return (
    <form action={deleteDocumentAction.bind(null, supplierId, docId)}>
      <button type="submit" aria-label="Remover" className="text-neutral-300 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </form>
  );
}
function SubTable({
  rows,
  headers,
  table,
  supplierId,
  empty,
}: {
  rows: { id: string; cells: (string | number)[] }[];
  headers: string[];
  table: string;
  supplierId: string;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            {headers.map((h) => <th scope="col" key={h} className="px-2 py-2 font-medium">{h}</th>)}
            <th scope="col" className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              {r.cells.map((c, i) => <td key={i} className={`px-2 py-2 ${i === 0 ? "font-medium" : "text-neutral-500"}`}>{c}</td>)}
              <td className="px-2 py-2 text-right"><DeleteBtn supplierId={supplierId} table={table} subId={r.id} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length + 1} className="px-2 py-6 text-center text-sm text-neutral-400">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
