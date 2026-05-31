import { useEffect } from "react";
import { useLocale } from "@/lib/i18n-provider";
import { useUIStore } from "@/lib/store";
import { applyScriptPreferences } from "@/lib/script-preferences";

const TEXT_SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "INPUT",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
]);

const ATTRIBUTE_NAMES = ["placeholder", "title", "aria-label", "alt"] as const;

const originalTextByNode = new WeakMap<Text, string>();
const originalAttributesByElement = new WeakMap<Element, Map<string, string | null>>();
let originalDocumentTitle: string | null = null;

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  return !parent || TEXT_SKIP_TAGS.has(parent.tagName) || parent.isContentEditable;
}

function getOriginalAttribute(element: Element, name: string, currentValue: string | null) {
  let cache = originalAttributesByElement.get(element);
  if (!cache) {
    cache = new Map();
    originalAttributesByElement.set(element, cache);
  }

  if (!cache.has(name)) {
    cache.set(name, currentValue);
    return currentValue;
  }

  const original = cache.get(name) ?? null;
  return original;
}

function setOriginalAttribute(element: Element, name: string, value: string | null) {
  let cache = originalAttributesByElement.get(element);
  if (!cache) {
    cache = new Map();
    originalAttributesByElement.set(element, cache);
  }
  cache.set(name, value);
}

function transformTextNode(
  node: Text,
  locale: string,
  settings: ReturnType<typeof useUIStore.getState>["settings"],
  allowOriginalOverwrite: boolean,
) {
  if (shouldSkipTextNode(node)) {
    return;
  }

  const current = node.data;
  const knownOriginal = originalTextByNode.get(node);

  if (knownOriginal) {
    const expectedCurrent = applyScriptPreferences(knownOriginal, locale, settings);
    if (allowOriginalOverwrite && current !== expectedCurrent && current !== knownOriginal) {
      originalTextByNode.set(node, current);
    }
  } else {
    originalTextByNode.set(node, current);
  }

  const original = originalTextByNode.get(node) ?? current;
  const next = applyScriptPreferences(original, locale, settings);

  if (node.data !== next) {
    node.data = next;
  }
}

function transformElementAttributes(
  element: Element,
  locale: string,
  settings: ReturnType<typeof useUIStore.getState>["settings"],
  allowOriginalOverwrite: boolean,
) {
  for (const name of ATTRIBUTE_NAMES) {
    const current = element.getAttribute(name);
    if (current == null) {
      continue;
    }

    const knownOriginal = getOriginalAttribute(element, name, current);
    if (knownOriginal != null) {
      const expectedCurrent = applyScriptPreferences(knownOriginal, locale, settings);
      if (allowOriginalOverwrite && current !== expectedCurrent && current !== knownOriginal) {
        setOriginalAttribute(element, name, current);
      }
    }

    const original = getOriginalAttribute(element, name, current);
    if (original == null) {
      continue;
    }

    const next = applyScriptPreferences(original, locale, settings);
    if (current !== next) {
      element.setAttribute(name, next);
    }
  }
}

function transformTree(
  root: Node,
  locale: string,
  settings: ReturnType<typeof useUIStore.getState>["settings"],
  allowOriginalOverwrite: boolean,
) {
  if (root instanceof Text) {
    transformTextNode(root, locale, settings, allowOriginalOverwrite);
    return;
  }

  if (root instanceof Element) {
    transformElementAttributes(root, locale, settings, allowOriginalOverwrite);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.currentNode;

  while (current) {
    if (current instanceof Text) {
      transformTextNode(current, locale, settings, allowOriginalOverwrite);
    } else if (current instanceof Element) {
      transformElementAttributes(current, locale, settings, allowOriginalOverwrite);
    }

    current = walker.nextNode();
  }
}

export function ScriptPreferenceProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const settings = useUIStore((s) => s.settings);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    let applying = false;

    const apply = (root: Node, allowOriginalOverwrite: boolean) => {
      applying = true;
      try {
        transformTree(root, locale, settings, allowOriginalOverwrite);

        if (originalDocumentTitle == null) {
          originalDocumentTitle = document.title;
        } else if (allowOriginalOverwrite) {
          const expectedTitle = applyScriptPreferences(originalDocumentTitle, locale, settings);
          if (document.title !== expectedTitle && document.title !== originalDocumentTitle) {
            originalDocumentTitle = document.title;
          }
        }

        document.title = applyScriptPreferences(originalDocumentTitle, locale, settings);
      } finally {
        applying = false;
      }
    };

    apply(document.body, false);

    const observer = new MutationObserver((mutations) => {
      if (applying) {
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          apply(mutation.target, true);
          continue;
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          apply(mutation.target, true);
          continue;
        }

        for (const node of mutation.addedNodes) {
          apply(node, true);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTE_NAMES],
    });

    return () => observer.disconnect();
  }, [locale, settings]);

  return <>{children}</>;
}
