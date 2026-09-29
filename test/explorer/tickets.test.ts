import assert from "node:assert/strict";
import { test } from "node:test";
import { makeTicket } from "./helpers.ts";

const { listTicketsForProject, readTicketFile, isTicketFilename } = await import(
	"../../extensions/explorer/lib/tickets.ts"
);

test("lists only tickets for the slug, ordered by number", async () => {
	await makeTicket({
		filename: "alpha-core-second-todo-bbb.md",
		project: "alpha",
		title: "Second",
		number: 2,
	});
	await makeTicket({
		filename: "alpha-core-first-todo-aaa.md",
		project: "alpha",
		title: "First",
		number: 1,
	});
	await makeTicket({
		filename: "beta-core-other-todo-ccc.md",
		project: "beta",
		title: "Other",
		number: 1,
	});

	const list = await listTicketsForProject("alpha");
	assert.deepEqual(
		list.map((ticket) => ticket.filename),
		["alpha-core-first-todo-aaa.md", "alpha-core-second-todo-bbb.md"],
	);
	assert.equal(list[0]!.number, 1);
	assert.equal(list[0]!.title, "First");
});

test("reads a full ticket with fields and body", async () => {
	const ticket = await readTicketFile("alpha-core-first-todo-aaa.md");
	assert.ok(ticket);
	assert.equal(ticket.project, "alpha");
	assert.equal(ticket.epic, "core");
	assert.equal(ticket.status, "todo");
	assert.equal(ticket.number, 1);
	assert.match(ticket.body, /First/);
});

test("missing or unsafe filenames return null", async () => {
	assert.equal(await readTicketFile("does-not-exist.md"), null);
	assert.equal(await readTicketFile("../secret.md"), null);
	assert.equal(await readTicketFile("nested/secret.md"), null);
	assert.equal(isTicketFilename("ok-core-task-todo-abc.md"), true);
	assert.equal(isTicketFilename("../escape.md"), false);
});

test("unnumbered tickets sort last", async () => {
	await makeTicket({
		filename: "alpha-core-none-todo-zzz.md",
		project: "alpha",
		title: "No number",
		number: null,
	});
	const list = await listTicketsForProject("alpha");
	assert.equal(list.at(-1)!.filename, "alpha-core-none-todo-zzz.md");
});
