/**
 * lib/markdown.ts
 *
 * Deliberately minimal markdown → React renderer. No markdown editor/parser
 * dependency exists in package.json yet, and Priority 1 is scoped to the
 * Document Viewer only — not an npm install. This covers the common subset
 * (headings, bold/italic, inline code, fenced code blocks, links, block
 * quotes, ordered/unordered lists, paragraphs) which is enough for a v1
 * readable/editable note surface. Swap this module out later if a real
 * markdown editor is ever pulled in — nothing else needs to change since
 * StudyItemView is the only caller.
 */
import { createElement, Fragment, type ReactNode } from "react";

let keyCounter = 0;
function nextKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

/** Handles bold/italic/inline-code/link spans inside a single line of text. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: code spans first (so ** inside `code` isn't touched),
  // then links, then bold, then italic.
  const pattern = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(createElement("code", { key: nextKey("code"), className: "doc-inline-code" }, token.slice(1, -1)));
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          createElement(
            "a",
            { key: nextKey("link"), href: linkMatch[2], target: "_blank", rel: "noreferrer", className: "doc-link" },
            linkMatch[1],
          ),
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**")) {
      nodes.push(createElement("strong", { key: nextKey("b") }, token.slice(2, -2)));
    } else {
      nodes.push(createElement("em", { key: nextKey("i") }, token.slice(1, -1)));
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : [text];
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  let paragraphBuffer: string[] = [];
  let listBuffer: { ordered: boolean; text: string }[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ");
    blocks.push(createElement("p", { key: nextKey("p"), className: "doc-p" }, ...renderInline(text)));
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const ordered = listBuffer[0].ordered;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      createElement(
        Tag,
        { key: nextKey("list"), className: ordered ? "doc-ol" : "doc-ul" },
        ...listBuffer.map((item) => createElement("li", { key: nextKey("li") }, ...renderInline(item.text))),
      ),
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line.trim())) {
      flushParagraph();
      flushList();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push(
        createElement(
          "pre",
          { key: nextKey("pre"), className: "doc-pre" },
          createElement("code", null, codeLines.join("\n")),
        ),
      );
      i += 1; // skip closing ```
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const sizeClass = level === 1 ? "doc-h1" : level === 2 ? "doc-h2" : "doc-h3";
      blocks.push(createElement(`h${Math.min(level, 4)}`, { key: nextKey("h"), className: sizeClass }, ...renderInline(heading[2])));
      i += 1;
      continue;
    }

    const blockquote = /^>\s?(.*)$/.exec(line);
    if (blockquote) {
      flushParagraph();
      flushList();
      blocks.push(createElement("blockquote", { key: nextKey("bq"), className: "doc-blockquote" }, ...renderInline(blockquote[1])));
      i += 1;
      continue;
    }

    const unordered = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      listBuffer.push({ ordered: !!ordered, text: (unordered ?? ordered)![1] });
      i += 1;
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      i += 1;
      continue;
    }

    paragraphBuffer.push(line.trim());
    i += 1;
  }
  flushParagraph();
  flushList();

  return createElement(Fragment, null, ...blocks);
}
