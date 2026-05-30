import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isClerkConfigured } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import { useLocale } from "@/lib/i18n-provider";
import {
  pricing_hero_title,
  pricing_hero_desc,
  pricing_oss_title,
  pricing_oss_desc,
  pricing_oss_cta,
  pricing_oss_price,
  pricing_oss_feature_core,
  pricing_oss_feature_self_hosted,
  pricing_oss_feature_community,
  pricing_free_title,
  pricing_free_desc,
  pricing_free_cta,
  pricing_free_price,
  pricing_free_feature_core,
  pricing_free_feature_builtin_agent,
  pricing_free_feature_cloud,
  pricing_free_feature_sync,
  pricing_free_feature_tokens,
  pricing_pro_title,
  pricing_pro_desc,
  pricing_pro_price,
  pricing_pro_price_yearly,
  pricing_monthly,
  pricing_yearly,
  pricing_billed_monthly,
  pricing_popular,
  pricing_save_yearly,
  pricing_btn_get_started,
  pricing_toggle_label,
  pricing_feature_api,
  pricing_feature_bookmarks,
  pricing_feature_calendar,
  pricing_feature_mail,
  pricing_feature_kanban,
  pricing_feature_agents_label,
  pricing_feature_column,
  pricing_feature_unlimited_agents,
  pricing_compare_builtin_agent,
  pricing_compare_custom_agents,
  pricing_pro_feature_agents,
  pricing_pro_feature_web_search,
  pricing_pro_feature_everything_free,
  pricing_pro_feature_priority_support,
  pricing_pro_feature_tokens,
  pricing_section_compare_title,
  pricing_faq_title,
  pricing_section_faq_desc,
  pricing_faq_question1,
  pricing_faq_question2,
  pricing_faq_question3,
  pricing_faq_question4,
  pricing_faq_answer1,
  pricing_faq_answer2,
  pricing_faq_answer3,
  pricing_faq_answer4,
} from "@/paraglide/messages";

const GITHUB_REPO = "https://github.com/NeitherCupid139/OrchOS";

export const Route = createFileRoute("/pricing")({
  component: PricingRoute,
});

type Tier = {
  key: string;
  title: string;
  desc: string;
  price: string;
  priceYearly: string;
  billing: string;
  buttonLabel: string;
  buttonVariant: "default" | "outline";
  popular: boolean;
  features: string[];
  href: string;
};

function useTiers(): Tier[] {
  const { locale } = useLocale();
  return useMemo(
    () => [
      {
        key: "oss",
        title: pricing_oss_title(),
        desc: pricing_oss_desc(),
        price: pricing_oss_price(),
        priceYearly: pricing_oss_price(),
        billing: "",
        buttonLabel: pricing_oss_cta(),
        buttonVariant: "outline" as const,
        popular: false,
        href: GITHUB_REPO,
        features: [
          pricing_feature_unlimited_agents(),
          pricing_oss_feature_core(),
          pricing_oss_feature_self_hosted(),
          pricing_oss_feature_community(),
        ],
      },
      {
        key: "free",
        title: pricing_free_title(),
        desc: pricing_free_desc(),
        price: pricing_free_price(),
        priceYearly: pricing_free_price(),
        billing: "",
        buttonLabel: pricing_free_cta(),
        buttonVariant: "outline" as const,
        popular: false,
        href: "/sign-up",
        features: [
          pricing_free_feature_builtin_agent(),
          pricing_free_feature_core(),
          pricing_free_feature_cloud(),
          pricing_free_feature_sync(),
          pricing_free_feature_tokens(),
        ],
      },
      {
        key: "pro",
        title: pricing_pro_title(),
        desc: pricing_pro_desc(),
        price: pricing_pro_price(),
        priceYearly: pricing_pro_price_yearly(),
        billing: pricing_billed_monthly(),
        buttonLabel: pricing_btn_get_started(),
        buttonVariant: "default" as const,
        popular: true,
        href: "/sign-up",
        features: [
          pricing_pro_feature_agents(),
          pricing_pro_feature_everything_free(),
          pricing_pro_feature_web_search(),
          pricing_feature_api(),
          pricing_pro_feature_priority_support(),
          pricing_pro_feature_tokens(),
        ],
      },
    ],
    [locale],
  );
}

function useCompareFeatures() {
  const { locale } = useLocale();
  return useMemo(
    () => [
      {
        label: pricing_feature_agents_label(),
        oss: "Unlimited",
        free: pricing_compare_builtin_agent(),
        pro: pricing_compare_custom_agents({ count: "10" }),
      },
      {
        label: pricing_feature_bookmarks(),
        oss: true,
        free: true,
        pro: true,
      },
      {
        label: pricing_feature_calendar(),
        oss: true,
        free: true,
        pro: true,
      },
      {
        label: pricing_feature_mail(),
        oss: true,
        free: true,
        pro: true,
      },
      {
        label: pricing_feature_kanban(),
        oss: true,
        free: true,
        pro: true,
      },
      {
        label: pricing_feature_api(),
        oss: false,
        free: false,
        pro: true,
      },
      {
        label: pricing_pro_feature_priority_support(),
        oss: false,
        free: false,
        pro: true,
      },
    ],
    [locale],
  );
}

