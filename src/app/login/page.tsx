"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Logo, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/forms");
  }, [loading, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="aurora-container relative hidden flex-col justify-between p-10 text-white lg:flex">
        {/* Haces de luz dinámicos Aurora */}
        <div className="aurora-beam-1 pointer-events-none" aria-hidden="true" />
        <div className="aurora-beam-2 pointer-events-none" aria-hidden="true" />
        <div className="aurora-beam-3 pointer-events-none" aria-hidden="true" />

        {/* Formas geométricas flotantes estilo Aurora / OBS */}
        <div className="aurora-glass-shape-1 pointer-events-none" aria-hidden="true" />
        <div className="aurora-glass-shape-2 pointer-events-none" aria-hidden="true" />
        <div className="aurora-glass-shape-3 pointer-events-none" aria-hidden="true" />

        {/* Capa de contraste y micro-blur */}
        <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[1px]" aria-hidden="true" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-white drop-shadow-sm">
            Preguntas, respuestas y firmas en un mismo lugar.
          </h1>
          <p className="mt-4 text-sm text-white/85 leading-relaxed">
            Crea un formulario desde una plantilla, compártelo con un enlace o código QR y revisa las
            respuestas a medida que llegan.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/50">© L-Forms</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-8 text-2xl font-semibold lg:mt-0">Inicia sesion</h2>
          <p className="mt-1 text-sm text-muted">Entra para ver y editar tus formularios.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Correo electronico
              </label>
              <TextField
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Contrasena
              </label>
              <TextField
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Iniciar sesion"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
