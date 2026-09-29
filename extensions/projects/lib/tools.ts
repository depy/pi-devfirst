/** Agent tools for the projects extension. */

import { Type } from "typebox";
import { phaseDocPath, readPhaseDoc, writePhaseDoc } from "./phase-doc.ts";
import { requirePhase } from "./registry.ts";
import { finishProject, setProjectPhase } from "./store.ts";
import { ticketsPlanningProposal } from "./phase-entry.ts";
import {
	isDirty,
	markSaved,
	pause,
	persist,
	requireActiveProject,
	activate,
} from "./session.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SaveParams = Type.Object({
	body: Type.String({
		description:
			"Full synthesized Markdown body for the current phase. Do not include frontmatter. Merge the conversation and the existing document into one clean document. Keep dated sections only when the merge is unclear.",
	}),
});

const ReadParams = Type.Object({
	phase: Type.Optional(Type.String({ description: "Phase name. Default: the current phase." })),
});

const SetPhaseParams = Type.Object({
	phase: Type.String({ description: "Target phase name from the fixed registry." }),
});

const EmptyParams = Type.Object({});

export function registerTools(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "project_save_phase",
		label: "Project Save Phase",
		description:
			"Synthesize and save the active project's current phase document. The extension snapshots the old document first. Call this before project_set_phase or project_finish.",
		promptSnippet: "Save the current project phase",
		executionMode: "sequential",
		parameters: SaveParams,
		async execute(_id, params) {
			const { slug, phase } = requireActiveProject();
			const doc = await writePhaseDoc(slug, phase, params.body);
			markSaved();
			persist(pi);
			return {
				content: [
					{
						type: "text" as const,
						text: `Saved phase "${phase}" to ${phaseDocPath(slug, phase)} (saves: ${doc.saves}).`,
					},
				],
				details: undefined,
			};
		},
	});

	pi.registerTool({
		name: "project_read_doc",
		label: "Project Read Document",
		description: "Read one phase document from the active project, without frontmatter.",
		promptSnippet: "Read a project phase document",
		parameters: ReadParams,
		async execute(_id, params) {
			const { slug, phase } = requireActiveProject();
			const target = params.phase ? requirePhase(params.phase).name : phase;
			const doc = await readPhaseDoc(slug, target);
			if (!doc) {
				return {
					content: [{ type: "text" as const, text: `No document yet for phase "${target}".` }],
					details: undefined,
				};
			}
			return { content: [{ type: "text" as const, text: doc.body }], details: undefined };
		},
	});

	pi.registerTool({
		name: "project_set_phase",
		label: "Project Set Phase",
		description:
			"Switch the active project to another phase. Refuses while the current phase has unsaved work; call project_save_phase first.",
		promptSnippet: "Switch the active project phase",
		executionMode: "sequential",
		parameters: SetPhaseParams,
		async execute(_id, params) {
			if (isDirty()) {
				throw new Error(
					"The current phase has unsaved work. Call project_save_phase with the synthesized body, then retry project_set_phase.",
				);
			}
			const { slug } = requireActiveProject();
			const phase = requirePhase(params.phase);
			await setProjectPhase(slug, phase.name);
			activate(slug, phase.name);
			persist(pi);
			if (phase.name === "tickets-planning") {
				pi.sendUserMessage(ticketsPlanningProposal(slug), { deliverAs: "followUp" });
			}
			return {
				content: [{ type: "text" as const, text: `Active phase is now "${phase.name}".` }],
				details: undefined,
			};
		},
	});

	pi.registerTool({
		name: "project_finish",
		label: "Project Finish",
		description:
			"Mark the active project finished and turn project mode off. Refuses while the current phase has unsaved work.",
		promptSnippet: "Finish the active project",
		executionMode: "sequential",
		parameters: EmptyParams,
		async execute() {
			if (isDirty()) {
				throw new Error(
					"The current phase has unsaved work. Call project_save_phase with the synthesized body, then retry project_finish.",
				);
			}
			const { slug } = requireActiveProject();
			await finishProject(slug);
			pause();
			persist(pi);
			return {
				content: [{ type: "text" as const, text: `Project "${slug}" is finished. Project mode is off.` }],
				details: undefined,
			};
		},
	});

	pi.registerTool({
		name: "project_pause",
		label: "Project Pause",
		description:
			"Turn project mode off but keep the project and its phase. Refuses while the current phase has unsaved work; call project_save_phase first.",
		promptSnippet: "Pause project mode",
		executionMode: "sequential",
		parameters: EmptyParams,
		async execute() {
			if (isDirty()) {
				throw new Error(
					"The current phase has unsaved work. Call project_save_phase with the synthesized body, then retry project_pause.",
				);
			}
			const { slug } = requireActiveProject();
			pause();
			persist(pi);
			return {
				content: [{ type: "text" as const, text: `Project mode off. Project "${slug}" stays saved.` }],
				details: undefined,
			};
		},
	});
}
