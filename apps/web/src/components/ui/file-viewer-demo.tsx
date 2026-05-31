import { useMemo } from "react";
import { ComponentFileViewerWrapper, type ApiComponent } from "@/components/ui/file-viewer-wrapper";
import { changelog_bundle_name, changelog_section_added, changelog_section_changed, changelog_section_notes, changelog_v01_added_board, changelog_v01_added_bookmarks, changelog_v01_added_calendar, changelog_v01_added_inbox, changelog_v01_added_mail, changelog_v01_changed_browsable_release, changelog_v01_changed_file_viewer, changelog_v01_intro, changelog_v01_note_file_tree, changelog_v01_note_shiki, release_v01_desc, release_v01_title } from "@/paraglide/messages";

function buildMarkdownSection(title: string, items: string[]) {
  return [`## ${title}`, "", ...items.map((item) => `- ${item}`)].join("\n");
}

function getChangelogMarkdown() {
  const sections = [
    buildMarkdownSection(changelog_section_added(), [
      changelog_v01_added_bookmarks(),
      changelog_v01_added_mail(),
      changelog_v01_added_calendar(),
      changelog_v01_added_board(),
      changelog_v01_added_inbox(),
    ]),
    buildMarkdownSection(changelog_section_changed(), [
      changelog_v01_changed_file_viewer(),
      changelog_v01_changed_browsable_release(),
    ]),
    buildMarkdownSection(changelog_section_notes(), [
      changelog_v01_note_shiki(),
      changelog_v01_note_file_tree(),
    ]),
  ];

  return [
    "# OrchOS v0.1.0",
    "",
    changelog_v01_intro(),
    "",
    `**${release_v01_title()}**`,
    "",
    release_v01_desc(),
    "",
    ...sections.flatMap((section, index) => (index === sections.length - 1 ? [section] : [section, ""])),
    "",
  ].join("\n");
}

export default function ComponentFileViewerDemo() {
  const sampleComponent = useMemo<ApiComponent>(
    () => ({
      author: "OrchOS",
      name: changelog_bundle_name(),
      version: "v0.1.0",
      files: [
        {
          path: "CHANGELOG-v0.1.0.md",
          content: getChangelogMarkdown(),
        },
      ],
    }),
    [],
  );

  return (
    <div className="w-full">
      <ComponentFileViewerWrapper component={sampleComponent} />
    </div>
  );
}
