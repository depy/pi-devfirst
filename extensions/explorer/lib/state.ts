/**
 * Explorer runtime state. Pure in-memory, no file access.
 *
 * Holds the running flag, the chosen port, and the URL the user opens.
 */

import type { ExplorerStatus } from "./types.ts";

let status: ExplorerStatus = { running: false, url: null, port: null };

export function getStatus(): ExplorerStatus {
	return { ...status };
}

export function isRunning(): boolean {
	return status.running;
}

export function markRunning(port: number, host = "127.0.0.1"): void {
	status = { running: true, port, url: `http://${host}:${port}/` };
}

export function markStopped(): void {
	status = { running: false, url: null, port: null };
}
