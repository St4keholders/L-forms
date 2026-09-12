"use client";

import clsx from "clsx";
import { use, useEffect, useState } from "react";
import { FormRenderer } from "@/components/public/FormRenderer";
import { Spinner } from "@/components/ui";
import { dataSource } from "@/lib/data";
import type { FormDoc } from "@/lib/types";

export default function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<FormDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let active = true;
    dataSource
      .getForm(id)
      .then((found) => {
        if (!active) return;
        setForm(found);
        setState(found ? "ready" : "missing");
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <main className="grid min-h-screen place-items-center">
        <Spinner label="Abriendo formulario" />
      </main>
    );
  }

  if (state === "missing" || !form) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="lf-card max-w-md p-8 text-center">
          <h1 className="text-xl font-medium">No encontramos este formulario</h1>
          <p className="mt-2 text-sm text-muted">
            El enlace puede estar incompleto o el formulario pudo haberse eliminado. Pide al autor
            que te lo comparta de nuevo.
          </p>
        </div>
      </main>
    );
  }

  if (form.status !== "published") {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="lf-card max-w-md p-8 text-center">
          <h1 className="text-xl font-medium">{form.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Este formulario todavia no acepta respuestas. Su autor debe publicarlo primero.
          </p>
        </div>
      </main>
    );
  }

  const pattern = form.theme.backgroundPattern ?? "none";
  const isMesh = pattern === "mesh" || pattern === "mesh-gradient";
  const isDots = pattern === "dots" || pattern === "subtle-dots";
  const isSoftGlow = pattern === "soft-glow";

  return (
    <main
      className={clsx(
        "min-h-screen transition-colors duration-300",
        isMesh && "bg-pattern-mesh",
        isSoftGlow && "bg-pattern-soft-glow",
        isDots && "bg-pattern-dots",
      )}
      style={{ backgroundColor: form.theme.backgroundColor }}
    >
      <FormRenderer form={form} />
    </main>
  );
}
