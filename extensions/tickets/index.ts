/**
 * Tickets Extension
 *
 * File-backed ticket management. Each ticket is a Markdown file named
 * `${project}-${epic}-${task}-${random-3-chars}.md` inside ~/.tickets.
 *
 * Agent tools: ticket_add, ticket_remove, ticket_modify, ticket_show, ticket_list
 * User commands: /tickets, /ticket
 */

import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Type } from "typebox";
import {
	DynamicBorder,
	getMarkdownTheme,
	withFileMutationQueue,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text, matchesKey } from "@earendil-works/pi-tui";

const TICKETS_DIR = path.join(os.homedir(), ".tickets");
const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const TICKET_STATUSES = ["todo", "doing", "blocked", "done"] as const;

interface Ticket {
	ticket: string; // stem, without .md
	project: string;
	epic: string;
	task: string;
	status: string;
	title: string;
	number: number | null;
	links: string[];
	description: string;
	testingScenarios: string[];
	acceptanceCriteria: string[];
	created: string;
	updated: string;
}

type TicketAction = "add" | "remove" | "modify" | "list" | "show";

interface TicketDetails {
	action: TicketAction;
	ticket?: string;
	tickets?: string[];
	error?: string;
}

// ---------------------------------------------------------------------------
// Naming and identifiers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function randomCode(): string {
	let code = "";
	for (let i = 0; i < 3; i++) {
		code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
	}
	return code;
}

function ticketBase(project: string, epic: string, task: string, status: string): string {
	return [project, epic, task, status].map(slugify).filter(Boolean).join("-");
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function listFilenames(): Promise<string[]> {
	try {
		const entries = await fs.readdir(TICKETS_DIR, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => entry.name)
			.sort();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
}

/** Accept a full filename, a stem, or a unique trailing code. */
async function resolveTicketFilename(identifier: string): Promise<string> {
	const files = await listFilenames();
	const arg = identifier.trim();
	const candidates = [arg, `${arg}.md`];
	const exact = files.find((file) => candidates.includes(file));
	if (exact) return exact;

	const suffixMatches = files.filter((file) => file.replace(/\.md$/, "").endsWith(`-${arg}`));
	if (suffixMatches.length === 1) return suffixMatches[0];
	if (suffixMatches.length > 1) {
		throw new Error(`Ticket reference "${identifier}" is ambiguous: ${suffixMatches.join(", ")}`);
	}
	throw new Error(`Ticket not found: ${identifier}`);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function parseSectionList(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => /^-\s+/.test(line))
		.map((line) => line.replace(/^-\s+/, "").replace(/^\[[ xX]\]\s*/, "").trim())
		.filter(Boolean);
}

function splitSections(body: string): Record<string, string> {
	const sections: Record<string, string> = {};
	let current = "";
	let buffer: string[] = [];
	const flush = () => {
		if (current) sections[current] = buffer.join("\n").trim();
	};
	for (const line of body.split("\n")) {
		const heading = line.match(/^##\s+(.+?)\s*$/);
		if (heading) {
			flush();
			current = heading[1].toLowerCase();
			buffer = [];
		} else if (current) {
			buffer.push(line);
		}
	}
	flush();
	return sections;
}

function serializeTicket(ticket: Ticket): string {
	const frontmatter = [
		`ticket: ${JSON.stringify(ticket.ticket)}`,
		`project: ${JSON.stringify(ticket.project)}`,
		`epic: ${JSON.stringify(ticket.epic)}`,
		`task: ${JSON.stringify(ticket.task)}`,
		`status: ${JSON.stringify(ticket.status)}`,
		`title: ${JSON.stringify(ticket.title)}`,
		`number: ${JSON.stringify(ticket.number)}`,
		`created: ${JSON.stringify(ticket.created)}`,
		`updated: ${JSON.stringify(ticket.updated)}`,
		`links: ${JSON.stringify(ticket.links)}`,
	].join("\n");

	const list = (items: string[], prefix = "- "): string[] =>
		items.length ? items.map((item) => `${prefix}${item}`) : ["_None._"];

	const body = [
		`# ${ticket.title}`,
		"",
		"## Description",
		"",
		ticket.description || "_No description._",
		"",
		"## Testing Scenarios",
		"",
		...list(ticket.testingScenarios),
		"",
		"## Acceptance Criteria",
		"",
		...list(ticket.acceptanceCriteria, "- [ ] "),
		"",
	].join("\n");

	return `---\n${frontmatter}\n---\n\n${body}`;
}

function parseTicket(raw: string): Ticket {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) throw new Error("Ticket file has no frontmatter block");

	const meta: Record<string, unknown> = {};
	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx < 0) continue;
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		try {
			meta[key] = JSON.parse(value);
		} catch {
			meta[key] = value;
		}
	}

	const sections = splitSections(match[2]);
	const asString = (value: unknown): string => (value === undefined ? "" : String(value));

	return {
		ticket: asString(meta.ticket),
		project: asString(meta.project),
		epic: asString(meta.epic),
		task: asString(meta.task),
		status: slugify(asString(meta.status)) || "todo",
		title: asString(meta.title),
		number: typeof meta.number === "number" ? meta.number : null,
		links: Array.isArray(meta.links) ? meta.links.map(String) : [],
		description: sections.description ?? "",
		testingScenarios: parseSectionList(sections["testing scenarios"] ?? ""),
		acceptanceCriteria: parseSectionList(sections["acceptance criteria"] ?? ""),
		created: asString(meta.created),
		updated: asString(meta.updated),
	};
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function assertTaskWords(task: string): void {
	const words = task.trim().split(/\s+/).filter(Boolean);
	if (words.length > 5) {
		throw new Error(`Task must be 3-5 words, got ${words.length}: "${task}"`);
	}
}

function assertNumber(value: number): void {
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`number must be an integer >= 1, got ${value}`);
	}
}

