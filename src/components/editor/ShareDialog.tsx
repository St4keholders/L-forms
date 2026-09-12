"use client";

import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Modal, Select, Spinner, TextField } from "@/components/ui";
import { dataSource } from "@/lib/data";
import type { Collaborator, CollaboratorRole } from "@/lib/types";
import { useEditor } from "@/store/editor";

type Tab = "link" | "embed" | "people";

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useEditor((s) => s.form);
  const [tab, setTab] = useState<Tab>("link");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const formId = form?.id;

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!open || tab !== "people" || !formId) return;
    setLoadingPeople(true);
    setPeopleError(null);
    dataSource
      .listCollaborators(formId)
      .then(setCollaborators)
      .catch((err) => setPeopleError(err instanceof Error ? err.message : "No se pudo cargar."))
      .finally(() => setLoadingPeople(false));
  }, [open, tab, formId]);

  async function invite() {
    if (!formId) return;
    setInviting(true);
    setPeopleError(null);
    try {
      const created = await dataSource.addCollaborator(formId, collaborator, role);
      setCollaborators((prev) => [...prev, created]);
      setCollaborator("");
    } catch (err) {
      setPeopleError(err instanceof Error ? err.message : "No se pudo invitar.");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(email: string) {
    if (!formId) return;
    await dataSource.removeCollaborator(formId, email);
    setCollaborators((prev) => prev.filter((c) => c.email !== email));
  }

  if (!form) return null;

  const url = `${origin}/f/${form.id}`;
  const embed = `<iframe src="${url}" width="640" height="800" frameborder="0" title="${form.title}"></iframe>`;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "link", label: "Enlace" },
    { id: "embed", label: "Insertar" },
    { id: "people", label: "Colaboradores" },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Enviar formulario">
      {form.status !== "published" && (
        <p className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-xs font-medium text-amber-800">
          Este formulario esta en borrador. Publicalo para que el enlace acepte respuestas.
        </p>
      )}

      <div className="mb-4 flex justify-start">
        <div className="inline-flex rounded-full bg-black/[0.06] p-1 shadow-inner">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                "rounded-full px-3.5 py-1 text-xs font-semibold tracking-tight transition-all duration-150",
                tab === item.id
                  ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "text-muted hover:text-ink active:scale-95",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "link" && (
        <div className="mt-4">
          <div className="flex gap-2">
            <TextField readOnly value={url} aria-label="Enlace del formulario" />
            <Button onClick={() => void copy(url, "link")}>
              {copied === "link" ? <Check size={16} /> : <Copy size={16} />}
              {copied === "link" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Cualquiera con el enlace puede responder mientras el formulario este publicado.
          </p>
        </div>
      )}

      {tab === "embed" && (
        <div className="mt-4">
          <textarea
            readOnly
            rows={4}
            value={embed}
            aria-label="Codigo para insertar"
            className="w-full rounded-lg border border-line bg-brand-tint p-3 font-theme-mono text-xs"
          />
          <Button className="mt-2" onClick={() => void copy(embed, "embed")}>
            {copied === "embed" ? <Check size={16} /> : <Copy size={16} />}
            {copied === "embed" ? "Copiado" : "Copiar codigo"}
          </Button>
        </div>
      )}

      {tab === "people" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <TextField
              type="email"
              placeholder="correo@ejemplo.com"
              className="min-w-48 flex-1"
              value={collaborator}
              onChange={(e) => setCollaborator(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void invite()}
              aria-label="Correo del colaborador"
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              aria-label="Permiso del colaborador"
            >
              <option value="editor">Puede editar</option>
              <option value="viewer">Solo ver respuestas</option>
            </Select>
            <Button onClick={() => void invite()} disabled={inviting || !collaborator}>
              {inviting ? "Invitando..." : "Invitar"}
            </Button>
          </div>

          {peopleError && (
            <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
              {peopleError}
            </p>
          )}

          {loadingPeople ? (
            <div className="mt-4">
              <Spinner label="Cargando colaboradores" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Todavia no has invitado a nadie. Quien reciba la invitacion podra abrir este
              formulario desde su propia cuenta.
            </p>
          ) : (
            <ul className="mt-4 space-y-1.5 text-sm">
              {collaborators.map((person) => (
                <li
                  key={person.email}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{person.email}</span>
                    <span className="block text-xs text-muted">
                      {person.role === "editor" ? "Puede editar" : "Solo ver respuestas"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void revoke(person.email)}
                    className="shrink-0 text-xs text-muted hover:text-danger"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </Modal>
  );
}
