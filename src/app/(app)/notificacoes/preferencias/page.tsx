import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Minus,
  Webhook,
  Mail,
  MonitorSmartphone,
  Send,
  Trash2,
  Power,
  Info,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPreferences, listWebhooks } from "@/lib/data/notifications";
import { Card, Badge, Button, Input, Label } from "@/components/ui";
import { NotifIcon } from "@/components/notif-icons";
import { NOTIF_LABEL, NOTIF_BLURB, NOTIF_PREF_ORDER, type NotifChannel } from "@/lib/notif-meta";
import {
  setPreferenceAction,
  createWebhookAction,
  toggleWebhookAction,
  removeWebhookAction,
  testWebhookAction,
} from "./actions";

function fmtWhen(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusTone(s: string | null): "good" | "danger" | "neutral" {
  if (!s) return "neutral";
  if (s.startsWith("entregue")) return "good";
  if (s.startsWith("falha")) return "danger";
  return "neutral";
}

/** Botão-interruptor: envia uma server action que inverte o canal. */
function Toggle({ on, action }: { on: boolean; action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={on}
        className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
          on
            ? "justify-end border-blue-600 bg-blue-600"
            : "justify-start border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700"
        }`}
      >
        <span className="mx-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-neutral-500 shadow">
          {on ? <Check size={12} className="text-blue-600" /> : <Minus size={12} />}
        </span>
      </button>
    </form>
  );
}

export default async function PreferenciasPage() {
  const session = await requireSession();
  const [prefs, webhooks] = await Promise.all([
    getPreferences(session.tenantId, session.userId),
    listWebhooks(session.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/notificacoes"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Voltar às notificações
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold">Preferências de notificação</h1>
        <p className="text-sm text-neutral-500">
          Escolha, por evento, em quais canais você quer ser avisado. Estas preferências são suas.
        </p>
      </div>

      {/* Explicação dos canais */}
      <Card className="mb-5 flex items-start gap-3 p-4 text-[13px] text-neutral-500">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <div className="space-y-1">
          <p>
            <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-200">
              <MonitorSmartphone size={13} /> In-app
            </span>{" "}
            está sempre ativo e aparece no sino do topo.{" "}
            <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-200">
              <Mail size={13} /> E-mail
            </span>{" "}
            usa o provedor configurado (pronto — basta plugar a chave).{" "}
            <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-200">
              <Webhook size={13} /> Webhook
            </span>{" "}
            dispara para os endpoints cadastrados abaixo (com teste de envio real).
          </p>
          <p className="text-neutral-400">Push está no roadmap e aparece como “em breve”.</p>
        </div>
      </Card>

      {/* Matriz eventos × canais */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
          <span>Evento</span>
          <span className="w-16 text-center">In-app</span>
          <span className="w-16 text-center">E-mail</span>
          <span className="w-16 text-center">Push</span>
        </div>
        {prefs.map((p) => (
          <div
            key={p.type}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 border-b border-neutral-50 px-4 py-3 last:border-0 dark:border-neutral-800/60"
          >
            <div className="flex items-start gap-2.5">
              <NotifIcon type={p.type} size={16} className="mt-0.5 text-neutral-400" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-[11.5px] text-neutral-400">{NOTIF_BLURB[p.type]}</div>
              </div>
            </div>
            <div className="flex w-16 justify-center">
              <Toggle on={p.inApp} action={setPreferenceAction.bind(null, p.type, "inApp" as NotifChannel, !p.inApp)} />
            </div>
            <div className="flex w-16 justify-center">
              <Toggle on={p.email} action={setPreferenceAction.bind(null, p.type, "email" as NotifChannel, !p.email)} />
            </div>
            <div className="flex w-16 justify-center">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-400 dark:bg-neutral-800">
                em breve
              </span>
            </div>
          </div>
        ))}
      </Card>

      {/* Webhooks */}
      <div className="mb-3 flex items-center gap-2">
        <Webhook size={18} className="text-violet-500" />
        <h2 className="text-lg font-bold">Webhooks</h2>
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        Endpoints HTTP que recebem um POST em JSON quando eventos configurados são gerados. Use o botão “Testar” para
        um envio real de verificação.
      </p>

      {webhooks.length > 0 && (
        <Card className="mb-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {webhooks.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{w.label ?? "Webhook"}</span>
                  <Badge tone={w.active ? "good" : "neutral"}>{w.active ? "Ativo" : "Inativo"}</Badge>
                  <Badge tone="info">{w.events === "all" ? "Todos os eventos" : NOTIF_LABEL[w.events] ?? w.events}</Badge>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-neutral-400">{w.url}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                  Última entrega: {fmtWhen(w.lastDeliveredAt)}
                  {w.lastStatus && <Badge tone={statusTone(w.lastStatus)}>{w.lastStatus}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <form action={testWebhookAction.bind(null, w.id)}>
                  <Button type="submit" size="sm" variant="outline" title="Enviar teste">
                    <Send size={13} /> Testar
                  </Button>
                </form>
                <form action={toggleWebhookAction.bind(null, w.id, !w.active)}>
                  <Button type="submit" size="sm" variant="ghost" title={w.active ? "Desativar" : "Ativar"}>
                    <Power size={13} /> {w.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={removeWebhookAction.bind(null, w.id)}>
                  <Button type="submit" size="sm" variant="ghost" title="Remover">
                    <Trash2 size={13} className="text-red-500" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Adicionar webhook */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Adicionar webhook</h3>
        <form action={createWebhookAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="label">Nome</Label>
            <Input id="label" name="label" placeholder="Ex.: Slack Operações" />
          </div>
          <div>
            <Label htmlFor="events">Eventos</Label>
            <select
              id="events"
              name="events"
              defaultValue="all"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="all">Todos os eventos</option>
              {NOTIF_PREF_ORDER.map((t) => (
                <option key={t} value={t}>
                  {NOTIF_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="url">URL do endpoint *</Label>
            <Input id="url" name="url" type="url" required placeholder="https://exemplo.com/webhooks/alianza" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="secret">Assinatura secreta (opcional)</Label>
            <Input id="secret" name="secret" placeholder="Enviada no header X-Alianza-Signature" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">
              <Webhook size={15} /> Cadastrar webhook
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
