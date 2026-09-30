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

test("ticket page resolves doc links and nests heading references", async () => {
	await writePhase(
		"alpha",
		"architecture-planning",
		3,
		"# Architecture Planning\n\n## Decisions\n\n### Decision 1: Device-tree node layout\n\n### Decision 2: Parent color value\n",
	);
	await makeTicket({
		filename: "alpha-core-links-todo-ccc.md",
		project: "alpha",
		title: "Links",
		number: 2,
		links: ["~/.projects/alpha/3-architecture-planning.md", "Decision 1 (direct layout)", "Decision 2"],
	});

	const view = await loadTicketPage("alpha", "alpha-core-links-todo-ccc.md");
	assert.ok(view);
	assert.equal(view.links.length, 1);
	const group = view.links[0]!;
	assert.equal(group.text, "Architecture Planning");
	assert.equal(group.href, "/p/alpha/phase/architecture-planning");
	assert.deepEqual(
		group.children.map((child) => child.href),
		[
			"/p/alpha/phase/architecture-planning#decision-1-device-tree-node-layout",
			"/p/alpha/phase/architecture-planning#decision-2-parent-color-value",
		],
	);
});

test("ticket link with a fragment uses the heading text", async () => {
	await makeTicket({
		filename: "alpha-core-frag-todo-ddd.md",
		project: "alpha",
		title: "Fragment",
		number: 3,
		links: ["~/.projects/alpha/3-architecture-planning.md#Decision 2", "not a heading"],
	});

	const view = await loadTicketPage("alpha", "alpha-core-frag-todo-ddd.md");
	assert.ok(view);
	assert.equal(view.links[0]!.text, "Decision 2");
	assert.equal(view.links[0]!.href, "/p/alpha/phase/architecture-planning#decision-2-parent-color-value");
	assert.deepEqual(
		view.links[0]!.children.map((child) => child.href),
		[null],
	);
});