function assertStatus(value: string): string {
	const status = slugify(value);
	if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
		throw new Error(`status must be one of: ${TICKET_STATUSES.join(", ")}, got "${value}"`);
	}
	return status;
}

/** Next order number = highest existing number + 1 (or 1 when none). */
async function nextTicketNumber(): Promise<number> {
	let max = 0;
	for (const filename of await listFilenames()) {
		try {
			const ticket = parseTicket(await fs.readFile(path.join(TICKETS_DIR, filename), "utf8"));
			if (typeof ticket.number === "number" && ticket.number > max) max = ticket.number;
		} catch {
			// Ignore unreadable files when computing the next number.
		}
	}
	return max + 1;
}

async function addTicket(input: {
	project: string;
	epic: string;
	task: string;
	status?: string;
	title: string;
	number?: number;
	links?: string[];
	description?: string;
	testingScenarios?: string[];
	acceptanceCriteria?: string[];
}): Promise<{ filename: string; ticket: Ticket }> {
	assertTaskWords(input.task);
	const project = slugify(input.project);
	const epic = slugify(input.epic);
	const task = slugify(input.task);
	const status = input.status !== undefined ? assertStatus(input.status) : "todo";
	const base = ticketBase(project, epic, task, status);
	if (!base) throw new Error("project, epic, task and status must contain letters or digits");

	if (input.number !== undefined) assertNumber(input.number);
	const number = input.number ?? (await nextTicketNumber());

	await fs.mkdir(TICKETS_DIR, { recursive: true });

	let filename = "";
	for (let attempt = 0; attempt < 100; attempt++) {
		const candidate = `${base}-${randomCode()}.md`;
		if (!(await pathExists(path.join(TICKETS_DIR, candidate)))) {
			filename = candidate;
			break;
		}
	}
	if (!filename) throw new Error("Could not generate a unique ticket filename");

	const now = new Date().toISOString();
	const ticket: Ticket = {
		ticket: filename.replace(/\.md$/, ""),
		project,
		epic,
		task,
		status,
		title: input.title,
		number,
		links: input.links ?? [],
		description: input.description ?? "",
		testingScenarios: input.testingScenarios ?? [],
		acceptanceCriteria: input.acceptanceCriteria ?? [],
		created: now,
		updated: now,
	};

	const fullPath = path.join(TICKETS_DIR, filename);
	await withFileMutationQueue(fullPath, async () => {
		await fs.writeFile(fullPath, serializeTicket(ticket), "utf8");
	});
	return { filename, ticket };
}

