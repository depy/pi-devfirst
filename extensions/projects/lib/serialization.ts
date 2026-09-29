/** Serialize and parse project.md and phase documents. */

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.ts";
import { PHASES } from "./registry.ts";
import type { PhaseDoc, Project } from "./types.ts";

function asString(value: unknown, fallback = ""): string {
	return value === undefined || value === null ? fallback : String(value);
}

export function serializeProject(project: Project): string {
	return serializeFrontmatter(
		{
			project: project.project,
			title: project.title,
			status: project.status,
			phase: project.phase,
			created: project.created,
			updated: project.updated,
			finished: project.finished,
		},
		project.body || `# ${project.title}\n`,
	);
}

export function parseProject(raw: string): Project {
	const { meta, body } = parseFrontmatter(raw);
	return {
		project: asString(meta.project),
		title: asString(meta.title),
		status: meta.status === "finished" ? "finished" : "active",
		phase: asString(meta.phase, PHASES[0]?.name ?? ""),
		created: asString(meta.created),
		updated: asString(meta.updated),
		finished: typeof meta.finished === "string" ? meta.finished : null,
		body,
	};
}

export function serializePhaseDoc(doc: PhaseDoc): string {
	return serializeFrontmatter(
		{
			phase: doc.phase,
			status: doc.status,
			saves: doc.saves,
			created: doc.created,
			updated: doc.updated,
		},
		doc.body || `# ${doc.phase}\n`,
	);
}

export function parsePhaseDoc(raw: string): PhaseDoc {
	const { meta, body } = parseFrontmatter(raw);
	return {
		phase: asString(meta.phase),
		status: meta.status === "saved" ? "saved" : "draft",
		saves: typeof meta.saves === "number" && Number.isFinite(meta.saves) ? meta.saves : 0,
		created: asString(meta.created),
		updated: asString(meta.updated),
		body,
	};
}
