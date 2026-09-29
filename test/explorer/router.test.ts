import assert from "node:assert/strict";
import { test } from "node:test";
import { matchRoute } from "../../extensions/explorer/lib/router.ts";

test("maps the top-level routes", () => {
	assert.equal(matchRoute("GET", "/").name, "projects");
	assert.equal(matchRoute("GET", "/events").name, "events");
	assert.deepEqual(matchRoute("GET", "/assets/style.css"), { name: "asset", file: "style.css" });
});

test("maps project routes", () => {
	assert.deepEqual(matchRoute("GET", "/p/alpha"), { name: "project", slug: "alpha" });
	assert.deepEqual(matchRoute("GET", "/p/alpha/tickets"), { name: "tickets", slug: "alpha" });
	assert.deepEqual(matchRoute("GET", "/p/alpha/phase/problem-definition"), {
		name: "phase",
		slug: "alpha",
		phase: "problem-definition",
	});
});

test("maps version routes", () => {
	assert.deepEqual(matchRoute("GET", "/p/alpha/phase/problem-definition/v/20260929-100000"), {
		name: "version",
		slug: "alpha",
		phase: "problem-definition",
		version: "20260929-100000",
	});
});

test("maps ticket routes", () => {
	assert.deepEqual(matchRoute("GET", "/p/alpha/ticket/alpha-core-do-thing-todo-abc.md"), {
		name: "ticket",
		slug: "alpha",
		file: "alpha-core-do-thing-todo-abc.md",
	});
});

test("rejects a malformed slug before any path join", () => {
	assert.equal(matchRoute("GET", "/p/Bad_Slug").name, "badRequest");
});

test("an unknown phase is not found, a malformed one is rejected", () => {
	assert.equal(matchRoute("GET", "/p/alpha/phase/not-a-phase").name, "notFound");
	assert.equal(matchRoute("GET", "/p/alpha/phase/Bad_Phase").name, "badRequest");
});

test("rejects a ticket file with traversal", () => {
	assert.equal(matchRoute("GET", "/p/alpha/ticket/..%2Fsecret.md").name, "badRequest");
});

test("rejects a non-GET method", () => {
	assert.equal(matchRoute("POST", "/").name, "badRequest");
});

test("returns notFound for unknown paths", () => {
	assert.equal(matchRoute("GET", "/nope").name, "notFound");
	assert.equal(matchRoute("GET", "/p/alpha/unknown").name, "notFound");
	assert.equal(matchRoute("GET", "/p/alpha/phase/problem-definition/v").name, "notFound");
});