function useFaqs() {
  return [
    { q: pricing_faq_question1, a: pricing_faq_answer1 },
    { q: pricing_faq_question2, a: pricing_faq_answer2 },
    { q: pricing_faq_question3, a: pricing_faq_answer3 },
    { q: pricing_faq_question4, a: pricing_faq_answer4 },
  ];
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-4 shrink-0", className)}
    >
      <path
        d="M4 8l2.5 2.5L12 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-4 shrink-0", className)}
    >
      <path
        d="M4 8h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PricingRoute() {
  if (!isClerkConfigured()) {
    return <Pricing isSignedIn={false} />;
  }

  return (
    <AuthProvider>
      <PricingWithAuth />
    </AuthProvider>
  );
}

function PricingWithAuth() {
  const { isSignedIn } = useUser();

  return <Pricing isSignedIn={Boolean(isSignedIn)} />;
}

function Pricing({ isSignedIn }: { isSignedIn: boolean }) {
  const [yearly, setYearly] = useState(false);
  const tiers = useTiers();
  const compareFeatures = useCompareFeatures();
  const faqs = useFaqs();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-8 pt-14 sm:px-10 sm:pb-12 sm:pt-16 lg:px-14 lg:pt-20">
          <div className="absolute inset-0 -z-10">
            <div className="from-background via-muted/30 to-background absolute inset-0 bg-gradient-to-b" />
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {pricing_hero_title()}
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-7">
              {pricing_hero_desc()}
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-6 pb-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto grid gap-6 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.key}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-card p-6",
                    tier.popular
                      ? "border-primary/50 ring-1 ring-primary/20"
                      : "border-border",
                  )}
                >
                  {tier.popular ? (
                    <Badge
                      variant="default"
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                    >
                      {pricing_popular()}
                    </Badge>
                  ) : null}

                  {/* Tier image */}
                  <div
                    className={cn(
                      "-mx-6 -mt-6 mb-5 h-32 overflow-hidden rounded-t-2xl",
                      tier.key === "oss" &&
                        "bg-gradient-to-br from-zinc-500/10 to-zinc-500/20",
                      tier.key === "free" &&
                        "bg-gradient-to-br from-sky-500/10 to-sky-500/20",
                      tier.key === "pro" &&
                        "bg-gradient-to-br from-primary/10 to-primary/20",
                    )}
                  >
                    <img
                      src={
                        tier.key === "oss"
                          ? "/pricing/open-source.png"
                          : tier.key === "free"
                            ? "/pricing/free.png"
                            : "/pricing/pro.png"
                      }
                      alt={tier.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-foreground">
                      {tier.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tier.desc}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          {yearly ? tier.priceYearly : tier.price}
                        </span>
                      </div>
                      {tier.key === "pro" ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-medium transition-colors",
                              !yearly
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {pricing_monthly()}
                          </span>
                          <AppleSwitch
                            checked={yearly}
                            onCheckedChange={setYearly}
                            size="sm"
                            aria-label={pricing_toggle_label()}
                          />
                          <span
                            className={cn(
                              "text-xs font-medium transition-colors",
                              yearly
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {pricing_yearly()}
                          </span>
                          <Badge variant="default" className="text-[10px]">
                            {pricing_save_yearly()}
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <ul className="mb-6 space-y-3 flex-1">
                    {tier.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckIcon className="mt-0.5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.key === "oss" ? (
                    <Button
                      variant={tier.buttonVariant}
                      className="w-full"
                      asChild
                    >
                      <a
                        href={tier.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tier.buttonLabel}
                      </a>
                    </Button>
                  ) : tier.key === "pro" && isSignedIn ? (
                    <Button
                      variant={tier.buttonVariant}
                      className="w-full"
                      asChild
                    >
                      <a
                        href={`/api/checkout?billing=${yearly ? "yearly" : "monthly"}`}
                      >
                        {tier.buttonLabel}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant={tier.buttonVariant}
                      className="w-full"
                      asChild
                    >
                      <Link to={tier.href}>{tier.buttonLabel}</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compare Plans */}
        <section className="bg-muted/25 px-6 py-16 sm:px-10 sm:py-20 lg:px-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-2 text-center text-2xl font-semibold text-foreground">
              {pricing_section_compare_title()}
            </h2>

            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                      {pricing_feature_column()}
                    </th>
                    <th className="py-3 px-4 text-center font-medium text-foreground">
                      {pricing_oss_title()}
                    </th>
                    <th className="py-3 px-4 text-center font-medium text-foreground">
                      {pricing_free_title()}
                    </th>
                    <th className="py-3 pl-4 text-center font-medium text-primary">
                      {pricing_pro_title()}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareFeatures.map((feat, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-4 text-left text-foreground">
                        {feat.label}
                      </td>
                      {(["oss", "free", "pro"] as const).map((tier) => (
                        <td key={tier} className="py-3 px-4 text-center">
                          {typeof feat[tier] === "boolean" ? (
                            feat[tier] ? (
                              <CheckIcon className="mx-auto text-primary" />
                            ) : (
                              <MinusIcon className="mx-auto text-muted-foreground/30" />
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {feat[tier]}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-24 sm:px-10 sm:py-32 lg:px-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-2 text-center text-2xl font-semibold text-foreground">
              {pricing_faq_title()}
            </h2>
            <p className="mb-10 text-center text-sm text-muted-foreground">
              {pricing_section_faq_desc()}
            </p>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card"
                >
                  <div className="px-5 py-4 text-sm font-medium text-foreground">
                    {faq.q()}
                  </div>
                  <div className="border-t border-border px-5 py-4 text-sm leading-7 text-muted-foreground">
                    {faq.a()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
