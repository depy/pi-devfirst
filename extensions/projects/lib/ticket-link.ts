/**
 * Data-level link to tickets in ~/.tickets.
 *
 * The projects extension does not import the tickets extension. It reads the
 * ticket frontmatter and matches the `project` field.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { parseFrontmatter } from "./frontmatter.ts";

export const TICKETS_DIR = path.join(os.homedir(), ".tickets");

/** Ticket file names whose `project` field equals the slug. */
export async function listProjectTicketFiles(slug: string): Promise<string[]> {
	let entries;
	try {
		entries = await fs.readdir(TICKETS_DIR, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}

	const matches: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		try {
			const raw = await fs.readFile(path.join(TICKETS_DIR, entry.name), "utf8");
			const { meta } = parseFrontmatter(raw);
			if (meta.project === slug) matches.push(entry.name);
		} catch {
			// Skip unreadable ticket files.
		}
	}
	matches.sort();
	return matches;
}

/** Delete every ticket file whose `project` field equals the slug. */
export async function deleteProjectTickets(slug: string): Promise<string[]> {
	const files = await listProjectTicketFiles(slug);
	for (const name of files) {
		const full = path.join(TICKETS_DIR, name);
		await withFileMutationQueue(full, async () => {
			await fs.rm(full, { force: true });
		});
	}
	return files;
}
