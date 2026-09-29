/**
 * Small frontmatter reader and writer.
 *
 * Values use JSON on each line, for example `saves: 2` or `title: "My work"`.
 * This matches the ticket file format and keeps strings unambiguous.
 */

export interface ParsedFile {
	meta: Record<string, unknown>;
	body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		return { meta: {}, body: raw.trim() };
	}

	const meta: Record<string, unknown> = {};
	for (const line of match[1].split(/\r?\n/)) {
		const index = line.indexOf(":");
		if (index < 0) continue;
		const key = line.slice(0, index).trim();
		const value = line.slice(index + 1).trim();
		if (!key) continue;
		try {
			meta[key] = JSON.parse(value);
		} catch {
			meta[key] = value;
		}
	}

	return { meta, body: match[2].trim() };
}

export function serializeFrontmatter(meta: Record<string, unknown>, body: string): string {
	const lines = Object.entries(meta).map(([key, value]) => `${key}: ${JSON.stringify(value ?? null)}`);
	return `---\n${lines.join("\n")}\n---\n\n${body.trim()}\n`;
}
