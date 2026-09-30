/** `/project` command and its subcommands. */

import * as fs from "node:fs/promises";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { PHASES, isPhase, requirePhase } from "./registry.ts";
import { assertSlug, createProject, finishProject, listProjects, projectDir, projectPath, readProject, reopenProject, setProjectPhase } from "./store.ts";
import { deleteProjectTickets, listProjectTicketFiles } from "./ticket-link.ts";
import { ticketsPlanningProposal } from "./phase-entry.ts";
import {
	activate,
	beginInternalRun,
	clearActive,
	getActiveSlug,
	getActivePhase,
	getState,
	isDirty,
	isOn,
	pause,
	persist,
	requireActiveProject,
	syncStatus,
} from "./session.ts";

const SUBCOMMANDS = [
	"new",
	"phase",
	"save",
	"off",
	"resume",
	"finish",
	"delete",
	"list",
	"show",
	"status",
] as const;

function saveInstruction(slug: string, phase: string): string {
	return [
		`Save the active project phase.`,
		`Project: ${slug}`,
		`Phase: ${phase}`,
		`Read the existing document with project_read_doc.`,
		`Then synthesize one clean Markdown body from this conversation and the existing document.`,
		`Call project_save_phase with that body. Do not include frontmatter.`,
	].join("\n");
}

function saveThenSwitchInstruction(slug: string, from: string, to: string): string {
	return [
		`The project "${slug}" is in phase "${from}" and that phase has unsaved work.`,
		`1. Read the existing document with project_read_doc.`,
		`2. Synthesize one clean Markdown body and call project_save_phase.`,
		`3. Call project_set_phase with phase "${to}".`,
	].join("\n");
}

function saveThenPauseInstruction(slug: string, phase: string): string {
	return [
		`The project "${slug}" is in phase "${phase}" and that phase has unsaved work.`,
		`1. Read the existing document with project_read_doc.`,
		`2. Synthesize one clean Markdown body and call project_save_phase.`,
		`3. Call project_pause to turn project mode off.`,
	].join("\n");
}

function saveThenFinishInstruction(slug: string, phase: string): string {
	return [
		`The project "${slug}" is in phase "${phase}" and that phase has unsaved work.`,
		`1. Read the existing document with project_read_doc.`,
		`2. Synthesize one clean Markdown body and call project_save_phase.`,
		`3. Call project_finish to mark the project finished and turn project mode off.`,
	].join("\n");
}

function formatProjectList(
	projects: Awaited<ReturnType<typeof listProjects>>,
): string {
	if (projects.length === 0) return "No projects.";
	return projects
		.map((project) => `${project.project}  [${project.status}]  ${project.phase}  ${project.updated}`)
		.join("\n");
}

/** Queue the instruction when the agent is busy, otherwise start a turn now. */
function sendToAgent(pi: ExtensionAPI, ctx: ExtensionCommandContext, message: string): void {
	beginInternalRun();
	if (ctx.isIdle()) {
		pi.sendUserMessage(message);
	} else {
		pi.sendUserMessage(message, { deliverAs: "followUp" });
	}
}

async function handleNew(rest: string[], ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const slug = rest[0];
	if (!slug) {
		ctx.ui.notify("Usage: /project new <slug> [title]", "warning");
		return;
	}
	const title = rest.slice(1).join(" ").trim() || undefined;
	const project = await createProject(slug, title);
	activate(project.project, project.phase);
	persist(pi);
	syncStatus(ctx);
	ctx.ui.notify(`Project "${project.project}" created. Phase: ${project.phase}.`, "info");
}

