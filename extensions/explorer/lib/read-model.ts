/**
 * Assemble view models from the devfirst read sources.
 *
 * Read-only. Reuses the projects library for projects and phase documents, and
 * the local ticket reader for tickets.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { historyDir, listSnapshots, phaseDocPath, readPhaseDoc } from "../../projects/lib/phase-doc.ts";
import { PHASES, getPhase } from "../../projects/lib/registry.ts";
import { parsePhaseDoc } from "../../projects/lib/serialization.ts";
import { listProjects, pathExists, readProject } from "../../projects/lib/store.ts";
import type { ProjectSummary } from "../../projects/lib/types.ts";
import { listTicketsForProject, readTicketFile } from "./tickets.ts";
import type {
	PhaseLink,
	PhasePageView,
	ProjectListView,
	ProjectPageView,
	TicketPageView,
	VersionRef,
} from "./types.ts";

function toSummary(project: {
	project: string;
	title: string;
	status: string;
	phase: string;
	updated: string;
}): ProjectSummary {
	return {
		project: project.project,
		title: project.title,
		status: project.status === "finished" ? "finished" : "active",
		phase: project.phase,
		updated: project.updated,
	};
}

export async function loadProjectList(): Promise<ProjectListView> {
	return { projects: await listProjects() };
}

async function loadProjectOrNull(slug: string) {
	try {
		return await readProject(slug);
	} catch {
		return null;
	}
}

export async function loadProjectPage(slug: string): Promise<ProjectPageView | null> {
	const project = await loadProjectOrNull(slug);
	if (!project) return null;

	const phases: PhaseLink[] = [];
	for (const phase of PHASES) {
		phases.push({
			number: phase.number,
			name: phase.name,
			title: phase.title,
			exists: await pathExists(phaseDocPath(slug, phase.name)),
			isCurrent: phase.name === project.phase,
		});
	}

	return {
		project: toSummary(project),
		tickets: await listTicketsForProject(slug),
		phases,
	};
}

function formatStamp(stamp: string): string {
	const match = stamp.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-\d+)?$/);
	if (!match) return stamp;
	return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

function versionRefs(
	slug: string,
	phase: string,
	snapshots: string[],
	currentTimestamp: string | null,
): VersionRef[] {
	const refs: VersionRef[] = [
		{
			timestamp: currentTimestamp ?? "",
			label: "Current",
			href: `/p/${slug}/phase/${phase}`,
			current: true,
		},
	];

	for (const snapshot of [...snapshots].reverse()) {
		const stamp = path.basename(snapshot).replace(/\.md$/, "");
		refs.push({
			timestamp: stamp,
			label: formatStamp(stamp),
			href: `/p/${slug}/phase/${phase}/v/${stamp}`,
			current: false,
		});
	}
	return refs;
}

async function readSnapshot(slug: string, phase: string, version: string) {
	if (!/^[A-Za-z0-9._-]+$/.test(version) || version.includes("..")) return null;
	const dir = historyDir(slug, phase);
	const snapshots = await listSnapshots(slug, phase);
	const match = snapshots.find((snapshot) => path.basename(snapshot) === `${version}.md`);
	if (!match) return null;
	// Confirm the resolved path is still inside the history directory.
	if (path.dirname(path.resolve(match)) !== path.resolve(dir)) return null;
	return parsePhaseDoc(await fs.readFile(match, "utf8"));
}

export async function loadPhasePage(
	slug: string,
	phaseName: string,
	version?: string,
): Promise<PhasePageView | null> {
	const project = await loadProjectOrNull(slug);
	if (!project) return null;

	const phase = getPhase(phaseName);
	if (!phase) return null;

	const currentDoc = await readPhaseDoc(slug, phase.name);
	const snapshots = await listSnapshots(slug, phase.name);

	let doc = currentDoc;
	if (version) {
		doc = await readSnapshot(slug, phase.name, version);
		if (!doc) return null;
	}

	return {
		project: toSummary(project),
		phase,
		doc,
		versions: versionRefs(slug, phase.name, snapshots, currentDoc?.updated ?? null),
	};
}

export async function loadTicketPage(slug: string, filename: string): Promise<TicketPageView | null> {
	const project = await loadProjectOrNull(slug);
	if (!project) return null;

	const ticket = await readTicketFile(filename);
	if (!ticket) return null;
	if (ticket.project !== slug) return null;

	return { project: toSummary(project), ticket };
}
