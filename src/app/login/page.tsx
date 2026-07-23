import { loginAction } from "./actions";
import { Button, Input, Label } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5 text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white">
            A
          </span>
          Aurora <span className="font-medium text-neutral-400">Licensing</span>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-lg font-semibold">Entrar</h1>
          <p className="mb-5 text-sm text-neutral-500">Acesse a plataforma de licenciamento.</p>
          <form action={loginAction} className="grid gap-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required defaultValue="admin@novasport.com" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {sp.error && <p className="text-sm text-red-600">Credenciais inválidas.</p>}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-xs text-neutral-400">
            Demo: <span className="font-medium">admin@novasport.com</span> / <span className="font-medium">aurora123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