async function handlePhase(
	rest: string[],
	ctx: ExtensionCommandContext,
	pi: ExtensionAPI,
): Promise<void> {
	const name = rest[0];
	if (!name || !isPhase(name)) {
		ctx.ui.notify(`Usage: /project phase <${PHASES.map((phase) => phase.name).join("|")}>`, "warning");
		return;
	}
	const { slug, phase } = requireActiveProject();
	if (isDirty()) {
		sendToAgent(pi, ctx, saveThenSwitchInstruction(slug, phase, name));
		ctx.ui.notify(`Saving "${phase}", then switching to "${name}".`, "info");
		return;
	}
	await setProjectPhase(slug, name);
	activate(slug, name);
	persist(pi);
	syncStatus(ctx);
	ctx.ui.notify(`Active phase is now "${name}".`, "info");
	if (name === "tickets-planning") {
		sendToAgent(pi, ctx, ticketsPlanningProposal(slug));
	}
}

async function handleSave(ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const { slug, phase } = requireActiveProject();
	sendToAgent(pi, ctx, saveInstruction(slug, phase));
	ctx.ui.notify(`Saving phase "${phase}"...`, "info");
}

async function handleOff(ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const { slug, phase } = requireActiveProject();
	if (isDirty()) {
		sendToAgent(pi, ctx, saveThenPauseInstruction(slug, phase));
		ctx.ui.notify(`Saving "${phase}", then turning project mode off.`, "info");
		return;
	}
	pause();
	persist(pi);
	syncStatus(ctx);
	ctx.ui.notify(`Project mode off. Project "${slug}" stays saved.`, "info");
}

async function handleResume(rest: string[], ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const requested = rest[0];
	const slug = requested || getActiveSlug();
	if (!slug) {
		ctx.ui.notify("Usage: /project resume <slug>", "warning");
		return;
	}
	const project = await reopenProject(slug);
	activate(project.project, project.phase);
	persist(pi);
	syncStatus(ctx);
	ctx.ui.notify(`Resumed project "${project.project}" at phase "${project.phase}".`, "info");
}

async function handleFinish(ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const { slug, phase } = requireActiveProject();
	if (isDirty()) {
		sendToAgent(pi, ctx, saveThenFinishInstruction(slug, phase));
		ctx.ui.notify(`Saving "${phase}", then finishing "${slug}".`, "info");
		return;
	}
	await finishProject(slug);
	pause();
	persist(pi);
	syncStatus(ctx);
	ctx.ui.notify(`Project "${slug}" is finished. Project mode is off.`, "info");
}

async function handleDelete(rest: string[], ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	const slugInput = rest[0];
	if (!slugInput) {
		ctx.ui.notify("Usage: /project delete <slug> [tickets|keep]", "warning");
		return;
	}
	if (!ctx.isIdle()) {
		ctx.ui.notify("The agent is busy. Wait until it is idle before deleting.", "warning");
		return;
	}

	const slug = assertSlug(slugInput);
	await readProject(slug);
	const ticketFiles = await listProjectTicketFiles(slug);
	const isActive = getActiveSlug() === slug;
	const activeDirty = isActive && isDirty();

	let deleteTickets: boolean;
	if (ctx.hasUI) {
		const dirtyNote = activeDirty ? " The active project has unsaved work." : "";
		const confirmed = await ctx.ui.confirm(
			`Delete project "${slug}"?`,
			`This removes ~/.projects/${slug} and its history. This cannot be undone.${dirtyNote}`,
		);
		if (!confirmed) {
			ctx.ui.notify("Delete cancelled.", "info");
			return;
		}
		if (ticketFiles.length > 0) {
			deleteTickets = await ctx.ui.confirm(
				`Also delete ${ticketFiles.length} ticket(s)?`,
				`These tickets have project = "${slug}". Choose No to keep them.`,
			);
		} else {
			deleteTickets = false;
		}
	} else {
		const mode = rest[1];
		if (mode !== "tickets" && mode !== "keep") {
			ctx.ui.notify("Non-interactive mode needs an explicit choice: tickets or keep.", "warning");
			return;
		}
		deleteTickets = mode === "tickets";
	}

	await fs.rm(projectDir(slug), { recursive: true, force: true });
	const removedTickets = deleteTickets ? await deleteProjectTickets(slug) : [];

	if (isActive) {
		clearActive();
		persist(pi);
		syncStatus(ctx);
	}

	const ticketNote = removedTickets.length > 0 ? ` and ${removedTickets.length} ticket(s)` : "";
	const keepNote = !deleteTickets && ticketFiles.length > 0 ? ` ${ticketFiles.length} ticket(s) kept.` : "";
	ctx.ui.notify(`Deleted project "${slug}"${ticketNote}.${keepNote}`, "info");
}

