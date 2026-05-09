import type { ReactNode } from "react";

const LINE_GAP = 32;

interface LetterPaperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function LetterPaper({ title, subtitle, children, footer }: LetterPaperProps) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "#faf8f0",
        backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_GAP - 1}px, #dce4ec ${LINE_GAP - 1}px, #dce4ec ${LINE_GAP}px)`,
      }}
    >
      {/* Title */}
      <div
        style={{
          paddingTop: `${LINE_GAP * 2}px`,
          paddingBottom: `${LINE_GAP}px`,
          paddingLeft: `${LINE_GAP * 2}px`,
          paddingRight: `${LINE_GAP * 2}px`,
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
              color: "#666",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "15px",
              lineHeight: `${LINE_GAP}px`,
              marginTop: "4px",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          marginLeft: `${LINE_GAP * 2}px`,
          marginRight: `${LINE_GAP * 2}px`,
          height: "1px",
          background: "rgba(0,0,0,0.08)",
        }}
      />

      {/* Body */}
      <div
        style={{
          paddingTop: `${LINE_GAP}px`,
          paddingBottom: `${LINE_GAP * 2}px`,
          paddingLeft: `${LINE_GAP * 2}px`,
          paddingRight: `${LINE_GAP * 2}px`,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <>
          <div
            style={{
              marginLeft: `${LINE_GAP * 2}px`,
              marginRight: `${LINE_GAP * 2}px`,
              height: "1px",
              background: "rgba(0,0,0,0.08)",
            }}
          />
          <div
            style={{
              paddingTop: `${LINE_GAP}px`,
              paddingBottom: `${LINE_GAP * 2}px`,
              paddingLeft: `${LINE_GAP * 2}px`,
              paddingRight: `${LINE_GAP * 2}px`,
              color: "#888",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "13px",
              lineHeight: `${LINE_GAP}px`,
            }}
          >
            {footer}
          </div>
        </>
      )}
    </div>
  );
}

export { LetterPaper, LINE_GAP };
