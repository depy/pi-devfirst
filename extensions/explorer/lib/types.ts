/**
 * Shared types for the explorer extension.
 *
 * The explorer is read-only. These types describe runtime state and the
 * view models assembled from the devfirst artifacts.
 */

import type { Phase } from "../../projects/lib/registry.ts";
import type { PhaseDoc, ProjectSummary } from "../../projects/lib/types.ts";

export interface ExplorerConfig {
	host: string;
	port: number;
}

export interface ExplorerStatus {
	running: boolean;
	url: string | null;
	port: number | null;
}

export interface TicketSummary {
	filename: string;
	number: number | null;
	title: string;
	status: string;
	epic: string;
	task: string;
}

export interface Ticket extends TicketSummary {
	project: string;
	created: string;
	updated: string;
	links: string[];
	body: string;
}

export interface PhaseLink {
	number: number;
	name: string;
	title: string;
	exists: boolean;
	isCurrent: boolean;
}

export interface VersionRef {
	/** Raw timestamp from the snapshot name, or the current updated value. */
	timestamp: string;
	/** Display label. */
	label: string;
	/** URL path for this version. */
	href: string;
	/** True for the live phase document. */
	current: boolean;
}

export interface ProjectListView {
	projects: ProjectSummary[];
}

export interface ProjectPageView {
	project: ProjectSummary;
	tickets: TicketSummary[];
	phases: PhaseLink[];
}

export interface PhasePageView {
	project: ProjectSummary;
	phase: Phase;
	doc: PhaseDoc | null;
	versions: VersionRef[];
}

/** One entry in the ticket Links list. `href` null means plain text. */
export interface LinkRef {
	text: string;
	href: string | null;
	children: LinkRef[];
}

export interface TicketPageView {
	project: ProjectSummary;
	ticket: Ticket;
	links: LinkRef[];
}

export type RouteName =
	| "projects"
	| "project"
	| "tickets"
	| "phase"
	| "version"
	| "ticket"
	| "asset"
	| "events"
	| "badRequest"
	| "notFound";

export interface RouteMatch {
	name: RouteName;
	slug?: string;
	phase?: string;
	version?: string;
	file?: string;
}
