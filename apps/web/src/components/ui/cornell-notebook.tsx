import type { ReactNode } from "react";

const LINE_HEIGHT = 28; // px - matches ruled line spacing
const LINE_GAP = 32; // px - total line step (28px text + 4px gap = 32px ruled spacing)

const HOLE_KEYS = ["top", "middle", "bottom"] as const;

interface CornellNotebookProps {
  title: string;
  subtitle?: string;
  cueItems: { keyword: string; description?: string }[];
  children: ReactNode;
  summary: ReactNode;
}

function CornellNotebook({ title, subtitle, cueItems, children, summary }: CornellNotebookProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div
        className="relative overflow-hidden rounded-sm shadow-xl"
        style={{
          background: "#faf8f0",
          backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_GAP - 1}px, #d0dce8 ${LINE_GAP - 1}px, #d0dce8 ${LINE_GAP}px)`,
        }}
      >
        {/* Red margin line */}
        <div
          className="pointer-events-none absolute top-0 z-10 h-full"
          style={{
            left: "30%",
            width: "2px",
            background: "rgba(220, 80, 80, 0.4)",
          }}
        />

        {/* Three-hole punches - left edge */}
        <div className="pointer-events-none absolute left-4 top-0 z-20 flex h-full flex-col items-center justify-around py-24">
          {HOLE_KEYS.map((holeKey) => (
            <div
              key={holeKey}
              className="rounded-full"
              style={{
                width: "20px",
                height: "20px",
                background: "radial-gradient(circle, #e8e4da 40%, #d5d0c4 60%, #c8c3b8 100%)",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
              }}
            />
          ))}
        </div>

        {/* Header / Title Area - height is a multiple of LINE_GAP */}
        <div
          className="relative z-10"
          style={{
            borderBottom: "2px solid rgba(220, 80, 80, 0.35)",
            paddingTop: `${LINE_GAP * 1.5}px`,
            paddingBottom: `${LINE_GAP * 0.5}px`,
            paddingLeft: "72px",
            paddingRight: "32px",
          }}
        >
          <h1
            style={{
              color: "#1a1a2e",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "28px",
              lineHeight: `${LINE_GAP}px`,
               fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: "#555",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "16px",
                lineHeight: `${LINE_GAP}px`,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Main Body: Cue Column + Notes Column */}
        <div className="relative z-10 flex" style={{ minHeight: "600px" }}>
          {/* Cue Column (left) - padded to avoid holes */}
          <div
            className="shrink-0"
            style={{
              width: "30%",
              paddingTop: `${LINE_GAP}px`,
              paddingLeft: "60px", // past the holes
              paddingRight: "16px",
            }}
          >
            <div>
              {cueItems.map((item) => (
                <div
                  key={item.keyword}
                  style={{
                    minHeight: `${LINE_GAP * 2}px`,
                    marginBottom: `${LINE_GAP}px`,
                  }}
                >
                  <p
                    style={{
                      color: "#2c3e50",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: "13px",
                      lineHeight: `${LINE_GAP}px`,
                      fontWeight: 700,
                    }}
                  >
                    {item.keyword}
                  </p>
                  {item.description && (
                    <p
                      style={{
                        color: "#888",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: "12px",
                        lineHeight: `${LINE_GAP}px`,
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes Column (right) */}
          <div
            className="flex-1"
            style={{
              paddingTop: `${LINE_GAP}px`,
              paddingLeft: "24px",
              paddingRight: "32px",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {children}
          </div>
        </div>

        {/* Summary Section (bottom) */}
        <div
          className="relative z-10"
          style={{
            borderTop: "2px solid rgba(220, 80, 80, 0.35)",
            paddingTop: `${LINE_GAP}px`,
            paddingBottom: `${LINE_GAP * 2}px`,
            paddingLeft: "72px",
            paddingRight: "32px",
          }}
        >
          <p
            style={{
              color: "rgba(220, 80, 80, 0.7)",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: `${LINE_GAP}px`,
            }}
          >
            Summary
          </p>
          <div
            style={{
              color: "#333",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "14px",
              lineHeight: `${LINE_GAP}px`,
            }}
          >
            {summary}
          </div>
        </div>
      </div>
    </div>
  );
}

export { CornellNotebook };
export { LINE_HEIGHT, LINE_GAP };
