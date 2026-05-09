import { useState, useCallback, type ReactNode } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";

type Phase = "closed" | "opening" | "pulling" | "reading";

interface EnvelopeLetterProps {
  children: ReactNode;
}

const ENVELOPE_W = 520;
const ENVELOPE_H = 340;
const LETTER_W = 480;
const LETTER_H = 720;
const FLAP_H = 130;

function EnvelopeLetter({ children }: EnvelopeLetterProps) {
  const [phase, setPhase] = useState<Phase>("closed");

  const handleClick = useCallback(() => {
    if (phase === "closed") setPhase("opening");
  }, [phase]);

  const handleOpeningComplete = useCallback(() => {
    setPhase("pulling");
  }, []);

  const handlePullingComplete = useCallback(() => {
    setPhase("reading");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Envelope + Letter container */}
      <div className="relative" style={{ width: ENVELOPE_W, perspective: "1200px" }}>
        <LazyMotion features={domAnimation}>
        {/* ===== LETTER (behind envelope, slides up) ===== */}
        <AnimatePresence>
          {(phase === "pulling" || phase === "reading") && (
            <m.div
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: phase === "reading" ? -(LETTER_H - ENVELOPE_H + 100) : -200,
                opacity: 1,
              }}
              transition={
                phase === "reading" ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }
              }
              onAnimationComplete={handlePullingComplete}
              className="absolute left-1/2 z-0"
              style={{
                width: LETTER_W,
                marginLeft: -LETTER_W / 2,
                top: ENVELOPE_H - 40,
              }}
            >
              <div
                className="relative overflow-hidden rounded-sm"
                style={{
                  background: "#faf8f0",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {/* Folded top edge of letter */}
                <div
                  className="absolute left-0 right-0 top-0 z-10"
                  style={{
                    height: "8px",
                    background: "linear-gradient(to bottom, #e8e4da, #faf8f0)",
                  }}
                />
                {children}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ===== ENVELOPE ===== */}
        <AnimatePresence>
          {phase !== "reading" && (
            <m.div
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative z-10"
              style={{ width: ENVELOPE_W, height: ENVELOPE_H }}
              onClick={handleClick}
            >
              {/* Envelope body */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(145deg, #c9a96e 0%, #b8955a 30%, #a8824a 70%, #9a7340 100%)",
                  borderRadius: "6px",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              />

              {/* Inner paper edge visible at top */}
              <div
                className="absolute left-6 right-6"
                style={{
                  top: 0,
                  background: "#faf8f0",
                  borderRadius: "0 0 4px 4px",
                  boxShadow: "inset 0 -1px 3px rgba(0,0,0,0.06)",
                  transformOrigin: "top center",
                }}
                initial={false}
                animate={{
                  scaleY: phase === "opening" || phase === "pulling" ? 1 : 0,
                  opacity: phase === "opening" || phase === "pulling" ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />

              {/* Envelope inner shadow / depth */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: 0,
                  height: "60px",
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
                  borderRadius: "6px 6px 0 0",
                }}
              />

              {/* Wax seal */}
              <div
                className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, #c0392b, #8b1a1a 70%, #6b1414 100%)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 3px rgba(0,0,0,0.3)",
                  opacity: phase === "closed" ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                {/* Seal emblem */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontSize: "22px",
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Georgia, serif",
                    fontWeight: 700,
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  O
                </div>
              </div>

              {/* Bottom flap (V-shape, always visible) */}
              <svg
                className="absolute bottom-0 left-0 z-[5]"
                width={ENVELOPE_W}
                height="100"
                viewBox={`0 0 ${ENVELOPE_W} 100`}
                preserveAspectRatio="none"
              >
                <polygon
                  points={`0,0 ${ENVELOPE_W},0 ${ENVELOPE_W / 2},90`}
                  fill="#a8824a"
                  stroke="#9a7340"
                  strokeWidth="0.5"
                />
              </svg>

              {/* Top flap - opens with 3D rotation */}
              <div
                className="absolute left-0 right-0 top-0 z-[15]"
                style={{
                  height: FLAP_H,
                  transformOrigin: "top center",
                  transformStyle: "preserve-3d",
                  perspective: "800px",
                }}
              >
                <m.div
                  style={{
                    width: "100%",
                    height: "100%",
                    transformOrigin: "top center",
                    backfaceVisibility: "hidden",
                  }}
                  initial={{ rotateX: 0 }}
                  animate={{
                    rotateX: phase === "closed" ? 0 : -180,
                  }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  onAnimationComplete={handleOpeningComplete}
                >
                  {/* Front of flap (triangle) */}
                  <svg
                    width={ENVELOPE_W}
                    height={FLAP_H}
                    viewBox={`0 0 ${ENVELOPE_W} ${FLAP_H}`}
                    preserveAspectRatio="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <polygon
                      points={`0,${FLAP_H} ${ENVELOPE_W},${FLAP_H} ${ENVELOPE_W / 2},0`}
                      fill="#b8955a"
                      stroke="#a8824a"
                      strokeWidth="0.5"
                    />
                    {/* Paper texture lines on flap */}
                    <line
                      x1={ENVELOPE_W * 0.3}
                      y1={FLAP_H * 0.5}
                      x2={ENVELOPE_W * 0.7}
                      y2={FLAP_H * 0.5}
                      stroke="rgba(0,0,0,0.04)"
                      strokeWidth="1"
                    />
                  </svg>
                  {/* Back of flap */}
                  <svg
                    width={ENVELOPE_W}
                    height={FLAP_H}
                    viewBox={`0 0 ${ENVELOPE_W} ${FLAP_H}`}
                    preserveAspectRatio="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      backfaceVisibility: "hidden",
                      transform: "rotateX(180deg)",
                    }}
                  >
                    <polygon
                      points={`0,${FLAP_H} ${ENVELOPE_W},${FLAP_H} ${ENVELOPE_W / 2},0`}
                      fill="#d4b87a"
                      stroke="#c9a96e"
                      strokeWidth="0.5"
                    />
                  </svg>
                </m.div>
              </div>

              {/* Click hint */}
              {phase === "closed" && (
                <m.div
                  className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                >
                  <p
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "13px",
                      fontFamily: "Georgia, serif",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    Click to open
                  </p>
                </m.div>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* ===== READING STATE: just the letter ===== */}
        {phase === "reading" && (
          <m.div
            initial={{ y: -(LETTER_H - ENVELOPE_H + 100) }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="relative overflow-hidden rounded-sm"
              style={{
                background: "#faf8f0",
                width: "100%",
                maxWidth: LETTER_W,
                margin: "0 auto",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
              }}
              >
                {children}
              </div>
          </m.div>
        )}
        </LazyMotion>
      </div>
    </div>
  );
}

export { EnvelopeLetter };
