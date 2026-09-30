import assert from "node:assert/strict";
import { test } from "node:test";
import { renderMarkdown, safeHref } from "../../extensions/explorer/lib/render.ts";

test("renders headings, lists, tables, and code", () => {
	const html = renderMarkdown(
		"# Title\n\n- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```\ncode\n```\n",
	);
	assert.match(html, /<h1[^>]*>Title<\/h1>/);
	assert.match(html, /<ul>/);
	assert.match(html, /<table>/);
	assert.match(html, /<code>/);
});

test("headings get stable slug ids for anchors", () => {
	const html = renderMarkdown("# Architecture Planning\n\n## Success Criteria\n\n### Decision 1: Device-tree node layout\n");
	assert.match(html, /<h2 id="success-criteria">/);
	assert.match(html, /<h3 id="decision-1-device-tree-node-layout">/);
});

test("escapes a raw script tag so it cannot execute", () => {
	const html = renderMarkdown('Before\n\n<script>alert("x")</script>\n\nAfter');
	assert.doesNotMatch(html, /<script>/);
	assert.match(html, /&lt;script&gt;/);
});

test("drops a javascript: link but keeps its label", () => {
	const html = renderMarkdown("[click](javascript:alert(1))");
	assert.doesNotMatch(html, /javascript:/i);
	assert.match(html, /click/);
});

test("keeps http and relative links", () => {
	const html = renderMarkdown("[a](https://example.com) [b](/p/alpha)");
	assert.match(html, /href="https:\/\/example\.com"/);
	assert.match(html, /href="\/p\/alpha"/);
});

test("empty input returns empty output", () => {
	assert.equal(renderMarkdown(""), "");
	assert.equal(renderMarkdown("   \n  "), "");
});

test("safeHref rejects executable schemes", () => {
	assert.equal(safeHref("javascript:alert(1)"), null);
	assert.equal(safeHref("data:text/html,x"), null);
	assert.equal(safeHref("https://example.com"), "https://example.com");
});
