import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaygroundPreview } from "@/components/docs/PlaygroundPreview";
import { DocsSection } from "@/components/docs/DocsSection";
import { docs_audio_badge, docs_audio_description, docs_audio_get_started_heading, docs_audio_get_started_react_desc, docs_audio_get_started_react_title, docs_audio_get_started_typescript_desc, docs_audio_get_started_typescript_title, docs_audio_information_api_desc, docs_audio_information_api_title, docs_audio_information_changelog_desc, docs_audio_information_changelog_title, docs_audio_information_heading, docs_audio_integrate_cli_desc, docs_audio_integrate_cli_title, docs_audio_integrate_heading, docs_audio_integrate_patches_desc, docs_audio_integrate_patches_title, docs_audio_integrate_react_desc, docs_audio_integrate_react_title, docs_audio_quickstart_define, docs_audio_quickstart_heading, docs_audio_quickstart_intro, docs_audio_title } from "@/paraglide/messages";

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
    title: () => docs_audio_get_started_typescript_title(),
    description: () => docs_audio_get_started_typescript_desc(),
  },
  {
    href: "/getting-started/react",
    title: () => docs_audio_get_started_react_title(),
    description: () => docs_audio_get_started_react_desc(),
  },
] as const;

const integrateCards = [
  {
    href: "/integrations/patches",
    title: () => docs_audio_integrate_patches_title(),
    description: () => docs_audio_integrate_patches_desc(),
  },
  {
    href: "/integrations/react",
    title: () => docs_audio_integrate_react_title(),
    description: () => docs_audio_integrate_react_desc(),
  },
  {
    href: "/cli",
    title: () => docs_audio_integrate_cli_title(),
    description: () => docs_audio_integrate_cli_desc(),
  },
] as const;

const informationCards = [
  {
    href: "/api/sounds/define-sound",
    title: () => docs_audio_information_api_title(),
    description: () => docs_audio_information_api_desc(),
  },
  {
    href: "/resources/changelog",
    title: () => docs_audio_information_changelog_title(),
    description: () => docs_audio_information_changelog_desc(),
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
                {docs_audio_badge()}
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {docs_audio_title()}
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">
                  {docs_audio_description()}
                </p>
              </div>
              <PlaygroundPreview />
            </div>

            <section id="quickstart" className="space-y-6 scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{docs_audio_quickstart_heading()}</h2>
              <p className="text-muted-foreground">
                {docs_audio_quickstart_intro()}
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
                    <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground"><code className="language-bash">{command.value}</code></pre>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {docs_audio_quickstart_define()}
                </p>
                <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground"><code className="language-ts">{quickstartCode}</code></pre>
              </div>
            </section>

            <DocsSection
              title={docs_audio_get_started_heading()}
              cards={getStartedCards}
              columns="md:grid-cols-2"
            />

            <DocsSection
              title={docs_audio_integrate_heading()}
              cards={integrateCards}
              columns="lg:grid-cols-3"
            />

            <DocsSection
              title={docs_audio_information_heading()}
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
