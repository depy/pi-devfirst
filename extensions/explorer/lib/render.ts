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

const marked = new Marked({
	gfm: true,
	renderer: {
		html({ text }: Tokens.HTML | Tokens.Tag): string {
			return escapeHtml(text);
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
	return marked.parse(markdown) as string;
}
