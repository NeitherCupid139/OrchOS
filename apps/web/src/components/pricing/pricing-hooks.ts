import { useMemo } from "react";
import { useLocale } from "@/lib/i18n-provider";
import {
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
  pricing_free_feature_builtin_agent,
  pricing_free_feature_core,
  pricing_free_feature_cloud,
  pricing_free_feature_sync,
  pricing_free_feature_tokens,
  pricing_pro_title,
  pricing_pro_desc,
  pricing_pro_price,
  pricing_pro_price_yearly,
  pricing_billed_monthly,
  pricing_btn_get_started,
  pricing_feature_api,
  pricing_feature_bookmarks,
  pricing_feature_calendar,
  pricing_feature_mail,
  pricing_feature_kanban,
  pricing_feature_agents_label,
  pricing_feature_unlimited_agents,
  pricing_compare_builtin_agent,
  pricing_compare_custom_agents,
  pricing_pro_feature_agents,
  pricing_pro_feature_web_search,
  pricing_pro_feature_everything_free,
  pricing_pro_feature_priority_support,
  pricing_pro_feature_tokens,
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

export type Tier = {
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

export function useTiers(): Tier[] {
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

export function useCompareFeatures() {
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
    [],
  );
}

export function useFaqs() {
  return [
    { q: pricing_faq_question1, a: pricing_faq_answer1 },
    { q: pricing_faq_question2, a: pricing_faq_answer2 },
    { q: pricing_faq_question3, a: pricing_faq_answer3 },
    { q: pricing_faq_question4, a: pricing_faq_answer4 },
  ];
}
