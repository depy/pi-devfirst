import assert from "node:assert/strict";
import { test } from "node:test";
import {
	escapeHtml,
	errorPage,
	phasePage,
	projectPage,
	projectsPage,
	ticketPage,
	ticketsPage,
} from "../../extensions/explorer/lib/views.ts";
import type { Phase } from "../../extensions/projects/lib/registry.ts";

const project = {
	project: "alpha",
	title: "Alpha",
	status: "active" as const,
	phase: "problem-definition",
	updated: "2026-09-29T10:00:00.000Z",
};

const phase: Phase = {
	number: 1,
	name: "problem-definition",
	title: "Problem Definition",
	file: "1-problem-definition.md",
};

test("projectsPage links every project", () => {
	const html = projectsPage({ projects: [project] });
	assert.match(html, /href="\/p\/alpha"/);
	assert.match(html, /Alpha/);
});

test("projectsPage handles an empty list", () => {
	const html = projectsPage({ projects: [] });
	assert.match(html, /No projects yet/);
});

test("projectPage lists Tickets first, then phases in order", () => {
	const html = projectPage({
		project,
		tickets: [],
		phases: [
			{ number: 1, name: "problem-definition", title: "Problem Definition", exists: true, isCurrent: true },
			{ number: 2, name: "research-and-discovery", title: "Research and Discovery", exists: true, isCurrent: false },
		],
	});
	const ticketsIndex = html.indexOf("/p/alpha/tickets");
	const firstPhase = html.indexOf("/p/alpha/phase/problem-definition");
	const secondPhase = html.indexOf("/p/alpha/phase/research-and-discovery");
	assert.ok(ticketsIndex > -1 && firstPhase > ticketsIndex);
	assert.ok(secondPhase > firstPhase);
	assert.match(html, /current/);
});

test("phasePage lists versions and renders the document", () => {
	const html = phasePage({
		project,
		phase,
		doc: {
			phase: "problem-definition",
			status: "saved",
			saves: 2,
			created: project.updated,
			updated: project.updated,
			body: "# Problem\n\nThe body.",
		},
		versions: [
			{ timestamp: project.updated, label: "Current", href: "/p/alpha/phase/problem-definition", current: true },
			{ timestamp: "20260929-090000", label: "2026-09-29 09:00:00", href: "/p/alpha/phase/problem-definition/v/20260929-090000", current: false },
		],
	});
	assert.match(html, /2026-09-29 09:00:00/);
	assert.match(html, /The body\./);
	assert.match(html, /Current/);
});

test("ticketPage shows fields and the rendered body", () => {
	const html = ticketPage({
		project,
		ticket: {
			filename: "alpha-core-one-todo-aaa.md",
			number: 1,
			title: "One",
			status: "todo",
			epic: "core",
			task: "do-thing",
			project: "alpha",
			created: project.updated,
			updated: project.updated,
			links: ["https://example.com"],
			body: "## Acceptance\n\n- [ ] done",
		},
	});
	assert.match(html, /One/);
	assert.match(html, /core/);
	assert.match(html, /https:\/\/example\.com/);
	assert.match(html, /Acceptance/);
});

test("ticketsPage links each ticket", () => {
	const html = ticketsPage("alpha", [
		{ filename: "alpha-core-one-todo-aaa.md", number: 1, title: "One", status: "todo", epic: "core", task: "do-thing" },
	]);
	assert.match(html, /href="\/p\/alpha\/ticket\/alpha-core-one-todo-aaa\.md"/);
});

test("errorPage shows the status", () => {
	const html = errorPage(404, "Not found.");
	assert.match(html, /Error 404/);
	assert.match(html, /Not found\./);
});

test("escaping neutralizes angle brackets and quotes", () => {
	const escaped = escapeHtml('<img src=x onerror="alert(1)">');
	assert.doesNotMatch(escaped, /<img/);
	assert.match(escaped, /&lt;img/);
	assert.match(escaped, /&quot;/);
});

test("ticket titles from files are escaped in the page", () => {
	const html = ticketPage({
		project,
		ticket: {
			filename: "alpha-core-one-todo-aaa.md",
			number: 1,
			title: "<script>alert(1)</script>",
			status: "todo",
			epic: "core",
			task: "do-thing",
			project: "alpha",
			created: project.updated,
			updated: project.updated,
			links: [],
			body: "",
		},
	});
	assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});
