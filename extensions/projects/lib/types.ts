/** Shared types for the projects extension. */

export type ProjectStatus = "active" | "finished";
export type PhaseDocStatus = "draft" | "saved";

export interface Project {
	/** Slug. Also the folder name under ~/.projects. */
	project: string;
	title: string;
	status: ProjectStatus;
	/** Last active phase name. */
	phase: string;
	created: string;
	updated: string;
	finished: string | null;
	/** Free-form Markdown body of 0-project.md. */
	body: string;
}

export interface PhaseDoc {
	phase: string;
	status: PhaseDocStatus;
	saves: number;
	created: string;
	updated: string;
	/** Synthesized Markdown body, without frontmatter. */
	body: string;
}

export interface ProjectSummary {
	project: string;
	title: string;
	status: ProjectStatus;
	phase: string;
	updated: string;
}
