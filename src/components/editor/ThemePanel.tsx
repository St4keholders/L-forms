"use client";

import clsx from "clsx";
import { Check, Droplet, Flame, Grid, Layers, Moon, Palette, Shapes, Shield, Sparkles, Sun, Type } from "lucide-react";
import { AmbientOrbs, Modal, TextField, Toggle } from "@/components/ui";
import { FONT_CLASS, PATTERN_CLASS, getThemeCardClass } from "@/lib/theme";
import type { FormTheme } from "@/lib/types";
import { useEditor } from "@/store/editor";

const THEME_ACCENTS = [
  { hex: "#0071E3", name: "Azul Real" },
  { hex: "#5856D6", name: "Índigo" },
  { hex: "#AF52DE", name: "Púrpura" },
  { hex: "#FF2D55", name: "Rosa" },
  { hex: "#FF9500", name: "Naranja" },
  { hex: "#34C759", name: "Verde Esmeralda" },
  { hex: "#30B0C7", name: "Cian Menta" },
  { hex: "#1D1D1F", name: "Grafito" },
];

const THEME_BACKGROUNDS = [
  { hex: "#F5F5F7", name: "Canvas Neutro" },
  { hex: "#FFFFFF", name: "Blanco Puro" },
  { hex: "#F0F4F8", name: "Hielo Polar" },
  { hex: "#F5F3FF", name: "Lavanda" },
  { hex: "#FDF2F4", name: "Pétalo" },
  { hex: "#FBF8F2", name: "Marfil" },
];

const CARD_STYLES: { value: NonNullable<FormTheme["cardStyle"]>; label: string; desc: string; icon: typeof Sparkles }[] = [
  { value: "liquid-glass", label: "Liquid Glass Pro", desc: "Vidrio esmerilado con refracción y brillo translúcido", icon: Sparkles },
  { value: "apple-clean", label: "Minimalista Limpio", desc: "Superficie blanca pura con elevación y sombra suave", icon: Layers },
  { value: "metallic", label: "Metalizado", desc: "Aluminio cepillado con reflejos metálicos y brillo satinado", icon: Shield },
  { value: "embossed", label: "Relieve Háptico 3D", desc: "Bisel esculpido táctil con doble sombra cerámica", icon: Layers },
  { value: "bordered", label: "Contorno Editorial", desc: "Borde fino de alto contraste, moderno y limpio", icon: Shapes },
];

const RADIUS_OPTIONS: { value: NonNullable<FormTheme["borderRadius"]>; label: string; px: string }[] = [
  { value: "lg", label: "Squircle Continuo", px: "24px" },
  { value: "md", label: "Redondeado", px: "16px" },
  { value: "sm", label: "Suave", px: "10px" },
  { value: "full", label: "Carcasa", px: "32px" },
];

const BUTTON_SHAPES: { value: NonNullable<FormTheme["buttonShape"]>; label: string }[] = [
  { value: "pill", label: "Cápsula (Pill)" },
  { value: "rounded", label: "Redondeado" },
];

const BACKGROUND_PATTERNS: { value: NonNullable<FormTheme["backgroundPattern"]>; label: string; desc: string }[] = [
  { value: "aurora-orbs", label: "Orbs Aurora (Luz Viva)", desc: "Esferas de luz orgánicas flotantes en movimiento" },
  { value: "floating-shapes", label: "Formas Flotantes", desc: "Anillos y marcos geométricos flotantes con gradientes" },
  { value: "mesh", label: "Malla Gradiente (Mesh)", desc: "Fondo degradado vivo y dinámico multicolor" },
  { value: "soft-glow", label: "Resplandor Superior", desc: "Haz de luz ambiental con tu color de acento" },
  { value: "dots", label: "Micro Puntos", desc: "Cuadrícula técnica visible de precisión" },
  { value: "grid-lines", label: "Retícula Técnica", desc: "Líneas de plano arquitectónico moderno" },
  { value: "none", label: "Sólido", desc: "Color plano limpio sin efectos adicionales" },
];

const FONTS: { value: FormTheme["font"]; label: string; sample: string; className: string }[] = [
  { value: "sf-pro", label: "SF Pro", sample: "Tipografía moderna del sistema", className: "font-theme-sf-pro" },
  { value: "inter", label: "Inter", sample: "Moderna, limpia y altamente legible", className: "font-theme-inter" },
  { value: "space-grotesk", label: "Space Grotesk", sample: "Editorial contemporáneo", className: "font-theme-grotesk" },
  { value: "serif", label: "New York (Serif)", sample: "Clásica y distinguida", className: "font-theme-serif" },
  { value: "mono", label: "SF Mono", sample: "Código y datos tabulares", className: "font-theme-mono" },
];

