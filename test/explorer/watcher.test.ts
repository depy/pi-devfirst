import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { test } from "node:test";
import { makeProject, projectsDir } from "./helpers.ts";

const { startWatching, stopWatching, watchingCount } = await import(
	"../../extensions/explorer/lib/watcher.ts"
);

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
	return Promise.race([
		promise,
		new Promise<void>((_, reject) => setTimeout(() => reject(new Error("watcher timeout")), ms)),
	]);
}

test("a file change reports a debounced event", async () => {
	await makeProject("alpha");

	let calls = 0;
	let resolveHit: (() => void) | null = null;
	const hit = new Promise<void>((resolve) => {
		resolveHit = resolve;
	});

	startWatching(() => {
		calls += 1;
		resolveHit?.();
	});

	await fs.writeFile(path.join(projectsDir(), "alpha", "0-project.md"), "changed", "utf8");
	await withTimeout(hit, 4000);

	assert.ok(calls >= 1);
	stopWatching();
	assert.equal(watchingCount(), 0);
});

test("a missing root does not throw", () => {
	stopWatching();
	startWatching(() => {});
	stopWatching();
	assert.equal(watchingCount(), 0);
});

test("stopWatching cancels a pending event", async () => {
	await makeProject("beta");
	let calls = 0;
	startWatching(() => {
		calls += 1;
	});
	await fs.writeFile(path.join(projectsDir(), "beta", "0-project.md"), "x", "utf8");
	stopWatching();
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.equal(calls, 0);
});
