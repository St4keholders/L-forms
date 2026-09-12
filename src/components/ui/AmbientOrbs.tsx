"use client";

import clsx from "clsx";

interface Props {
  accentColor?: string;
  pattern?: string;
  cardStyle?: string;
  containerMode?: "fixed" | "absolute";
}

export function AmbientOrbs({
  accentColor = "#0071E3",
  pattern = "none",
  containerMode = "fixed",
}: Props) {
  const showOrbs = pattern === "aurora-orbs" || pattern === "floating-shapes";

  if (!showOrbs) return null;

  return (
    <div
      className={clsx(
        "pointer-events-none z-0 overflow-hidden",
        containerMode === "fixed" ? "fixed inset-0" : "absolute inset-0",
      )}
      aria-hidden="true"
    >
      {pattern === "aurora-orbs" && (
        <>
          {/* Orb 1: Color de acento principal */}
          <div
            className="ambient-orb-1 absolute -top-20 -left-16 h-80 w-80 rounded-full opacity-50 filter blur-[80px] sm:h-[450px] sm:w-[450px]"
            style={{ backgroundColor: accentColor }}
          />

          {/* Orb 2: Tono violeta/índigo suave */}
          <div className="ambient-orb-2 absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#AF52DE] opacity-40 filter blur-[90px] sm:h-[480px] sm:w-[480px]" />

          {/* Orb 3: Tono cian/menta refrescante */}
          <div className="ambient-orb-3 absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[#30B0C7] opacity-35 filter blur-[80px] sm:h-[420px] sm:w-[420px]" />
        </>
      )}

      {pattern === "floating-shapes" && (
        <>
          {/* Anillo geométrico decorativo 1 */}
          <div
            className="ambient-orb-1 absolute top-20 left-8 h-64 w-64 rounded-full border-2 sm:h-80 sm:w-80"
            style={{
              background: `radial-gradient(circle, transparent 45%, ${accentColor}25 100%)`,
              borderColor: `${accentColor}50`,
            }}
          />
          {/* Squircle flotante */}
          <div
            className="ambient-orb-2 absolute top-1/2 right-8 h-64 w-64 rounded-[44px] border border-black/10 bg-white/30 shadow-md backdrop-blur-[2px] -rotate-12 sm:h-80 sm:w-80"
            style={{ borderColor: `${accentColor}40` }}
          />
          {/* Anillo concéntrico con acento */}
          <div
            className="ambient-orb-3 absolute -bottom-20 left-1/4 h-72 w-72 rounded-full border-2 border-dashed sm:h-96 sm:w-96"
            style={{ borderColor: `${accentColor}45` }}
          />
        </>
      )}
    </div>
  );
}