export function ThemePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useEditor((s) => s.form);
  const update = useEditor((s) => s.update);
  if (!form) return null;

  const currentTheme = form.theme;
  const currentCardStyle = currentTheme.cardStyle ?? "apple-clean";
  const currentRadius = currentTheme.borderRadius ?? "lg";
  const currentButtonShape = currentTheme.buttonShape ?? "pill";
  const currentPattern = currentTheme.backgroundPattern ?? "none";

  const setTheme = (patch: Partial<FormTheme>) =>
    update((draft) => void Object.assign(draft.theme, patch));

  return (
    <Modal open={open} onClose={onClose} title="Diseño y Personalización" width="max-w-xl">
      <div className="space-y-6 text-ink">
        {/* Tarjeta de Demostración en Tiempo Real */}
        <div
          className={clsx(
            "relative overflow-hidden rounded-[26px] border border-black/10 p-4 transition-all duration-300",
            PATTERN_CLASS[currentPattern],
          )}
          style={{
            backgroundColor: currentTheme.backgroundColor,
            ["--color-brand" as string]: currentTheme.primaryColor,
            ["--glow-color" as string]: `${currentTheme.primaryColor}50`,
          }}
        >
          <AmbientOrbs
            accentColor={currentTheme.primaryColor}
            pattern={currentPattern}
            containerMode="absolute"
          />
          <div
            className={clsx(
              "relative z-10 p-5 transition-all duration-300",
              getThemeCardClass(currentTheme),
              FONT_CLASS[currentTheme.font ?? "sf-pro"],
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Demostración en vivo
                </span>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                  currentCardStyle === "metallic"
                    ? "bg-slate-900/10 text-slate-800 border border-slate-300/60"
                    : "bg-black/[0.05] text-ink",
                )}
              >
                {CARD_STYLES.find((s) => s.value === currentCardStyle)?.label ?? "Estilo"}
              </span>
            </div>

            <p className="mt-2 text-base font-bold tracking-tight text-ink">
              ¿Cómo calificarías este diseño?
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Previsualiza en tiempo real materiales, curvatura y efectos.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div
                className={clsx(
                  "flex flex-1 items-center justify-between px-3.5 py-2 transition-all duration-200",
                  currentTheme.optionStyle === "card"
                    ? currentCardStyle === "metallic"
                      ? "rounded-xl border border-slate-300/80 bg-white/70 shadow-xs text-slate-900"
                      : "rounded-xl border border-black/[0.08] bg-white/75 shadow-xs text-ink"
                    : currentCardStyle === "metallic"
                      ? "border-b border-slate-400/40 text-slate-900"
                      : "border-b border-black/20 text-ink",
                )}
              >
                <span className="text-xs font-medium">Opción regular</span>
                <span className={clsx("h-2 w-2 rounded-full border", currentCardStyle === "metallic" ? "border-slate-400" : "border-black/30")} />
              </div>

              <div
                className={clsx(
                  "flex flex-1 items-center justify-between px-3.5 py-2 text-white shadow-xs transition-all duration-200",
                  currentTheme.buttonShape === "rounded" ? "rounded-xl" : "rounded-full",
                )}
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <span className="text-xs font-semibold">Seleccionada</span>
                <Check size={14} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* 1. Efecto y Material de la Tarjeta */}
        <section>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0071E3]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Efecto & Superficie
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {CARD_STYLES.map((style) => {
              const active = currentCardStyle === style.value;
              const Icon = style.icon;
              return (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setTheme({ cardStyle: style.value })}
                  className={clsx(
                    "flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all duration-150 active:scale-[0.98]",
                    active
                      ? "border-[#0071E3] bg-[#0071E3]/[0.06] shadow-xs"
                      : "border-black/[0.08] bg-white hover:bg-black/[0.02]",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <Icon size={14} className={active ? "text-[#0071E3]" : "text-muted"} />
                      {style.label}
                    </span>
                    {active && <Check size={14} className="text-[#0071E3]" />}
                  </div>
                  <span className="mt-1 text-[11px] text-muted">{style.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Formas y Curvatura Squircle */}
        <section>
          <div className="flex items-center gap-2">
            <Shapes size={16} className="text-[#0071E3]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Curvatura & Formas
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {RADIUS_OPTIONS.map((r) => {
              const active = currentRadius === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setTheme({ borderRadius: r.value })}
                  className={clsx(
                    "flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all duration-150 active:scale-[0.97]",
                    active
                      ? "border-[#0071E3] bg-[#0071E3]/[0.06]"
                      : "border-black/[0.08] bg-white hover:bg-black/[0.02]",
                  )}
                >
                  <span className="text-xs font-medium text-ink">{r.label}</span>
                  <span className="mt-0.5 text-[10px] text-muted">{r.px}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white p-3">
            <span className="text-xs font-medium text-ink">Forma de los Botones</span>
            <div className="inline-flex rounded-full bg-black/[0.06] p-0.5">
              {BUTTON_SHAPES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setTheme({ buttonShape: b.value })}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                    currentButtonShape === b.value
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Color Principal / Acento */}
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-[#0071E3]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Color de Acento
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-xs font-medium text-muted hover:bg-black/[0.02]">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span className="font-mono uppercase">{currentTheme.primaryColor}</span>
                <input
                  type="color"
                  value={currentTheme.primaryColor}
                  onChange={(e) => setTheme({ primaryColor: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {THEME_ACCENTS.map((color) => {
              const active = currentTheme.primaryColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  onClick={() => setTheme({ primaryColor: color.hex })}
                  className={clsx(
                    "relative grid h-8 w-8 place-items-center rounded-full transition-transform active:scale-90",
                    active ? "scale-110 ring-2 ring-[#0071E3] ring-offset-2" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {active && <Check size={14} className="text-white drop-shadow-xs" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Fondo y Efectos Ambientales */}
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplet size={16} className="text-[#0071E3]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Color & Efecto de Fondo
              </h3>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-xs font-medium text-muted hover:bg-black/[0.02]">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: currentTheme.backgroundColor }}
              />
              <span className="font-mono uppercase">{currentTheme.backgroundColor}</span>
              <input
                type="color"
                value={currentTheme.backgroundColor}
                onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                className="sr-only"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {THEME_BACKGROUNDS.map((color) => {
              const active = currentTheme.backgroundColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  onClick={() => setTheme({ backgroundColor: color.hex })}
                  className={clsx(
                    "relative grid h-8 w-8 place-items-center rounded-full border border-black/10 transition-transform active:scale-90",
                    active ? "scale-110 ring-2 ring-[#0071E3] ring-offset-2" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {active && <Check size={14} className="text-ink drop-shadow-xs" />}
                </button>
              );
            })}
          </div>

          {/* Patrón dinámico y formas de fondo */}
          <div className="mt-4">
            <span className="mb-2 block text-xs font-semibold text-ink">Efecto & Formas de Fondo</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BACKGROUND_PATTERNS.map((p) => {
                const active = currentPattern === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTheme({ backgroundPattern: p.value })}
                    className={clsx(
                      "flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all duration-150 active:scale-95",
                      active
                        ? "border-[#0071E3] bg-[#0071E3]/[0.08] shadow-xs"
                        : "border-black/[0.08] bg-white hover:bg-black/[0.02]",
                    )}
                  >
                    <span className={clsx("text-xs font-semibold", active ? "text-[#0071E3]" : "text-ink")}>
                      {p.label}
                    </span>
                    <span className="mt-0.5 text-[10px] text-muted leading-tight">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Efectos Visuales Avanzados (Glow y Tarjetas de Respuesta) */}
        <section className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-[#FF9500]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Efectos Visuales Avanzados
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-ink">Halo Luminoso en Tarjetas</span>
              <span className="block text-[11px] text-muted">
                Envuelve las tarjetas en un resplandor ambiental suave con el color de acento
              </span>
            </div>
            <Toggle
              checked={Boolean(currentTheme.cardGlow)}
              onChange={(cardGlow) => setTheme({ cardGlow })}
              label="Halo luminoso en tarjetas"
            />
          </div>

          <div className="flex items-center justify-between border-t border-black/[0.06] pt-3">
            <div>
              <span className="block text-xs font-semibold text-ink">Opciones en Formato Tarjeta</span>
              <span className="block text-[11px] text-muted">
                Muestra las opciones de respuesta como tarjetas seleccionables interactivas
              </span>
            </div>
            <Toggle
              checked={currentTheme.optionStyle === "card"}
              onChange={(val) => setTheme({ optionStyle: val ? "card" : "classic" })}
              label="Tarjetas interactivas de respuesta"
            />
          </div>
        </section>

        {/* 5. Tipografía */}
        <section>
          <div className="flex items-center gap-2">
            <Type size={16} className="text-[#0071E3]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Tipografia
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FONTS.map((font) => {
              const active = currentTheme.font === font.value;
              return (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => setTheme({ font: font.value })}
                  className={clsx(
                    "flex flex-col items-start rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
                    font.className,
                    active
                      ? "border-[#0071E3] bg-[#0071E3]/[0.06]"
                      : "border-black/[0.08] bg-white hover:bg-black/[0.02]",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-ink">{font.label}</span>
                    {active && <Check size={14} className="text-[#0071E3]" />}
                  </div>
                  <span className="mt-1 text-[11px] text-muted">{font.sample}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. Imagen de Cabecera */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Imagen de Cabecera (Opcional)
          </h3>
          <TextField
            className="mt-2 text-xs"
            placeholder="https://images.unsplash.com/..."
            value={currentTheme.headerImage ?? ""}
            onChange={(e) => setTheme({ headerImage: e.target.value })}
            aria-label="URL de la imagen de cabecera"
          />
        </section>
      </div>
    </Modal>
  );
}
