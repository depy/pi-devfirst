import assert from "node:assert/strict";
import { test } from "node:test";
import {
	getStatus,
	isRunning,
	markRunning,
	markStopped,
} from "../../extensions/explorer/lib/state.ts";

test("initial status is stopped", () => {
	markStopped();
	const status = getStatus();
	assert.equal(status.running, false);
	assert.equal(status.url, null);
	assert.equal(status.port, null);
	assert.equal(isRunning(), false);
});

test("markRunning sets the loopback URL", () => {
	markRunning(7391);
	assert.equal(isRunning(), true);
	assert.deepEqual(getStatus(), {
		running: true,
		url: "http://127.0.0.1:7391/",
		port: 7391,
	});
});

test("markStopped resets the status", () => {
	markRunning(7391);
	markStopped();
	assert.deepEqual(getStatus(), { running: false, url: null, port: null });
});

test("getStatus returns a copy, not the internal object", () => {
	markRunning(7391);
	const status = getStatus();
	status.running = false;
	assert.equal(getStatus().running, true);
});
