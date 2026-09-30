/**
 * Markdown to HTML for artifact bodies.
 *
 * `marked` does not sanitize by default. This module escapes raw HTML tokens
 * and rejects unsafe URL schemes. Artifact content is local and trusted, but
 * the escape is defense in depth for a file that contains a script tag.
 */

import { Marked, type Tokens } from "marked";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Drop schemes that can execute or exfiltrate. Keep relative and http(s). */
export function safeHref(href: string | null | undefined): string | null {
	if (!href) return null;
	const trimmed = href.trim();
	if (trimmed === "") return null;
	if (/^(javascript|vbscript|data):/i.test(trimmed)) return null;
	return trimmed;
}

/** GitHub-style slug for heading text. Empty text becomes "section". */
export function slugify(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[`*_~]/g, "")
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

interface HeadingRef {
	id: string;
	text: string;
}

/** Headings in document order, each with the id the heading renderer emits. */
export function documentHeadings(body: string): HeadingRef[] {
	const headings: HeadingRef[] = [];
	const seen = new Map<string, number>();
	for (const line of body.split("\n")) {
		const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
		if (!match) continue;
		const text = match[1]!;
		const base = slugify(text) || "section";
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		headings.push({ id: count === 0 ? base : `${base}-${count}`, text });
	}
	return headings;
}

const usedHeadingIds = new Map<string, number>();

function uniqueHeadingId(text: string): string {
	const base = slugify(text) || "section";
	const count = usedHeadingIds.get(base) ?? 0;
	usedHeadingIds.set(base, count + 1);
	return count === 0 ? base : `${base}-${count}`;
}

const marked = new Marked({
	gfm: true,
	renderer: {
		heading({ tokens, text, depth }: Tokens.Heading): string {
			const id = escapeHtml(uniqueHeadingId(text));
			return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;
		},
		html({ text }: Tokens.HTML | Tokens.Tag): string {
			return escapeHtml(text);
		},
		code({ text, lang }: Tokens.Code): string | false {
			if (lang?.trim().toLowerCase() === "mermaid") {
				// Mermaid reads textContent, so escaped source decodes back
				// to the original diagram text inside the browser.
				return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
			}
			return false;
		},
		link({ href, title, tokens }: Tokens.Link): string {
			const safe = safeHref(href);
			const label = this.parser.parseInline(tokens);
			if (safe === null) return label;
			const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
			return `<a href="${escapeHtml(safe)}"${titleAttr}>${label}</a>`;
		},
		image({ href, title, text }: Tokens.Image): string {
			const safe = safeHref(href);
			if (safe === null) return escapeHtml(text);
			const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
			return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(text)}"${titleAttr}>`;
		},
	},
});

/** Convert a Markdown body to HTML. Empty input returns an empty string. */
export function renderMarkdown(markdown: string): string {
	if (!markdown || markdown.trim() === "") return "";
	usedHeadingIds.clear();
	return marked.parse(markdown) as string;
}
