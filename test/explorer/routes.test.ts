import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchText, makeProject, makeTicket, writePhase, writeSnapshot } from "./helpers.ts";

const { startServer, stopServer } = await import("../../extensions/explorer/lib/server.ts");

async function withServer(run: (base: string) => Promise<void>): Promise<void> {
	await makeProject("alpha", { title: "Alpha", phase: "problem-definition" });
	await writePhase("alpha", "problem-definition", 1, "# Problem\n\nBody text");
	await writeSnapshot("alpha", "problem-definition", 1, "20260929-090000", "# Old\n\nOld body");
	await makeTicket({
		filename: "alpha-core-one-todo-aaa.md",
		project: "alpha",
		title: "One",
		number: 1,
	});

	const status = await startServer({ host: "127.0.0.1", port: 0 });
	try {
		await run(`http://127.0.0.1:${status.port}`);
	} finally {
		await stopServer();
	}
}

test("serves every page route with the expected status and content type", async () => {
	await withServer(async (base) => {
		const home = await fetchText(`${base}/`);
		assert.equal(home.status, 200);
		assert.match(home.contentType, /text\/html/);
		assert.match(home.text, /Alpha/);

		const project = await fetchText(`${base}/p/alpha`);
		assert.equal(project.status, 200);
		assert.match(project.text, /Tickets \(1\)/);

		const tickets = await fetchText(`${base}/p/alpha/tickets`);
		assert.equal(tickets.status, 200);
		assert.match(tickets.text, /One/);

		const phase = await fetchText(`${base}/p/alpha/phase/problem-definition`);
		assert.equal(phase.status, 200);
		assert.match(phase.text, /Body text/);

		const version = await fetchText(
			`${base}/p/alpha/phase/problem-definition/v/20260929-090000`,
		);
		assert.equal(version.status, 200);
		assert.match(version.text, /Old body/);

		const ticket = await fetchText(`${base}/p/alpha/ticket/alpha-core-one-todo-aaa.md`);
		assert.equal(ticket.status, 200);
		assert.match(ticket.text, /One/);

		const css = await fetchText(`${base}/assets/style.css`);
		assert.equal(css.status, 200);
		assert.match(css.contentType, /text\/css/);
	});
});

test("returns the correct error codes", async () => {
	await withServer(async (base) => {
		const missingProject = await fetchText(`${base}/p/nope`);
		assert.equal(missingProject.status, 404);

		const missingPhase = await fetchText(`${base}/p/alpha/phase/not-a-phase`);
		assert.equal(missingPhase.status, 404);

		const emptyPhase = await fetchText(`${base}/p/alpha/phase/releasing`);
		assert.equal(emptyPhase.status, 200);
		assert.match(emptyPhase.text, /no document yet/i);

		const missingTicket = await fetchText(`${base}/p/alpha/ticket/nope-core-x-todo-zzz.md`);
		assert.equal(missingTicket.status, 404);

		const malformed = await fetchText(`${base}/p/Bad_Slug`);
		assert.equal(malformed.status, 400);

		const unknown = await fetchText(`${base}/nope`);
		assert.equal(unknown.status, 404);
	});
});

test("the events endpoint uses text/event-stream", async () => {
	await withServer(async (base) => {
		const controller = new AbortController();
		const response = await fetch(`${base}/events`, { signal: controller.signal });
		assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
		controller.abort();
	});
});
