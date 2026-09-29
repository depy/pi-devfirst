/** Fixed phase registry. The order defines `next` and `previous`. */

export interface Phase {
	/** 1-based position. 0 is reserved for project metadata. */
	number: number;
	/** Slug used by commands and frontmatter, e.g. "research-and-discovery". */
	name: string;
	/** Human-readable title. */
	title: string;
	/** File name inside a project folder, e.g. "2-research-and-discovery.md". */
	file: string;
}

export const PROJECT_METADATA_FILE = "0-project.md";

const RAW: ReadonlyArray<{ name: string; title: string }> = [
	{ name: "problem-definition", title: "Problem Definition" },
	{ name: "research-and-discovery", title: "Research and Discovery" },
	{ name: "architecture-planning", title: "Architecture Planning" },
	{ name: "tickets-planning", title: "Tickets Planning" },
	{ name: "implementation-and-testing", title: "Implementation and Testing" },
	{ name: "review-and-validation", title: "Review and Validation" },
	{ name: "releasing", title: "Releasing" },
];

export const PHASES: readonly Phase[] = RAW.map((phase, index) => ({
	number: index + 1,
	name: phase.name,
	title: phase.title,
	file: `${index + 1}-${phase.name}.md`,
}));

export function listPhases(): readonly Phase[] {
	return PHASES;
}

export function getPhase(name: string): Phase | undefined {
	return PHASES.find((phase) => phase.name === name);
}

export function isPhase(name: string): boolean {
	return getPhase(name) !== undefined;
}

export function requirePhase(name: string): Phase {
	const phase = getPhase(name);
	if (!phase) {
		throw new Error(`Unknown phase "${name}". Known phases: ${PHASES.map((p) => p.name).join(", ")}`);
	}
	return phase;
}

/** Directory name for snapshots, e.g. "2-research-and-discovery". */
export function phaseFileStem(phase: Phase): string {
	return phase.file.replace(/\.md$/, "");
}

export function nextPhase(name: string): Phase | null {
	const index = PHASES.findIndex((phase) => phase.name === name);
	if (index < 0 || index >= PHASES.length - 1) return null;
	return PHASES[index + 1] ?? null;
}

export function previousPhase(name: string): Phase | null {
	const index = PHASES.findIndex((phase) => phase.name === name);
	if (index <= 0) return null;
	return PHASES[index - 1] ?? null;
}
