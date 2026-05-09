import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

const sections = [
  { title: m.terms_section_use_title(), body: m.terms_section_use_body() },
  { title: m.terms_section_accounts_title(), body: m.terms_section_accounts_body() },
  { title: m.terms_section_content_title(), body: m.terms_section_content_body() },
  { title: m.terms_section_contact_title(), body: m.terms_section_contact_body() },
];

function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="mb-2 text-4xl font-semibold text-foreground">
            {m.terms_of_service()}
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            {m.terms_intro()}
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
