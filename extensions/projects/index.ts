/**
 * Projects Extension
 *
 * Global, phase-based project workflow. Projects live in ~/.projects.
 * Tickets stay in ~/.tickets and link by the `project` slug.
 *
 * User commands: /project new|phase|save|off|resume|finish|list|show|status
 * Agent tools: project_save_phase, project_read_doc, project_set_phase,
 *              project_finish, project_pause
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { phaseDocPath } from "./lib/phase-doc.ts";
import { requirePhase } from "./lib/registry.ts";
import { registerCommands } from "./lib/commands.ts";
import {
	beginTurn,
	endInternalRun,
	getActivePhase,
	getActiveSlug,
	isOn,
	noteAssistantActivity,
	persist,
	restoreFrom,
	syncStatus,
} from "./lib/session.ts";
import { registerTools } from "./lib/tools.ts";

interface TextBlock {
	type?: string;
	text?: string;
}

function assistantHasText(message: unknown): boolean {
	const candidate = message as { role?: string; content?: unknown };
	if (candidate.role !== "assistant") return false;
	const content = candidate.content;
	if (typeof content === "string") return content.trim().length > 0;
	if (Array.isArray(content)) {
		return content.some((block) => {
			const typed = block as TextBlock;
			return typed.type === "text" && typeof typed.text === "string" && typed.text.trim().length > 0;
		});
	}
	return false;
}

export default function projectsExtension(pi: ExtensionAPI): void {
	registerTools(pi);
	registerCommands(pi);

	pi.on("session_start", async (_event, ctx) => {
		restoreFrom(ctx);
		syncStatus(ctx);
	});

	pi.on("turn_start", async (event) => {
		beginTurn(event.turnIndex);
	});

	pi.on("turn_end", async (event) => {
		if (!isOn()) return;
		if (!assistantHasText(event.message)) return;
		noteAssistantActivity(event.turnIndex);
		persist(pi);
	});

	pi.on("agent_end", async () => {
		endInternalRun();
	});

	pi.on("before_agent_start", async () => {
		if (!isOn()) return;
		const slug = getActiveSlug();
		const phaseName = getActivePhase();
		if (!slug || !phaseName) return;
		const phase = requirePhase(phaseName);
		return {
			message: {
				customType: "project-mode-context",
				display: false,
				content: [
					"[PROJECT MODE ACTIVE]",
					`Active project: ${slug}`,
					`Current phase: ${phase.name} (${phase.number}/7) - ${phase.title}`,
					`Phase document: ${phaseDocPath(slug, phase.name)}`,
					`Follow the "${phase.name}" skill for this phase.`,
					`Synthesize and call project_save_phase before project_set_phase, project_pause, or project_finish.`,
				].join("\n"),
			},
		};
	});

	// Keep only the latest project context, and drop it when mode is off.
	pi.on("context", async (event) => {
		const messages = event.messages;
		const isProjectContext = (message: unknown): boolean =>
			(message as { customType?: string }).customType === "project-mode-context";

		if (!messages.some(isProjectContext)) return;

		if (!isOn()) {
			return { messages: messages.filter((message) => !isProjectContext(message)) };
		}

		const indexes: number[] = [];
		messages.forEach((message, index) => {
			if (isProjectContext(message)) indexes.push(index);
		});
		const keep = indexes.at(-1);
		if (keep === undefined || indexes.length <= 1) return;
		return { messages: messages.filter((message, index) => !isProjectContext(message) || index === keep) };
	});
}
