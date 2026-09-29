import assert from "node:assert/strict";
import { test } from "node:test";
import { makeProject, makeTicket, writePhase, writeSnapshot } from "./helpers.ts";

const { loadProjectList, loadProjectPage, loadPhasePage, loadTicketPage } = await import(
	"../../extensions/explorer/lib/read-model.ts"
);

test("loads the project list", async () => {
	await makeProject("alpha", { title: "Alpha", phase: "problem-definition" });
	const view = await loadProjectList();
	const alpha = view.projects.find((project) => project.project === "alpha");
	assert.ok(alpha);
	assert.equal(alpha.title, "Alpha");
});

test("loads a project page with phases in order and the correct ticket join", async () => {
	await makeProject("alpha", { title: "Alpha", phase: "research-and-discovery" });
	await writePhase("alpha", "problem-definition", 1, "# Problem");
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

	const view = await loadProjectPage("alpha");
	assert.ok(view);
	assert.deepEqual(
		view.phases.map((phase) => phase.number),
		[1, 2, 3, 4, 5, 6, 7],
	);
	assert.equal(view.phases[0]!.isCurrent, false);
	assert.equal(view.phases[1]!.isCurrent, true);
	assert.equal(view.phases[0]!.exists, true);
	assert.equal(view.phases[1]!.exists, false);
	assert.deepEqual(
		view.tickets.map((ticket) => ticket.filename),
		["alpha-core-one-todo-aaa.md"],
	);
});

test("phase page lists current plus snapshots, newest first", async () => {
	await writePhase("alpha", "problem-definition", 1, "# Current\n\nCurrent body", { saves: 3 });
	await writeSnapshot("alpha", "problem-definition", 1, "20260928-080000", "# Old\n\nOld body");
	await writeSnapshot("alpha", "problem-definition", 1, "20260929-090000", "# Newer\n\nNewer body");

	const view = await loadPhasePage("alpha", "problem-definition");
	assert.ok(view);
	assert.equal(view.versions.length, 3);
	assert.equal(view.versions[0]!.current, true);
	assert.equal(view.versions[1]!.timestamp, "20260929-090000");
	assert.equal(view.versions[2]!.timestamp, "20260928-080000");
});

test("phase page can read a specific snapshot", async () => {
	const view = await loadPhasePage("alpha", "problem-definition", "20260928-080000");
	assert.ok(view);
	assert.match(view.doc!.body, /Old body/);
});

test("unknown slug, phase, or version returns null", async () => {
	assert.equal(await loadProjectPage("nope"), null);
	assert.equal(await loadPhasePage("alpha", "not-a-phase"), null);
	assert.equal(await loadPhasePage("alpha", "problem-definition", "nope"), null);
});

test("ticket page enforces the project join", async () => {
	const ok = await loadTicketPage("alpha", "alpha-core-one-todo-aaa.md");
	assert.ok(ok);
	assert.equal(ok.ticket.project, "alpha");

	const wrongProject = await loadTicketPage("alpha", "beta-core-two-todo-bbb.md");
	assert.equal(wrongProject, null);

	const missing = await loadTicketPage("alpha", "does-not-exist.md");
	assert.equal(missing, null);
});
