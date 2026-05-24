import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { auth_legal_and, auth_legal_prefix, home, privacy_intro, privacy_policy, privacy_section_clerk_body, privacy_section_clerk_title, privacy_section_collect_body, privacy_section_collect_title, privacy_section_contact_body, privacy_section_contact_title, privacy_section_use_body, privacy_section_use_title, sign_in_desc, sign_in_title, sign_up_desc, sign_up_title, terms_intro, terms_of_service, terms_section_accounts_body, terms_section_accounts_title, terms_section_contact_body, terms_section_contact_title, terms_section_content_body, terms_section_content_title, terms_section_use_body, terms_section_use_title } from "@/paraglide/messages";

interface AuthPageProps {
  mode: "signIn" | "signUp";
  children: ReactNode;
}

export function AuthPage({ mode, children }: AuthPageProps) {
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const legalContent = useMemo(() => {
    if (legalModal === "terms") {
      return {
        title: terms_of_service(),
        description: terms_intro(),
        sections: [
          {
            title: terms_section_use_title(),
            body: terms_section_use_body(),
          },
          {
            title: terms_section_accounts_title(),
            body: terms_section_accounts_body(),
          },
          {
            title: terms_section_content_title(),
            body: terms_section_content_body(),
          },
          {
            title: terms_section_contact_title(),
            body: terms_section_contact_body(),
          },
        ],
      };
    }

    if (legalModal === "privacy") {
      return {
        title: privacy_policy(),
        description: privacy_intro(),
        sections: [
          {
            title: privacy_section_collect_title(),
            body: privacy_section_collect_body(),
          },
          {
            title: privacy_section_use_title(),
            body: privacy_section_use_body(),
          },
          {
            title: privacy_section_clerk_title(),
            body: privacy_section_clerk_body(),
          },
          {
            title: privacy_section_contact_title(),
            body: privacy_section_contact_body(),
          },
        ],
      };
    }

    return null;
  }, [legalModal]);

  return (
    <main className="min-h-screen bg-background">
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-4 sm:p-8"
        style={{ backgroundImage: "url('/hero/background.png')" }}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" aria-hidden="true" />

        <Button variant="ghost" className="absolute left-5 top-7 z-10" asChild>
          <Link to="/">
            <ChevronLeftIcon className="me-2 size-4" />
            {home()}
          </Link>
        </Button>

        <div className="relative w-full max-w-md space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {mode === "signIn" ? sign_in_title() : sign_up_title()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "signIn" ? sign_in_desc() : sign_up_desc()}
              </p>
            </div>
            {children}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {auth_legal_prefix()}{" "}
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="underline underline-offset-4 transition-colors hover:text-white"
            >
              {terms_of_service()}
            </button>{" "}
            {auth_legal_and()}{" "}
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="underline underline-offset-4 transition-colors hover:text-white"
            >
              {privacy_policy()}
            </button>
          </p>
        </div>
      </section>

      <AppDialog
        open={legalModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLegalModal(null);
          }
        }}
        title={legalContent?.title ?? ""}
        description={legalContent?.description}
        size="xl"
      >
        <div className="space-y-8">
          {legalContent?.sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </AppDialog>
    </main>
  );
}
