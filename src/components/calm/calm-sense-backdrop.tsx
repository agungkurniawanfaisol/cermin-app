/**
 * Latar tenang low-stimulation (CERMIN / anak autistik).
 * Tanpa animasi, neon, confetti, atau pola rapat.
 */
type Variant = "belajar" | "sesi" | "dashboard";

type Props = {
  variant?: Variant;
};

function SoftHills({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-[32%] w-full min-h-[8rem] text-[var(--accent-soft,#e6f2ee)]"
      style={{ opacity }}
      viewBox="0 0 1200 240"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 140 C200 90 340 170 520 120 C700 70 860 160 1040 110 C1120 90 1170 100 1200 95 L1200 240 L0 240 Z"
      />
      <path
        fill="color-mix(in srgb, var(--cermin-accent, #3d7c6b) 12%, white)"
        d="M0 180 C220 140 400 200 580 155 C780 100 940 190 1120 150 C1160 140 1185 145 1200 142 L1200 240 L0 240 Z"
      />
    </svg>
  );
}

function OpenBookCue({
  side,
}: {
  side: "left" | "right";
}) {
  const sideClass =
    side === "left"
      ? "left-[3%] lg:left-[5%]"
      : "right-[3%] -scale-x-100 lg:right-[5%]";
  return (
    <svg
      className={`absolute bottom-[14%] hidden w-[6.5rem] text-[var(--cermin-accent,#3d7c6b)] opacity-[0.16] sm:block md:w-[8rem] md:opacity-[0.2] ${sideClass}`}
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden
    >
      <path
        d="M60 18 C48 10 28 10 14 16 V78 C30 70 48 70 60 78 C72 70 90 70 106 78 V16 C92 10 72 10 60 18 Z"
        fill="currentColor"
        fillOpacity={0.4}
      />
      <path
        d="M60 18 V78"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.65}
      />
      <path
        d="M28 34 H48 M28 46 H46 M28 58 H42 M72 34 H92 M74 46 H92 M78 58 H92"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.5}
      />
    </svg>
  );
}

export function CalmSenseBackdrop({ variant = "sesi" }: Props) {
  const isBelajar = variant === "belajar";
  const isDashboard = variant === "dashboard";
  const isSesi = variant === "sesi";

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Dasar cream/sage tenang */}
      <div
        className={
          isBelajar
            ? "absolute inset-0 bg-[var(--belajar-ground,#eef3f0)]"
            : "absolute inset-0 bg-[var(--bg,#f7f4ef)]"
        }
      />

      {/* Cahaya jendela atas — orientasi “ruang tenang” */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_-8%,#ffffff_0%,transparent_55%)]" />
      <div
        className={
          isBelajar
            ? "absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_12%_18%,color-mix(in_srgb,var(--belajar-accent-soft,#e6f2ee)_85%,white)_0%,transparent_68%)]"
            : "absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_16%,color-mix(in_srgb,var(--accent-soft,#e6f2ee)_90%,white)_0%,transparent_68%)]"
        }
      />
      <div
        className={
          isBelajar
            ? "absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_90%_12%,color-mix(in_srgb,var(--belajar-accent,#3d7c6b)_7%,transparent)_0%,transparent_62%)]"
            : "absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_92%_14%,color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_8%,transparent)_0%,transparent_62%)]"
        }
      />

      {/* Horizon lembut — “lantai baca” (bukan pola ramai) */}
      {!isDashboard ? <SoftHills opacity={isBelajar ? 0.4 : 0.55} /> : null}
      {isDashboard ? (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--accent-soft,#e6f2ee)_55%,transparent),transparent)]" />
      ) : null}

      {/* Blob besar sangat lembut — hanya sesi/dashboard, belajar lebih polos */}
      {!isBelajar ? (
        <>
          <div className="absolute -left-20 top-[10%] size-[12rem] rounded-full bg-[color-mix(in_srgb,var(--accent-soft,#e6f2ee)_75%,white)] opacity-60 blur-[2px] sm:size-[16rem]" />
          <div className="absolute -right-24 top-[6%] size-[14rem] rounded-full bg-[color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_7%,white)] opacity-70 blur-[2px] sm:size-[18rem]" />
        </>
      ) : (
        <div className="absolute left-1/2 top-[8%] size-[min(70vw,28rem)] -translate-x-1/2 rounded-full bg-white/35 blur-[3px]" />
      )}

      {/* Isyarat buku hanya di wizard mulai sesi */}
      {isSesi ? (
        <>
          <OpenBookCue side="left" />
          <OpenBookCue side="right" />
        </>
      ) : null}

      {/* Titik sangat jarang — tidak di child mode (hindari noise) */}
      {isSesi || isDashboard ? (
        <div
          className={isDashboard ? "absolute inset-0 opacity-[0.1]" : "absolute inset-0 opacity-[0.12]"}
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--cermin-accent, #3d7c6b) 22%, transparent) 1.25px, transparent 0)",
            backgroundSize: isDashboard ? "56px 56px" : "52px 52px",
            backgroundPosition: "10px 6px",
          }}
        />
      ) : null}

      {/* Vignette tengah: fokus konten, tepi lebih tenang */}
      <div
        className={
          isBelajar
            ? "absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_40%,transparent_40%,color-mix(in_srgb,var(--belajar-ground,#eef3f0)_70%,transparent)_100%)]"
            : "absolute inset-0 bg-[radial-gradient(ellipse_78%_68%_at_50%_40%,transparent_38%,color-mix(in_srgb,var(--bg,#f7f4ef)_60%,transparent)_100%)]"
        }
      />
    </div>
  );
}