async function handleList(ctx: ExtensionCommandContext): Promise<void> {
	ctx.ui.notify(formatProjectList(await listProjects()), "info");
}

async function handleShow(rest: string[], ctx: ExtensionCommandContext): Promise<void> {
	const slug = rest[0] || getActiveSlug();
	if (!slug) {
		ctx.ui.notify("Usage: /project show <slug>", "warning");
		return;
	}
	await readProject(slug);
	ctx.ui.notify(await fs.readFile(projectPath(slug), "utf8"), "info");
}

async function handleStatus(ctx: ExtensionCommandContext): Promise<void> {
	const state = getState();
	if (!isOn()) {
		const last = state.activeSlug ? ` Last project: ${state.activeSlug}.` : "";
		ctx.ui.notify(`No active project.${last}`, "info");
		return;
	}
	const phaseName = getActivePhase() ?? state.activePhase;
	if (!phaseName) {
		ctx.ui.notify("Project mode is on, but no phase is set. Run /project resume.", "warning");
		return;
	}
	const phase = requirePhase(phaseName);
	const dirty = isDirty() ? "yes" : "no";
	ctx.ui.notify(
		`Project: ${state.activeSlug}\nPhase: ${phase.name} (${phase.number}/${PHASES.length})\nUnsaved work: ${dirty}`,
		"info",
	);
}

export function registerCommands(pi: ExtensionAPI): void {
	pi.registerCommand("project", {
		description: "Manage phase-based projects in ~/.projects",
		getArgumentCompletions: async (prefix: string) => {
			const trimmed = prefix.trimStart();
			if (trimmed.startsWith("phase ")) {
				const partial = trimmed.slice("phase ".length);
				return PHASES.filter((phase) => phase.name.startsWith(partial)).map((phase) => ({
					value: `phase ${phase.name}`,
					label: `${phase.number}  ${phase.name}`,
				}));
			}
			if (trimmed.startsWith("resume ") || trimmed.startsWith("show ") || trimmed.startsWith("delete ")) {
				const command = trimmed.split(/\s+/)[0];
				const partial = trimmed.slice(command.length + 1);
				const projects = await listProjects();
				return projects
					.filter((project) => project.project.startsWith(partial))
					.map((project) => ({ value: `${command} ${project.project}`, label: project.project }));
			}
			return SUBCOMMANDS.filter((name) => name.startsWith(trimmed)).map((name) => ({
				value: name,
				label: name,
			}));
		},
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const sub = parts[0] ?? "";
			const rest = parts.slice(1);
			try {
				switch (sub) {
					case "new":
						await handleNew(rest, ctx, pi);
						break;
					case "phase":
						await handlePhase(rest, ctx, pi);
						break;
					case "save":
						await handleSave(ctx, pi);
						break;
					case "off":
						await handleOff(ctx, pi);
						break;
					case "resume":
						await handleResume(rest, ctx, pi);
						break;
					case "finish":
						await handleFinish(ctx, pi);
						break;
					case "delete":
						await handleDelete(rest, ctx, pi);
						break;
					case "list":
						await handleList(ctx);
						break;
					case "show":
						await handleShow(rest, ctx);
						break;
					case "status":
					case "":
						await handleStatus(ctx);
						break;
					default:
						ctx.ui.notify(`Unknown subcommand "${sub}". Try: ${SUBCOMMANDS.join(", ")}`, "warning");
				}
			} catch (error) {
				ctx.ui.notify((error as Error).message, "error");
			}
		},
	});
}
