/**
 * HTML templates for the explorer. Server-rendered, minimal JavaScript.
 *
 * Every value that comes from a file is escaped. The only script is the SSE
 * reload listener. A manual reload link is always present as a fallback.
 */

import { renderMarkdown } from "./render.ts";
import type {
	ProjectListView,
	ProjectPageView,
	PhasePageView,
	TicketPageView,
	TicketSummary,
} from "./types.ts";

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export const STYLE_CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.6 system-ui, sans-serif; }
header { padding: 10px 16px; border-bottom: 1px solid #8884; display: flex; gap: 12px; align-items: center; }
header a { text-decoration: none; }
main { padding: 16px; max-width: 60rem; }
nav ul { list-style: none; padding-left: 0; }
nav li { padding: 4px 0; }
nav .current { font-weight: 700; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #8884; }
pre { overflow-x: auto; padding: 8px; background: #8881; }
code { font-family: ui-monospace, monospace; }
.meta { color: #888; font-size: 13px; }
.badge { font-size: 12px; border: 1px solid #8886; border-radius: 4px; padding: 0 6px; }
`;

function layout(title: string, body: string): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header>
<a href="/">Explorer</a>
<span class="meta">read-only</span>
<a href="" class="meta">reload</a>
</header>
<main>
${body}
</main>
<script>
try {
  const source = new EventSource("/events");
  source.addEventListener("reload", () => location.reload());
} catch (error) {
  // The manual reload link still works.
}
</script>
</body>
</html>
`;
}

export function projectsPage(view: ProjectListView): string {
	const rows = view.projects
		.map(
			(project) =>
				`<tr><td><a href="/p/${escapeHtml(project.project)}">${escapeHtml(project.title)}</a></td>` +
				`<td>${escapeHtml(project.project)}</td>` +
				`<td>${escapeHtml(project.phase)}</td>` +
				`<td><span class="badge">${escapeHtml(project.status)}</span></td>` +
				`<td class="meta">${escapeHtml(project.updated)}</td></tr>`,
		)
		.join("\n");

	const body =
		`<h1>Projects</h1>\n` +
		(view.projects.length === 0
			? `<p class="meta">No projects yet.</p>`
			: `<table><thead><tr><th>Title</th><th>Slug</th><th>Phase</th><th>Status</th><th>Updated</th></tr></thead><tbody>${rows}</tbody></table>`);

	return layout("Projects", body);
}

export function projectPage(view: ProjectPageView): string {
	const slug = escapeHtml(view.project.project);

	const tickets = `<li><a href="/p/${slug}/tickets">Tickets (${view.tickets.length})</a></li>`;

	const phases = view.phases
		.map((phase) => {
			const label = `${phase.number}. ${phase.title}`;
			const current = phase.isCurrent ? ` <span class="badge">current</span>` : "";
			if (!phase.exists) {
				return `<li class="meta">${escapeHtml(label)} (empty)${current}</li>`;
			}
			return `<li><a href="/p/${slug}/phase/${escapeHtml(phase.name)}">${escapeHtml(label)}</a>${current}</li>`;
		})
		.join("\n");

	const body =
		`<h1>${escapeHtml(view.project.title)}</h1>\n` +
		`<p class="meta">${slug} &middot; phase ${escapeHtml(view.project.phase)} &middot; ${escapeHtml(view.project.status)} &middot; updated ${escapeHtml(view.project.updated)}</p>\n` +
		`<nav><ul>${tickets}\n${phases}</ul></nav>`;

	return layout(view.project.title, body);
}

export function phasePage(view: PhasePageView): string {
	const slug = escapeHtml(view.project.project);
	const phase = escapeHtml(view.phase.name);

	const versions = view.versions
		.map(
			(version) =>
				`<li><a href="${escapeHtml(version.href)}">${escapeHtml(version.label)}</a>` +
				`${version.current ? ` <span class="badge">current</span>` : ""}</li>`,
		)
		.join("\n");

	const doc = view.doc ? renderMarkdown(view.doc.body) : "";
	const docBlock = view.doc
		? doc || `<p class="meta">This phase document is empty.</p>`
		: `<p class="meta">This phase has no document yet.</p>`;

	const meta = view.doc
		? `<p class="meta">status ${escapeHtml(view.doc.status)} &middot; saves ${escapeHtml(String(view.doc.saves))} &middot; updated ${escapeHtml(view.doc.updated)}</p>`
		: "";

	const body =
		`<h1>${escapeHtml(view.phase.title)}</h1>\n` +
		`<p><a href="/p/${slug}">&larr; ${escapeHtml(view.project.title)}</a></p>\n` +
		`${meta}\n` +
		`<h2>Versions</h2>\n<nav><ul>${versions}</ul></nav>\n` +
		`<article>${docBlock}</article>`;

	return layout(`${view.project.title} / ${view.phase.title}`, body);
}

export function ticketPage(view: TicketPageView): string {
	const slug = escapeHtml(view.project.project);
	const ticket = view.ticket;

	const links = ticket.links.length
		? `<ul>${ticket.links.map((link) => `<li><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></li>`).join("")}</ul>`
		: `<span class="meta">none</span>`;

	const body =
		`<h1>${escapeHtml(ticket.title || ticket.filename)}</h1>\n` +
		`<p><a href="/p/${slug}/tickets">&larr; Tickets</a></p>\n` +
		`<p class="meta">#${escapeHtml(ticket.number === null ? "-" : String(ticket.number))} &middot; ${escapeHtml(ticket.status)} &middot; epic ${escapeHtml(ticket.epic)} &middot; task ${escapeHtml(ticket.task)}</p>\n` +
		`<p class="meta">file ${escapeHtml(ticket.filename)}</p>\n` +
		`<p class="meta">updated ${escapeHtml(ticket.updated)}</p>\n` +
		`<h2>Links</h2>${links}\n` +
		`<article>${renderMarkdown(ticket.body)}</article>`;

	return layout(ticket.title || "Ticket", body);
}

export function ticketsPage(slug: string, tickets: TicketSummary[]): string {
	const rows = tickets
		.map((ticket) => {
			return (
				`<tr><td>${escapeHtml(ticket.number === null ? "-" : String(ticket.number))}</td>` +
				`<td><a href="/p/${escapeHtml(slug)}/ticket/${escapeHtml(ticket.filename)}">${escapeHtml(ticket.title || ticket.filename)}</a></td>` +
				`<td>${escapeHtml(ticket.epic)}</td>` +
				`<td><span class="badge">${escapeHtml(ticket.status)}</span></td></tr>`
			);
		})
		.join("\n");

	const body =
		`<h1>Tickets</h1>\n` +
		`<p><a href="/p/${escapeHtml(slug)}">&larr; Project</a></p>\n` +
		(tickets.length === 0
			? `<p class="meta">No tickets for this project.</p>`
			: `<table><thead><tr><th>#</th><th>Title</th><th>Epic</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);

	return layout(`Tickets / ${slug}`, body);
}

export function errorPage(status: number, message: string): string {
	return layout(
		`Error ${status}`,
		`<h1>Error ${status}</h1>\n<p>${escapeHtml(message)}</p>\n<p><a href="/">Back to projects</a></p>`,
	);
}
