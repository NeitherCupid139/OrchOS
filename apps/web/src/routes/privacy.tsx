import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

const sections = [
  { title: m.privacy_section_collect_title(), body: m.privacy_section_collect_body() },
  { title: m.privacy_section_use_title(), body: m.privacy_section_use_body() },
  { title: m.privacy_section_clerk_title(), body: m.privacy_section_clerk_body() },
  { title: m.privacy_section_contact_title(), body: m.privacy_section_contact_body() },
];

function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="mb-2 text-4xl font-semibold text-foreground">
            {m.privacy_policy()}
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            {m.privacy_intro()}
          </p>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="text-muted-foreground leading-7">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
