/**
 * Watch the artifact roots and report a debounced change.
 *
 * A watcher error degrades to the manual reload link. Nothing here writes.
 */

import * as fs from "node:fs";
import { PROJECTS_DIR } from "../../projects/lib/store.ts";
import { ticketsDir } from "./tickets.ts";

const DEBOUNCE_MS = 150;

let watchers: fs.FSWatcher[] = [];
let timer: NodeJS.Timeout | null = null;

function schedule(onChange: () => void): void {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		onChange();
	}, DEBOUNCE_MS);
}

function watchRoot(root: string, onChange: () => void): void {
	try {
		const watcher = fs.watch(root, { recursive: true }, () => schedule(onChange));
		watcher.on("error", () => {
			// Keep serving. The page keeps its manual reload link.
		});
		watchers.push(watcher);
	} catch {
		// The root may not exist yet. Serving continues.
	}
}

export function startWatching(onChange: () => void): void {
	stopWatching();
	watchRoot(PROJECTS_DIR, onChange);
	watchRoot(ticketsDir(), onChange);
}

export function stopWatching(): void {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	for (const watcher of watchers) {
		try {
			watcher.close();
		} catch {
			// Already closed.
		}
	}
	watchers = [];
}

export function watchingCount(): number {
	return watchers.length;
}
