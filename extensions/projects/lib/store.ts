/** Project folders and metadata under ~/.projects. */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { PHASES, PROJECT_METADATA_FILE, requirePhase } from "./registry.ts";
import { parseProject, serializeProject } from "./serialization.ts";
import type { Project, ProjectSummary } from "./types.ts";

export const PROJECTS_DIR = path.join(os.homedir(), ".projects");

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Normalize a slug. Throw when it has no letters or digits. */
export function assertSlug(value: string): string {
	const slug = slugify(value);
	if (!slug) throw new Error(`Invalid project slug: "${value}"`);
	return slug;
}

export function projectDir(slug: string): string {
	return path.join(PROJECTS_DIR, slug);
}

export function projectPath(slug: string): string {
	return path.join(projectDir(slug), PROJECT_METADATA_FILE);
}

export async function pathExists(target: string): Promise<boolean> {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

export async function projectExists(slug: string): Promise<boolean> {
	return pathExists(projectPath(slug));
}

export async function readProject(slug: string): Promise<Project> {
	const file = projectPath(slug);
	if (!(await pathExists(file))) {
		throw new Error(`Project not found: ${slug}`);
	}
	return parseProject(await fs.readFile(file, "utf8"));
}

export async function writeProject(project: Project): Promise<void> {
	await fs.mkdir(projectDir(project.project), { recursive: true });
	const file = projectPath(project.project);
	await withFileMutationQueue(file, async () => {
		await fs.writeFile(file, serializeProject(project), "utf8");
	});
}

export async function listProjects(): Promise<ProjectSummary[]> {
	let entries;
	try {
		entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}

	const summaries: ProjectSummary[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		try {
			const project = await readProject(entry.name);
			summaries.push({
				project: project.project,
				title: project.title,
				status: project.status,
				phase: project.phase,
				updated: project.updated,
			});
		} catch {
			// Skip unreadable project folders.
		}
	}
	summaries.sort((a, b) => a.project.localeCompare(b.project));
	return summaries;
}

export async function createProject(input: string, title?: string): Promise<Project> {
	const slug = assertSlug(input);
	if (await projectExists(slug)) {
		throw new Error(`Project already exists: ${slug}`);
	}

	const now = new Date().toISOString();
	const project: Project = {
		project: slug,
		title: title?.trim() || slug,
		status: "active",
		phase: PHASES[0]?.name ?? "problem-definition",
		created: now,
		updated: now,
		finished: null,
		body: `# ${title?.trim() || slug}\n`,
	};
	await writeProject(project);
	return project;
}

export async function setProjectPhase(slug: string, phaseName: string): Promise<Project> {
	const phase = requirePhase(phaseName);
	const project = await readProject(slug);
	project.phase = phase.name;
	project.updated = new Date().toISOString();
	await writeProject(project);
	return project;
}

export async function finishProject(slug: string): Promise<Project> {
	const project = await readProject(slug);
	const now = new Date().toISOString();
	project.status = "finished";
	project.finished = now;
	project.updated = now;
	await writeProject(project);
	return project;
}

/** Resume of a finished project sets it back to active. */
export async function reopenProject(slug: string): Promise<Project> {
	const project = await readProject(slug);
	if (project.status !== "finished") return project;
	project.status = "active";
	project.finished = null;
	project.updated = new Date().toISOString();
	await writeProject(project);
	return project;
}
