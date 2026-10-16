/**
 * Latar tenang untuk wizard mulai sesi.
 * Bentuk besar + isyarat buku (cerita) — tanpa animasi, tanpa neon.
 */
export function SesiCalmBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Dasar cream hangat */}
      <div className="absolute inset-0 bg-[var(--bg,#f7f4ef)]" />

      {/* Cahaya lembut atas — seperti jendela tenang */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-5%,#ffffff_0%,transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_8%_20%,color-mix(in_srgb,var(--accent-soft,#e6f2ee)_95%,white)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_92%_18%,color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_11%,transparent)_0%,transparent_65%)]" />

      {/* Bukit lembut bawah — “tempat duduk baca” */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[38%] w-full min-h-[11rem] text-[var(--accent-soft,#e6f2ee)]"
        viewBox="0 0 1200 280"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          fillOpacity={0.55}
          d="M0 180 C180 120 320 220 480 160 C640 100 760 200 920 150 C1040 110 1120 140 1200 120 L1200 280 L0 280 Z"
        />
        <path
          fill="color-mix(in srgb, var(--cermin-accent, #3d7c6b) 14%, white)"
          d="M0 220 C200 170 360 240 520 190 C700 130 840 230 1000 185 C1100 160 1160 175 1200 165 L1200 280 L0 280 Z"
        />
      </svg>

      {/* Awan / gelembung besar — penanda ruang tenang, bukan noise */}
      <div className="absolute -left-16 top-[12%] size-[14rem] rounded-full bg-[color-mix(in_srgb,var(--accent-soft,#e6f2ee)_80%,white)] opacity-70 blur-[1px] sm:size-[18rem]" />
      <div className="absolute -right-20 top-[8%] size-[16rem] rounded-full bg-[color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_8%,white)] opacity-80 blur-[1px] sm:size-[22rem]" />
      <div className="absolute left-[28%] top-[42%] size-[10rem] rounded-full bg-white/50 blur-[0.5px] sm:size-[14rem]" />

      {/* Isyarat cerita: buku terbuka (kiri) — membantu paham “ini waktu baca” */}
      <svg
        className="absolute bottom-[18%] left-[4%] hidden w-[7.5rem] text-[var(--cermin-accent,#3d7c6b)] opacity-[0.22] sm:block md:w-[9.5rem] md:opacity-[0.28] lg:left-[6%]"
        viewBox="0 0 120 96"
        fill="none"
      >
        <path
          d="M60 18 C48 10 28 10 14 16 V78 C30 70 48 70 60 78 C72 70 90 70 106 78 V16 C92 10 72 10 60 18 Z"
          fill="currentColor"
          fillOpacity={0.35}
        />
        <path
          d="M60 18 V78"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.7}
        />
        <path
          d="M28 34 H48 M28 46 H46 M28 58 H42"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.55}
        />
        <path
          d="M72 34 H92 M74 46 H92 M78 58 H92"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.55}
        />
      </svg>

      {/* Isyarat cerita: buku terbuka (kanan, cermin) */}
      <svg
        className="absolute bottom-[16%] right-[4%] hidden w-[7.5rem] -scale-x-100 text-[var(--cermin-accent,#3d7c6b)] opacity-[0.2] sm:block md:w-[9.5rem] md:opacity-[0.26] lg:right-[6%]"
        viewBox="0 0 120 96"
        fill="none"
      >
        <path
          d="M60 18 C48 10 28 10 14 16 V78 C30 70 48 70 60 78 C72 70 90 70 106 78 V16 C92 10 72 10 60 18 Z"
          fill="currentColor"
          fillOpacity={0.35}
        />
        <path
          d="M60 18 V78"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.7}
        />
        <path
          d="M28 34 H48 M28 46 H46 M28 58 H42"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.55}
        />
        <path
          d="M72 34 H92 M74 46 H92 M78 58 H92"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.55}
        />
      </svg>

      {/* Titik-titik sangat jarang — bukan grid rapat */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--cermin-accent, #3d7c6b) 28%, transparent) 1.5px, transparent 0)",
          backgroundSize: "48px 48px",
          backgroundPosition: "12px 8px",
        }}
      />

      {/* Bingkai lembut agar konten di tengah lebih jelas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_42%,transparent_35%,color-mix(in_srgb,var(--bg,#f7f4ef)_55%,transparent)_100%)]" />
    </div>
  );
}