async function removeTicket(identifier: string): Promise<string> {
	const filename = await resolveTicketFilename(identifier);
	const fullPath = path.join(TICKETS_DIR, filename);
	await withFileMutationQueue(fullPath, async () => {
		await fs.rm(fullPath);
	});
	return filename;
}

async function modifyTicket(
	identifier: string,
	changes: {
		project?: string;
		epic?: string;
		task?: string;
		status?: string;
		title?: string;
		number?: number;
		links?: string[];
		description?: string;
		testingScenarios?: string[];
		acceptanceCriteria?: string[];
	},
): Promise<{ oldFilename: string; newFilename: string; ticket: Ticket }> {
	const oldFilename = await resolveTicketFilename(identifier);
	const oldPath = path.join(TICKETS_DIR, oldFilename);

	return await withFileMutationQueue(oldPath, async () => {
		const ticket = parseTicket(await fs.readFile(oldPath, "utf8"));

		if (changes.project !== undefined) ticket.project = slugify(changes.project);
		if (changes.epic !== undefined) ticket.epic = slugify(changes.epic);
		if (changes.task !== undefined) {
			assertTaskWords(changes.task);
			ticket.task = slugify(changes.task);
		}
		if (changes.status !== undefined) ticket.status = assertStatus(changes.status);
		if (changes.title !== undefined) ticket.title = changes.title;
		if (changes.number !== undefined) {
			assertNumber(changes.number);
			ticket.number = changes.number;
		}
		if (changes.links !== undefined) ticket.links = changes.links;
		if (changes.description !== undefined) ticket.description = changes.description;
		if (changes.testingScenarios !== undefined) ticket.testingScenarios = changes.testingScenarios;
		if (changes.acceptanceCriteria !== undefined) ticket.acceptanceCriteria = changes.acceptanceCriteria;

		ticket.updated = new Date().toISOString();

		const oldStem = oldFilename.replace(/\.md$/, "");
		const suffixMatch = oldStem.match(/-([a-z0-9]{3})$/);
		const suffix = suffixMatch ? suffixMatch[1] : randomCode();
		const newBase = ticketBase(ticket.project, ticket.epic, ticket.task, ticket.status);
		if (!newBase) throw new Error("project, epic, task and status must contain letters or digits");

		const newFilename = `${newBase}-${suffix}.md`;
		ticket.ticket = newFilename.replace(/\.md$/, "");

		if (newFilename !== oldFilename) {
			const newPath = path.join(TICKETS_DIR, newFilename);
			if (await pathExists(newPath)) {
				throw new Error(`Cannot rename ticket: ${newFilename} already exists`);
			}
			await fs.writeFile(oldPath, serializeTicket(ticket), "utf8");
			await fs.rename(oldPath, newPath);
		} else {
			await fs.writeFile(oldPath, serializeTicket(ticket), "utf8");
		}

		return { oldFilename, newFilename, ticket };
	});
}

async function readTicket(identifier: string): Promise<{ filename: string; raw: string; ticket: Ticket }> {
	const filename = await resolveTicketFilename(identifier);
	const raw = await fs.readFile(path.join(TICKETS_DIR, filename), "utf8");
	return { filename, raw, ticket: parseTicket(raw) };
}

/** Strip the frontmatter so the body renders cleanly as Markdown. */
function ticketBody(raw: string): string {
	const match = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
	return (match ? match[1] : raw).trim();
}

interface TicketListEntry {
	filename: string;
	number: number | null;
}

/** Tickets sorted by order number; unnumbered tickets go last, then by name. */
async function orderedTickets(): Promise<TicketListEntry[]> {
	const entries: TicketListEntry[] = [];
	for (const filename of await listFilenames()) {
		let number: number | null = null;
		try {
			number = parseTicket(await fs.readFile(path.join(TICKETS_DIR, filename), "utf8")).number;
		} catch {
			number = null;
		}
		entries.push({ filename, number });
	}
	entries.sort((a, b) => {
		const an = a.number ?? Number.POSITIVE_INFINITY;
		const bn = b.number ?? Number.POSITIVE_INFINITY;
		if (an !== bn) return an - bn;
		return a.filename.localeCompare(b.filename);
	});
	return entries;
}

