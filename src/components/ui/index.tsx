"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Boton                                                                */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  shape?: "pill" | "rounded";
}

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0071E3] text-white border border-[#0071E3]/20 hover:bg-[#0077ED] active:bg-[#0062C4] shadow-sm",
  secondary:
    "bg-white text-ink border border-black/10 hover:bg-black/[0.03] active:bg-black/[0.06] shadow-xs",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-black/[0.04] hover:text-ink active:bg-black/[0.08]",
  danger:
    "bg-white text-danger border border-danger/20 hover:bg-red-50 active:bg-red-100 shadow-xs",
};

export function Button({
  variant = "secondary",
  size = "md",
  shape = "pill",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        shape === "pill" ? "rounded-full" : "rounded-xl",
        size === "sm" ? "h-8 px-3.5 text-xs" : "h-9.5 px-4 text-sm",
        BUTTON_STYLES[variant],
        className,
      )}
    />
  );
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={clsx(
        "grid h-8.5 w-8.5 place-items-center rounded-full text-muted transition-all duration-150 ease-out hover:bg-black/[0.05] hover:text-ink active:scale-90 active:bg-black/[0.08] disabled:opacity-30 disabled:hover:bg-transparent",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Campos                                                               */
/* ------------------------------------------------------------------ */

export function TextField({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border bg-surface/90 px-3.5 py-2 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20",
        invalid ? "border-danger focus:ring-danger/20" : "border-line hover:border-black/20",
        className,
      )}
    />
  );
}

/** Campo con subrayado, el estilo del editor. */
export function UnderlineInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "lf-underline w-full bg-transparent px-1 py-1.5 outline-none placeholder:text-faint",
        className,
      )}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "rounded-xl border border-line bg-surface/90 px-3 py-2 text-sm outline-none transition-all duration-150 hover:border-black/20 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20",
        className,
      )}
    >
      {children}
    </select>
  );
}

/** Switch estilo iOS */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-250 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-[#34C759]" : "bg-[#E5E5EA]",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.18)] transition-transform duration-250 ease-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                                */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 backdrop-blur-md p-4 py-10 transition-all duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={clsx("lf-card w-full rounded-[24px] bg-surface/95 backdrop-blur-xl border border-white/40 shadow-2xl", width)}>
        <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marca                                                                */
/* ------------------------------------------------------------------ */

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-[family-name:var(--font-display)] text-sm font-bold text-white"
      >
        L
      </span>
      {!compact && (
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          L-Forms
        </span>
      )}
    </span>
  );
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="lf-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

export { AmbientOrbs } from "./AmbientOrbs";

