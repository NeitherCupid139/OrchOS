import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

const installCommands = [
  { label: "npm", value: "npm install @web-kits/audio" },
  { label: "yarn", value: "yarn add @web-kits/audio" },
  { label: "pnpm", value: "pnpm add @web-kits/audio" },
  { label: "bun", value: "bun add @web-kits/audio" },
] as const;

const getStartedCards = [
  {
    href: "/getting-started/typescript",
    title: () => m.docs_audio_get_started_typescript_title(),
    description: () => m.docs_audio_get_started_typescript_desc(),
  },
  {
    href: "/getting-started/react",
    title: () => m.docs_audio_get_started_react_title(),
    description: () => m.docs_audio_get_started_react_desc(),
  },
] as const;

const integrateCards = [
  {
    href: "/integrations/patches",
    title: () => m.docs_audio_integrate_patches_title(),
    description: () => m.docs_audio_integrate_patches_desc(),
  },
  {
    href: "/integrations/react",
    title: () => m.docs_audio_integrate_react_title(),
    description: () => m.docs_audio_integrate_react_desc(),
  },
  {
    href: "/cli",
    title: () => m.docs_audio_integrate_cli_title(),
    description: () => m.docs_audio_integrate_cli_desc(),
  },
] as const;

const informationCards = [
  {
    href: "/api/sounds/define-sound",
    title: () => m.docs_audio_information_api_title(),
    description: () => m.docs_audio_information_api_desc(),
  },
  {
    href: "/resources/changelog",
    title: () => m.docs_audio_information_changelog_title(),
    description: () => m.docs_audio_information_changelog_desc(),
  },
] as const;

const quickstartCode = `import { defineSound } from "@web-kits/audio";

const pop = defineSound({
  source: { type: "sine", frequency: { start: 400, end: 150 } },
  envelope: { decay: 0.05 },
  gain: 0.35,
});

pop();`;

function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-14">
          <div className="space-y-16">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {m.docs_audio_badge()}
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {m.docs_audio_title()}
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">
                  {m.docs_audio_description()}
                </p>
              </div>
              <PlaygroundPreview />
            </div>

            <section id="quickstart" className="space-y-6 scroll-mt-20">
              <SectionHeading title={m.docs_audio_quickstart_heading()} />
              <p className="text-muted-foreground">
                {m.docs_audio_quickstart_intro()}
              </p>

              <Tabs defaultValue={installCommands[0].label} className="w-full">
                <TabsList className="w-full max-w-fit flex-wrap">
                  {installCommands.map((command) => (
                    <TabsTrigger key={command.label} value={command.label}>
                      {command.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {installCommands.map((command) => (
                  <TabsContent
                    key={command.label}
                    value={command.label}
                    className="mt-4"
                  >
                    <CodePanel code={command.value} />
                  </TabsContent>
                ))}
              </Tabs>

              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {m.docs_audio_quickstart_define()}
                </p>
                <CodePanel code={quickstartCode} language="ts" />
              </div>
            </section>

            <DocsSection
              title={m.docs_audio_get_started_heading()}
              cards={getStartedCards}
              columns="md:grid-cols-2"
            />

            <DocsSection
              title={m.docs_audio_integrate_heading()}
              cards={integrateCards}
              columns="lg:grid-cols-3"
            />

            <DocsSection
              title={m.docs_audio_information_heading()}
              cards={informationCards}
              columns="md:grid-cols-2"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
      {title}
    </h2>
  );
}

function CodePanel({
  code,
  language = "bash",
}: {
  code: string;
  language?: string;
}) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}

function PlaygroundPreview() {
  const [active, setActive] = React.useState(false);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-5 py-3 text-sm text-muted-foreground">
        {m.docs_audio_playground_title()}
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <CodePanel
            language="ts"
            code={`defineSound({\n  source: { type: "sine", frequency: { start: 400, end: 150 } },\n  envelope: { decay: 0.05 },\n  gain: 0.35,\n})`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => setActive((value) => !value)}>
              {active
                ? m.docs_audio_playground_stop()
                : m.docs_audio_playground_play()}
            </Button>
            <span className="text-sm text-muted-foreground">
              {m.docs_audio_playground_caption()}
            </span>
          </div>
        </div>

        <div className="flex min-h-64 flex-col justify-between rounded-2xl border border-border bg-background p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {m.docs_audio_playground_preview_label()}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {m.docs_audio_playground_preview_desc()}
            </p>
          </div>

          <div className="flex items-end gap-2">
            {[0.35, 0.65, 0.95, 0.6, 0.25, 0.1].map((height) => (
              <div
                key={`bar-${height}`}
                className="w-full rounded-full bg-primary/80 transition-all duration-300"
                style={{
                  height: `${(active ? height : 0.12) * 120}px`,
                  opacity: active ? 1 : 0.45,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsSection({
  title,
  cards,
  columns,
}: {
  title: string;
  cards: ReadonlyArray<{
    href: string;
    title: () => string;
    description: () => string;
  }>;
  columns: string;
}) {
  return (
    <section className="space-y-6">
      <SectionHeading title={title} />
      <div className={`grid gap-4 ${columns}`}>
        {cards.map((card) => (
          <Card
            key={card.href}
            className="border border-border/80 bg-card/70 py-0 transition-colors hover:bg-card"
          >
            <CardHeader className="pt-5">
              <CardTitle>{card.title()}</CardTitle>
              <CardDescription>{card.description()}</CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <Button asChild variant="outline">
                <Link to={card.href}>{m.docs_audio_open_link()}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