function formatTicketList(entries: TicketListEntry[]): string {
	if (entries.length === 0) return "No tickets.";
	const labels = entries.map((entry) => String(entry.number ?? "-"));
	const width = Math.max(...labels.map((label) => label.length));
	return entries.map((entry, i) => `${labels[i].padStart(width)}  ${entry.filename}`).join("\n");
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const StatusSchema = Type.Union([
	Type.Literal("todo"),
	Type.Literal("doing"),
	Type.Literal("blocked"),
	Type.Literal("done"),
]);

const AddParams = Type.Object({
	project: Type.String({ description: "Project identifier, e.g. healthd" }),
	epic: Type.String({ description: "Epic identifier, e.g. led-policy" }),
	task: Type.String({ description: "Short task name, 3-5 words" }),
	status: Type.Optional(StatusSchema),
	title: Type.String({ description: "Human-readable ticket title" }),
	number: Type.Optional(
		Type.Integer({ minimum: 1, description: "Tack order; auto-assigned (highest + 1) when omitted" }),
	),
	links: Type.Optional(Type.Array(Type.String(), { description: "Relevant links" })),
	description: Type.Optional(Type.String({ description: "What and why" })),
	testingScenarios: Type.Optional(Type.Array(Type.String(), { description: "Test scenarios" })),
	acceptanceCriteria: Type.Optional(Type.Array(Type.String(), { description: "Acceptance criteria" })),
});

const RemoveParams = Type.Object({
	ticket: Type.String({ description: "Ticket filename, stem, or 3-char code" }),
});

const ShowParams = Type.Object({
	ticket: Type.String({ description: "Ticket filename, stem, or 3-char code" }),
});

const ModifyParams = Type.Object({
	ticket: Type.String({ description: "Ticket filename, stem, or 3-char code" }),
	project: Type.Optional(Type.String()),
	epic: Type.Optional(Type.String()),
	task: Type.Optional(Type.String({ description: "Short task name, 3-5 words" })),
	status: Type.Optional(StatusSchema),
	title: Type.Optional(Type.String()),
	number: Type.Optional(Type.Integer({ minimum: 1, description: "Tack order" })),
	links: Type.Optional(Type.Array(Type.String())),
	description: Type.Optional(Type.String()),
	testingScenarios: Type.Optional(Type.Array(Type.String())),
	acceptanceCriteria: Type.Optional(Type.Array(Type.String())),
});

const ListParams = Type.Object({});

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ticket_add",
		label: "Ticket Add",
		description: "Create a ticket file in ~/.tickets. Returns the new filename.",
		promptSnippet: "Create a ticket file",
		parameters: AddParams,
		async execute(_id, params) {
			try {
				const { filename } = await addTicket(params);
				const details: TicketDetails = { action: "add", ticket: filename, tickets: await listFilenames() };
				return { content: [{ type: "text", text: `Created ticket ${filename}` }], details };
			} catch (error) {
				throw new Error(`ticket_add failed: ${(error as Error).message}`);
			}
		},
	});

	pi.registerTool({
		name: "ticket_remove",
		label: "Ticket Remove",
		description: "Delete a ticket file from ~/.tickets.",
		promptSnippet: "Delete a ticket file",
		parameters: RemoveParams,
		async execute(_id, params) {
			try {
				const filename = await removeTicket(params.ticket);
				const details: TicketDetails = { action: "remove", ticket: filename, tickets: await listFilenames() };
				return { content: [{ type: "text", text: `Removed ticket ${filename}` }], details };
			} catch (error) {
				throw new Error(`ticket_remove failed: ${(error as Error).message}`);
			}
		},
	});

	pi.registerTool({
		name: "ticket_modify",
		label: "Ticket Modify",
		description:
			"Update ticket fields. Renames the file if project, epic or task change; keeps the 3-char code.",
		promptSnippet: "Update a ticket",
		parameters: ModifyParams,
		async execute(_id, params) {
			try {
				const { ticket } = params;
				const changes = {
					project: params.project,
					epic: params.epic,
					task: params.task,
					status: params.status,
					title: params.title,
					number: params.number,
					links: params.links,
					description: params.description,
					testingScenarios: params.testingScenarios,
					acceptanceCriteria: params.acceptanceCriteria,
				};
				const result = await modifyTicket(ticket, changes);
				const renamed =
					result.newFilename !== result.oldFilename
						? ` (renamed from ${result.oldFilename})`
						: "";
				const details: TicketDetails = {
					action: "modify",
					ticket: result.newFilename,
					tickets: await listFilenames(),
				};
				return {
					content: [{ type: "text", text: `Updated ticket ${result.newFilename}${renamed}` }],
					details,
				};
			} catch (error) {
				throw new Error(`ticket_modify failed: ${(error as Error).message}`);
			}
		},
	});

	pi.registerTool({
		name: "ticket_show",
		label: "Ticket Show",
		description: "Show one ticket's full Markdown content.",
		promptSnippet: "Show a ticket's content",
		parameters: ShowParams,
		async execute(_id, params) {
			try {
				const { filename, raw } = await readTicket(params.ticket);
				const details: TicketDetails = { action: "show", ticket: filename };
				return { content: [{ type: "text", text: raw }], details };
			} catch (error) {
				throw new Error(`ticket_show failed: ${(error as Error).message}`);
			}
		},
	});

	pi.registerTool({
		name: "ticket_list",
		label: "Ticket List",
		description: "List ticket filenames in ~/.tickets, one per line.",
		promptSnippet: "List ticket files",
		parameters: ListParams,
		async execute() {
			const tickets = await orderedTickets();
			const details: TicketDetails = { action: "list", tickets: tickets.map((entry) => entry.filename) };
			return {
				content: [{ type: "text", text: formatTicketList(tickets) }],
				details,
			};
		},
	});

	pi.registerCommand("tickets", {
		description: "List tickets in ~/.tickets, sorted by order number",
		handler: async (_args, ctx) => {
			const tickets = await orderedTickets();
			ctx.ui.notify(formatTicketList(tickets), "info");
		},
	});

	pi.registerCommand("ticket", {
		description: "Show a ticket from ~/.tickets",
		getArgumentCompletions: async (prefix) => {
			const tickets = await orderedTickets();
			const items = tickets
				.filter((entry) => entry.filename.startsWith(prefix))
				.map((entry) => ({ value: entry.filename, label: `${entry.number ?? "-"}  ${entry.filename}` }));
			return items.length ? items : null;
		},
		handler: async (args, ctx) => {
			try {
				const identifier = args.trim();
				let filename: string;
				if (identifier) {
					filename = await resolveTicketFilename(identifier);
				} else {
					const tickets = await orderedTickets();
					if (tickets.length === 0) {
						ctx.ui.notify("No tickets.", "info");
						return;
					}
					const selected = await ctx.ui.select(
						"Select a ticket",
						tickets.map((entry) => entry.filename),
					);
					if (!selected) return;
					filename = selected;
				}

				const raw = await fs.readFile(path.join(TICKETS_DIR, filename), "utf8");
				const body = ticketBody(raw);

				if (ctx.mode !== "tui") {
					ctx.ui.notify(body || raw, "info");
					return;
				}

				await ctx.ui.custom((_tui, theme, _kb, done) => {
					const container = new Container();
					const border = new DynamicBorder((line: string) => theme.fg("accent", line));
					container.addChild(border);
					container.addChild(new Text(theme.fg("accent", theme.bold(`Ticket: ${filename}`)), 1, 0));
					container.addChild(new Markdown(body, 1, 1, getMarkdownTheme()));
					container.addChild(new Text(theme.fg("dim", "Press Enter or Esc to close"), 1, 0));
					container.addChild(border);
					return {
						render: (width: number) => container.render(width),
						invalidate: () => container.invalidate(),
						handleInput: (data: string) => {
							if (matchesKey(data, "enter") || matchesKey(data, "escape")) done(undefined);
						},
					};
				});
			} catch (error) {
				ctx.ui.notify((error as Error).message, "error");
			}
		},
	});
}
