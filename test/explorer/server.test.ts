import assert from "node:assert/strict";
import * as net from "node:net";
import { test } from "node:test";
import { makeProject } from "./helpers.ts";

const { startServer, stopServer } = await import("../../extensions/explorer/lib/server.ts");
const { getStatus } = await import("../../extensions/explorer/lib/state.ts");

test("starts on port 0 and serves the index", async () => {
	await makeProject("alpha");
	const status = await startServer({ host: "127.0.0.1", port: 0 });
	assert.equal(status.running, true);
	assert.ok(status.port && status.port > 0);
	assert.equal(status.url, `http://127.0.0.1:${status.port}/`);

	const response = await fetch(status.url!);
	assert.equal(response.status, 200);
	await stopServer();
});

test("double start is idempotent", async () => {
	const first = await startServer({ host: "127.0.0.1", port: 0 });
	const second = await startServer({ host: "127.0.0.1", port: 0 });
	assert.equal(first.port, second.port);
	await stopServer();
});

test("falls back to the next port when the requested port is taken", async () => {
	const blocker = net.createServer();
	await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", () => resolve()));
	const blockedPort = (blocker.address() as net.AddressInfo).port;

	const status = await startServer({ host: "127.0.0.1", port: blockedPort });
	assert.equal(status.running, true);
	assert.notEqual(status.port, blockedPort);

	await stopServer();
	await new Promise<void>((resolve) => blocker.close(() => resolve()));
});

test("binds 127.0.0.1 only", async () => {
	const status = await startServer({ host: "127.0.0.1", port: 0 });
	await assert.rejects(fetch(`http://127.0.0.2:${status.port}/`));
	await stopServer();
});

test("can bind all interfaces and reports a usable URL", async () => {
	const status = await startServer({ host: "0.0.0.0", port: 0 });
	assert.equal(status.running, true);
	assert.ok(status.url && !status.url.includes("0.0.0.0"));
	const response = await fetch(`http://127.0.0.1:${status.port}/`);
	assert.equal(response.status, 200);
	await stopServer();
});

test("stop is idempotent and clears the status", async () => {
	await startServer({ host: "127.0.0.1", port: 0 });
	await stopServer();
	await stopServer();
	assert.deepEqual(getStatus(), { running: false, url: null, port: null });
});
