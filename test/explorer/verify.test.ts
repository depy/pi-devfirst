/**
 * End-to-end proof of the six success criteria. Uses a temporary HOME and
 * compares artifact hashes before and after a full browse.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
	artifactsFingerprint,
	fetchText,
	makeProject,
	makeTicket,
	projectsDir,
	readTree,
	ticketsDir,
	writePhase,
	writeSnapshot,
} from "./helpers.ts";

const { startServer, stopServer } = await import("../../extensions/explorer/lib/server.ts");
const { loadProjectPage, loadPhasePage } = await import(
	"../../extensions/explorer/lib/read-model.ts"
);

test("browsing changes no artifact file (read-only invariant)", async () => {
	await makeProject("alpha", { title: "Alpha", phase: "problem-definition" });
	await writePhase("alpha", "problem-definition", 1, "# Problem\n\nBody");
	await writeSnapshot("alpha", "problem-definition", 1, "20260929-090000", "# Old");
	await makeTicket({
		filename: "alpha-core-one-todo-aaa.md",
		project: "alpha",
		title: "One",
		number: 1,
	});
	await makeTicket({
		filename: "beta-core-two-todo-bbb.md",
		project: "beta",
		title: "Two",
		number: 1,
	});

	const before = artifactsFingerprint([
		...(await readTree(projectsDir())),
		...(await readTree(ticketsDir())),
	]);

	const status = await startServer({ host: "127.0.0.1", port: 0 });
	const base = `http://127.0.0.1:${status.port}`;
	const routes = [
		"/",
		"/assets/style.css",
		"/p/alpha",
		"/p/alpha/tickets",
		"/p/alpha/phase/problem-definition",
		"/p/alpha/phase/problem-definition/v/20260929-090000",
		"/p/alpha/ticket/alpha-core-one-todo-aaa.md",
		"/p/alpha/ticket/beta-core-two-todo-bbb.md",
		"/p/Bad_Slug",
		"/nope",
	];
	for (const route of routes) {
		await fetchText(`${base}${route}`);
	}
	await stopServer();

	const after = artifactsFingerprint([
		...(await readTree(projectsDir())),
		...(await readTree(ticketsDir())),
	]);

	assert.equal(after, before);
});

test("every artifact is reachable by link in three clicks or fewer", async () => {
	const status = await startServer({ host: "127.0.0.1", port: 0 });
	const base = `http://127.0.0.1:${status.port}`;

	const homeLinks = extractLinks((await fetchText(`${base}/`)).text);
	assert.ok(homeLinks.includes("/p/alpha"), "project reachable from / (1 click)");

	const projectLinks = extractLinks((await fetchText(`${base}/p/alpha`)).text);
	assert.ok(projectLinks.includes("/p/alpha/tickets"), "tickets reachable in 2 clicks");
	assert.ok(
		projectLinks.includes("/p/alpha/phase/problem-definition"),
		"phase reachable in 2 clicks",
	);

	const ticketLinks = extractLinks((await fetchText(`${base}/p/alpha/tickets`)).text);
	assert.ok(
		ticketLinks.includes("/p/alpha/ticket/alpha-core-one-todo-aaa.md"),
		"ticket reachable in 3 clicks",
	);

	const phaseLinks = extractLinks(
		(await fetchText(`${base}/p/alpha/phase/problem-definition`)).text,
	);
	assert.ok(
		phaseLinks.includes("/p/alpha/phase/problem-definition/v/20260929-090000"),
		"history version reachable in 3 clicks",
	);

	await stopServer();
});

test("the join and the history list match the source directories", async () => {
	const view = await loadProjectPage("alpha");
	assert.ok(view);
	assert.deepEqual(
		view.tickets.map((ticket) => ticket.filename),
		["alpha-core-one-todo-aaa.md"],
	);

	const phaseView = await loadPhasePage("alpha", "problem-definition");
	assert.ok(phaseView);
	assert.deepEqual(
		phaseView.versions.filter((version) => !version.current).map((version) => version.timestamp),
		["20260929-090000"],
	);
});

function extractLinks(html: string): string[] {
	const links: string[] = [];
	const pattern = /href="([^"]+)"/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(html)) !== null) {
		links.push(match[1]!);
	}
	return links;
}
