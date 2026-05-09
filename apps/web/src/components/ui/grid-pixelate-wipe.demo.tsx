import { Player } from "@remotion/player";
import { GridPixelateWipe } from "@/components/ui/grid-pixelate-wipe";

function ScenePanel({
  label,
  subtitle,
  background,
}: {
  label: string;
  subtitle: string;
  background: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily:
          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ display: "grid", gap: 18, textAlign: "center" }}>
        <span style={{ fontSize: 18, letterSpacing: "0.05em", opacity: 0.72 }}>{subtitle}</span>
        <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.06em" }}>{label}</span>
      </div>
    </div>
  );
}

function GridPixelateWipeScene() {
  return (
    <GridPixelateWipe
      cols={12}
      rows={7}
      pattern="wave"
      transitionStart={8}
      transitionDuration={34}
      cellFadeFrames={5}
      from={
        <ScenePanel
          label="LAUNCH"
          subtitle="SCENE A"
          background="linear-gradient(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)"
        />
      }
      to={
        <ScenePanel
          label="ARRIVE"
          subtitle="SCENE B"
          background="linear-gradient(135deg, #7c3aed 0%, #ec4899 54%, #fb7185 100%)"
        />
      }
    />
  );
}

export default function GridPixelateWipeDemo() {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-zinc-950">
      <Player
        component={GridPixelateWipeScene}
        durationInFrames={90}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        controls={false}
        autoPlay
        loop
        clickToPlay={false}
        style={{ width: "100vw", height: "100vh" }}
      />
    </div>
  );
}
