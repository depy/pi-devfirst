/**
 * Read-only ticket access for the explorer.
 *
 * Reuses the projects frontmatter reader. The tickets directory is computed on
 * each call so tests can point HOME at a temporary folder.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { parseFrontmatter } from "../../projects/lib/frontmatter.ts";
import type { Ticket, TicketSummary } from "./types.ts";

export function ticketsDir(): string {
	return path.join(os.homedir(), ".tickets");
}

function asString(value: unknown, fallback = ""): string {
	return value === undefined || value === null ? fallback : String(value);
}

function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asLinks(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}

/** A file name that cannot escape the tickets directory. */
export function isTicketFilename(value: string): boolean {
	return /^[A-Za-z0-9._-]+\.md$/.test(value) && !value.includes("..");
}

function parseTicket(filename: string, raw: string): Ticket {
	const { meta, body } = parseFrontmatter(raw);
	return {
		filename,
		number: asNumber(meta.number),
		title: asString(meta.title),
		status: asString(meta.status, "todo"),
		epic: asString(meta.epic),
		task: asString(meta.task),
		project: asString(meta.project),
		created: asString(meta.created),
		updated: asString(meta.updated),
		links: asLinks(meta.links),
		body: body.trim(),
	};
}

function toSummary(ticket: Ticket): TicketSummary {
	return {
		filename: ticket.filename,
		number: ticket.number,
		title: ticket.title,
		status: ticket.status,
		epic: ticket.epic,
		task: ticket.task,
	};
}

function compareTickets(a: TicketSummary, b: TicketSummary): number {
	if (a.number === null && b.number === null) return a.filename.localeCompare(b.filename);
	if (a.number === null) return 1;
	if (b.number === null) return -1;
	if (a.number !== b.number) return a.number - b.number;
	return a.filename.localeCompare(b.filename);
}

/** Tickets whose `project` field equals the slug. Never throws on a bad file. */
export async function listTicketsForProject(slug: string): Promise<TicketSummary[]> {
	let entries;
	try {
		entries = await fs.readdir(ticketsDir(), { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}

	const summaries: TicketSummary[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		try {
			const raw = await fs.readFile(path.join(ticketsDir(), entry.name), "utf8");
			const ticket = parseTicket(entry.name, raw);
			if (ticket.project === slug) summaries.push(toSummary(ticket));
		} catch {
			// Skip unreadable ticket files.
		}
	}
	summaries.sort(compareTickets);
	return summaries;
}

/** Read one ticket by file name. Return null when missing or invalid. */
export async function readTicketFile(filename: string): Promise<Ticket | null> {
	if (!isTicketFilename(filename)) return null;
	const full = path.join(ticketsDir(), filename);
	try {
		const raw = await fs.readFile(full, "utf8");
		return parseTicket(filename, raw);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}
