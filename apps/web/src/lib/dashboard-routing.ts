import type { SidebarView } from "@/lib/types";

export function getViewFromPath(pathname: string): SidebarView {
  const segment =
    pathname
      .replace("/dashboard/", "")
      .replace("/dashboard", "")
      .split("/")[0] ?? "";
  const validViews: SidebarView[] = [
    "inbox",
    "creation",
    "bookmarks",
    "board",
    "calendar",
    "mail",
    "observability",
    "agents",
  ];
  return validViews.includes(segment as SidebarView)
    ? (segment as SidebarView)
    : "inbox";
}
