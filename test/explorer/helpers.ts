/**
 * Test helpers. Importing this module creates a temporary HOME and points
 * process.env.HOME at it before any extension module is imported.
 *
 * Test modules must import the extension modules dynamically after importing
 * this helper, because the projects library reads HOME at import time.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export const HOME = await fs.mkdtemp(path.join(os.tmpdir(), "explorer-home-"));
process.env.HOME = HOME;

export function projectsDir(): string {
	return path.join(HOME, ".projects");
}

export function ticketsDir(): string {
	return path.join(HOME, ".tickets");
}

const ISO = "2026-09-29T10:00:00.000Z";

export async function makeProject(
	slug: string,
	options: { title?: string; phase?: string; status?: string } = {},
): Promise<void> {
	const dir = path.join(projectsDir(), slug);
	await fs.mkdir(dir, { recursive: true });
	const title = options.title ?? slug;
	const phase = options.phase ?? "problem-definition";
	const status = options.status ?? "active";
	const body = `---\nproject: ${JSON.stringify(slug)}\ntitle: ${JSON.stringify(title)}\nstatus: ${JSON.stringify(status)}\nphase: ${JSON.stringify(phase)}\ncreated: ${JSON.stringify(ISO)}\nupdated: ${JSON.stringify(ISO)}\nfinished: null\n---\n\n# ${title}\n`;
	await fs.writeFile(path.join(dir, "0-project.md"), body, "utf8");
}

export async function writePhase(
	slug: string,
	phaseName: string,
	number: number,
	body: string,
	options: { saves?: number } = {},
): Promise<void> {
	const dir = path.join(projectsDir(), slug);
	await fs.mkdir(dir, { recursive: true });
	const raw = `---\nphase: ${JSON.stringify(phaseName)}\nstatus: "saved"\nsaves: ${options.saves ?? 1}\ncreated: ${JSON.stringify(ISO)}\nupdated: ${JSON.stringify(ISO)}\n---\n\n${body}\n`;
	await fs.writeFile(path.join(dir, `${number}-${phaseName}.md`), raw, "utf8");
}

export async function writeSnapshot(
	slug: string,
	phaseName: string,
	number: number,
	stamp: string,
	body: string,
): Promise<void> {
	const dir = path.join(projectsDir(), slug, ".history", `${number}-${phaseName}`);
	await fs.mkdir(dir, { recursive: true });
	const raw = `---\nphase: ${JSON.stringify(phaseName)}\nstatus: "saved"\nsaves: 1\ncreated: ${JSON.stringify(ISO)}\nupdated: ${JSON.stringify(ISO)}\n---\n\n${body}\n`;
	await fs.writeFile(path.join(dir, `${stamp}.md`), raw, "utf8");
}

export async function makeTicket(options: {
	filename: string;
	project: string;
	title: string;
	number?: number | null;
	status?: string;
	epic?: string;
	task?: string;
	links?: string[];
	body?: string;
}): Promise<void> {
	await fs.mkdir(ticketsDir(), { recursive: true });
	const frontmatter = [
		`ticket: ${JSON.stringify(options.filename.replace(/\.md$/, ""))}`,
		`project: ${JSON.stringify(options.project)}`,
		`epic: ${JSON.stringify(options.epic ?? "core")}`,
		`task: ${JSON.stringify(options.task ?? "do-thing")}`,
		`status: ${JSON.stringify(options.status ?? "todo")}`,
		`title: ${JSON.stringify(options.title)}`,
		`number: ${options.number === undefined ? 1 : options.number}`,
		`created: ${JSON.stringify(ISO)}`,
		`updated: ${JSON.stringify(ISO)}`,
		`links: ${JSON.stringify(options.links ?? [])}`,
	];
	const raw = `---\n${frontmatter.join("\n")}\n---\n\n${options.body ?? `# ${options.title}\n`}`;
	await fs.writeFile(path.join(ticketsDir(), options.filename), raw, "utf8");
}

export interface FileRecord {
	path: string;
	hash: string;
	size: number;
}

/** Recursively hash every file under a root. Missing root returns an empty list. */
export async function readTree(root: string, base = root): Promise<FileRecord[]> {
	let entries;
	try {
		entries = await fs.readdir(root, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}

	const records: FileRecord[] = [];
	for (const entry of entries) {
		const full = path.join(root, entry.name);
		if (entry.isDirectory()) {
			records.push(...(await readTree(full, base)));
			continue;
		}
		const data = await fs.readFile(full);
		records.push({
			path: path.relative(base, full),
			hash: createHash("sha256").update(data).digest("hex"),
			size: data.byteLength,
		});
	}
	return records.sort((a, b) => a.path.localeCompare(b.path));
}

export function artifactsFingerprint(records: FileRecord[]): string {
	return records.map((record) => `${record.path}:${record.hash}:${record.size}`).join("\n");
}

export async function fetchText(url: string): Promise<{ status: number; contentType: string; text: string }> {
	const response = await fetch(url);
	return {
		status: response.status,
		contentType: response.headers.get("content-type") ?? "",
		text: await response.text(),
	};
}
