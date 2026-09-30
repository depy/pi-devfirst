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
import { documentHeadings, slugify } from "./render.ts";
import { listTicketsForProject, readTicketFile } from "./tickets.ts";
import type {
	LinkRef,
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

const PROJECT_DOC_RE = /\.projects[/\\]([^/\\]+)[/\\]\d+-([a-z0-9-]+)\.md$/;
const TICKET_DOC_RE = /\.tickets[/\\]([A-Za-z0-9._-]+\.md)$/;

interface HeadingMatch {
	id: string;
	text: string;
}

function tokenPrefixLength(a: string[], b: string[]): number {
	let index = 0;
	while (index < a.length && index < b.length && a[index] === b[index]) index++;
	return index;
}

/**
 * Map a heading reference to a heading id. Exact slug first, then the heading
 * with the longest leading word run shared with the reference. A single shared
 * word is too weak; two or more words or a full reference match is required.
 */
function matchHeading(headings: HeadingMatch[], reference: string): string | null {
	const referenceSlug = slugify(reference);
	if (!referenceSlug) return null;
	const exact = headings.find((heading) => heading.id === referenceSlug);
	if (exact) return exact.id;

	const referenceTokens = referenceSlug.split("-").filter(Boolean);
	let best: { id: string; score: number } | null = null;
	for (const heading of headings) {
		const tokens = heading.id.split("-").filter(Boolean);
		const score = tokenPrefixLength(referenceTokens, tokens);
		if (score === 0) continue;
		if (!best || score > best.score) best = { id: heading.id, score };
	}
	if (!best) return null;
	if (best.score >= 2 || best.score === referenceTokens.length) return best.id;
	return null;
}

interface RootTarget {
	href: string;
	text: string;
	body: string | null;
}

/** Resolve a direct link target (URL, phase doc, or ticket). Null means bare. */
async function resolveRoot(target: string, fallbackSlug: string): Promise<RootTarget | null> {
	if (/^https?:\/\//i.test(target)) {
		return { href: target, text: target, body: null };
	}

	const phaseMatch = target.match(PROJECT_DOC_RE);
	if (phaseMatch) {
		const slug = phaseMatch[1]!;
		const phaseName = phaseMatch[2]!;
		const doc = await readPhaseDoc(slug, phaseName);
		return {
			href: `/p/${slug}/phase/${phaseName}`,
			text: getPhase(phaseName)?.title ?? phaseName,
			body: doc?.body ?? null,
		};
	}

	const ticketMatch = target.match(TICKET_DOC_RE);
	if (ticketMatch) {
		const file = ticketMatch[1]!;
		const ticket = await readTicketFile(file);
		const slug = ticket?.project || fallbackSlug;
		return {
			href: `/p/${slug}/ticket/${file}`,
			text: ticket?.title || file,
			body: ticket?.body ?? null,
		};
	}

	return null;
}

/**
 * Split raw links into doc-first groups. A doc or URL starts a group. Each bare
 * name after it becomes a nested heading link into that group's document.
 */
async function resolveLinks(rawLinks: string[], fallbackSlug: string): Promise<LinkRef[]> {
	const groups: LinkRef[] = [];
	let current: { link: LinkRef; headings: HeadingMatch[]; baseHref: string } | null = null;

	for (const raw of rawLinks) {
		const value = raw.trim();
		if (!value) continue;
		const hash = value.indexOf("#");
		const target = hash === -1 ? value : value.slice(0, hash).trim();
		const fragment = hash === -1 ? "" : value.slice(hash + 1).trim();

		const root = await resolveRoot(target, fallbackSlug);
		if (root) {
			const headings = root.body ? documentHeadings(root.body) : [];
			const link: LinkRef = { text: root.text, href: root.href, children: [] };
			if (fragment) {
				const id = matchHeading(headings, fragment);
				link.text = fragment;
				link.href = id ? `${root.href}#${id}` : root.href;
			}
			groups.push(link);
			current = { link, headings, baseHref: root.href };
			continue;
		}

		if (current) {
			const id = matchHeading(current.headings, value);
			current.link.children.push({
				text: value,
				href: id ? `${current.baseHref}#${id}` : null,
				children: [],
			});
		} else {
			groups.push({ text: value, href: null, children: [] });
		}
	}

	return groups;
}

export async function loadTicketPage(slug: string, filename: string): Promise<TicketPageView | null> {
	const project = await loadProjectOrNull(slug);
	if (!project) return null;

	const ticket = await readTicketFile(filename);
	if (!ticket) return null;
	if (ticket.project !== slug) return null;

	return { project: toSummary(project), ticket, links: await resolveLinks(ticket.links, slug) };
}
