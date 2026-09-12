"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Logo, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { isMock } from "@/lib/data";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, name);
      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Con una cuenta guardas tus formularios y recibes las respuestas.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Nombre
            </label>
            <TextField
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como te llamamos"
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        {!isMock && (
          <p className="mt-4 text-xs text-muted">
            Si tu proyecto de Supabase exige confirmar el correo, revisa tu bandeja antes de entrar.
          </p>
        )}

        <p className="mt-6 text-sm text-muted">
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand underline underline-offset-2">
            Inicia sesion
          </Link>
        </p>
      </div>
    </main>
  );
}
