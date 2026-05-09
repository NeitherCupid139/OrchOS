import type { SkillProfile } from "@/lib/api";

export const BUILTIN_CAPABILITY_OPTIONS = [
  { value: "write_code", labelKey: "cap_write_code" },
  { value: "fix_bug", labelKey: "cap_fix_bug" },
  { value: "run_tests", labelKey: "cap_run_tests" },
  { value: "commit", labelKey: "cap_commit" },
  { value: "review", labelKey: "cap_review" },
] as const;

export const CAPABILITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  write_code: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  fix_bug: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  run_tests: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  commit: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  review: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/30",
  },
};

export function getCapabilityOptions(skills: SkillProfile[]) {
  const seen = new Set<string>(BUILTIN_CAPABILITY_OPTIONS.map((cap) => cap.value));
  const marketOptions = skills
    .reduce<{ value: string; label: string }[]>((acc, skill) => {
      if (!skill.enabled) return acc;
      const name = skill.name.trim();
      if (name.length === 0) return acc;
      if (seen.has(name)) return acc;
      seen.add(name);
      acc.push({ value: name, label: name });
      return acc;
    }, []);

  return {
    builtinOptions: BUILTIN_CAPABILITY_OPTIONS,
    marketOptions,
  };
}
