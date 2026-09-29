import assert from "node:assert/strict";
import { test } from "node:test";
import "./helpers.ts";

const { handleExplorer } = await import("../../extensions/explorer/lib/commands.ts");
const { stopServer } = await import("../../extensions/explorer/lib/server.ts");
const { getStatus } = await import("../../extensions/explorer/lib/state.ts");

function collector() {
	const messages: string[] = [];
	return {
		messages,
		ctx: { ui: { notify: (message: string) => messages.push(message) } },
	};
}

test("start reports the URL and port", async () => {
	const { ctx, messages } = collector();
	await handleExplorer("start", ctx);
	assert.match(messages[0]!, /http:\/\/[^\s/]+:\d+\//);
	assert.equal(getStatus().running, true);
	await stopServer();
});

test("start accepts a host override", async () => {
	const { ctx, messages } = collector();
	await handleExplorer("start 127.0.0.1", ctx);
	assert.match(messages[0]!, /http:\/\/127\.0\.0\.1:\d+\//);
	await stopServer();
});

test("status reports stopped and then running", async () => {
	const stopped = collector();
	await handleExplorer("status", stopped.ctx);
	assert.match(stopped.messages[0]!, /stopped/i);

	const { ctx, messages } = collector();
	await handleExplorer("start", ctx);
	await handleExplorer("status", ctx);
	assert.match(messages.at(-1)!, /running at http:\/\/[^\s/]+:\d+/i);
	await stopServer();
});

test("open starts when stopped and shows the URL", async () => {
	const { ctx, messages } = collector();
	await handleExplorer("open", ctx);
	assert.equal(getStatus().running, true);
	assert.match(messages[0]!, /Open http:\/\/[^\s/]+:\d+\//);
	await stopServer();
});

test("stop closes the server", async () => {
	const { ctx, messages } = collector();
	await handleExplorer("start", ctx);
	await handleExplorer("stop", ctx);
	assert.match(messages.at(-1)!, /stopped/i);
	assert.equal(getStatus().running, false);
});

test("unknown subcommand reports an error without a crash", async () => {
	const { ctx, messages } = collector();
	await handleExplorer("frobnicate", ctx);
	assert.match(messages[0]!, /Unknown \/explorer subcommand/);
	assert.equal(getStatus().running, false);
});
