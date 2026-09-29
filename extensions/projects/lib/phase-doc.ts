/** Phase documents and history snapshots. */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { phaseFileStem, requirePhase } from "./registry.ts";
import { parsePhaseDoc, serializePhaseDoc } from "./serialization.ts";
import { pathExists, projectDir } from "./store.ts";
import type { PhaseDoc } from "./types.ts";

/** `~/.projects/<slug>/<number>-<phase>.md` */
export function phaseDocPath(slug: string, phaseName: string): string {
	const phase = requirePhase(phaseName);
	return path.join(projectDir(slug), phase.file);
}

/** `~/.projects/<slug>/.history/<number>-<phase>/` */
export function historyDir(slug: string, phaseName: string): string {
	const phase = requirePhase(phaseName);
	return path.join(projectDir(slug), ".history", phaseFileStem(phase));
}

function timestamp(date = new Date()): string {
	const pad = (value: number): string => String(value).padStart(2, "0");
	return [
		`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
		`${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
	].join("-");
}

export async function readPhaseDoc(slug: string, phaseName: string): Promise<PhaseDoc | null> {
	const file = phaseDocPath(slug, phaseName);
	if (!(await pathExists(file))) return null;
	return parsePhaseDoc(await fs.readFile(file, "utf8"));
}

/**
 * Copy the current phase document into the history folder.
 * Return the snapshot path, or null when there is nothing to copy.
 */
export async function snapshotPhaseDoc(slug: string, phaseName: string): Promise<string | null> {
	const file = phaseDocPath(slug, phaseName);
	if (!(await pathExists(file))) return null;

	const raw = await fs.readFile(file, "utf8");
	if (!raw.trim()) return null;

	const dir = historyDir(slug, phaseName);
	await fs.mkdir(dir, { recursive: true });

	const stamp = timestamp();
	let target = path.join(dir, `${stamp}.md`);
	let suffix = 1;
	while (await pathExists(target)) {
		target = path.join(dir, `${stamp}-${suffix}.md`);
		suffix += 1;
	}

	await withFileMutationQueue(target, async () => {
		await fs.writeFile(target, raw, "utf8");
	});
	return target;
}

/**
 * Snapshot the old document, then write a new synthesized body.
 * `created` and `saves` come from the old document when it exists.
 */
export async function writePhaseDoc(slug: string, phaseName: string, body: string): Promise<PhaseDoc> {
	const file = phaseDocPath(slug, phaseName);
	await fs.mkdir(projectDir(slug), { recursive: true });

	return withFileMutationQueue(file, async () => {
		await snapshotPhaseDoc(slug, phaseName);

		const existing = await readPhaseDoc(slug, phaseName);
		const now = new Date().toISOString();
		const doc: PhaseDoc = {
			phase: requirePhase(phaseName).name,
			status: "saved",
			saves: (existing?.saves ?? 0) + 1,
			created: existing?.created || now,
			updated: now,
			body: body.trim(),
		};

		await fs.writeFile(file, serializePhaseDoc(doc), "utf8");
		return doc;
	});
}

export async function listSnapshots(slug: string, phaseName: string): Promise<string[]> {
	const dir = historyDir(slug, phaseName);
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => path.join(dir, entry.name))
			.sort();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
}

export async function latestSnapshot(slug: string, phaseName: string): Promise<string | null> {
	const snapshots = await listSnapshots(slug, phaseName);
	return snapshots.at(-1) ?? null;
}
