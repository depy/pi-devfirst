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

/** Map a known status to a badge modifier. Unknown statuses stay neutral. */
function statusClass(status: string): string {
	switch (status.toLowerCase()) {
		case "done":
		case "finished":
			return " done";
		case "doing":
			return " doing";
		case "blocked":
			return " blocked";
		case "todo":
			return " todo";
		default:
			return "";
	}
}

export const STYLE_CSS = `
/* Jamstack-inspired palette: blue text, pink accent, soft surfaces. */
:root {
  color-scheme: light dark;
  --bg: #f7fafc;
  --surface: #ffffff;
  --text: #2a4365;
  --heading: #1a365d;
  --muted: #5a7391;
  --border: #e2e8f0;
  --accent: #f0047f;
  --code-bg: #edf2f7;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #04040e;
    --surface: #0e1328;
    --text: #c9dcf2;
    --heading: #ffffff;
    --muted: #8ba7c7;
    --border: #1b3a5c;
    --accent: #f472b6;
    --code-bg: #0a1a2e;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font: 16px/1.7 system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--heading);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
  text-underline-offset: 2px;
}

a:hover { color: var(--accent); text-decoration-color: currentColor; }

h1, h2, h3 { color: var(--heading); line-height: 1.25; }
h1 { margin: 0 0 1rem; font-size: 1.9rem; letter-spacing: -0.01em; }
h2 { margin: 2rem 0 0.75rem; font-size: 1.3rem; }
h3 { margin: 0 0 0.4rem; font-size: 1rem; }

header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px);
}

header .brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  text-decoration: none;
}

header .brand::before {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--accent);
}

main { max-width: 60rem; margin: 0 auto; padding: 28px 20px 64px; }

.meta { color: var(--muted); font-size: 13px; }

/* Project cards */
.cards {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.card {
  display: block;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: inherit;
  text-decoration: none;
  transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px #1a365d1a;
}

.card-slug {
  margin: 0 0 10px;
  color: var(--muted);
  font-family: ui-monospace, monospace;
  font-size: 13px;
}

.card-meta { margin: 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Badges use currentColor so one rule works in both themes. */
.badge {
  display: inline-block;
  padding: 1px 9px;
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.badge.done { color: #38a169; }
.badge.doing { color: var(--accent); }
.badge.blocked { color: #e53e3e; }
.badge.todo { color: #718096; }

/* Nav lists get the pink gem marker from jamstack.org. */
nav ul { list-style: none; margin: 0; padding-left: 0; }
nav li { position: relative; padding: 3px 0 3px 18px; }
nav li::before {
  content: "\\25C6";
  position: absolute;
  left: 0;
  top: 6px;
  color: var(--accent);
  font-size: 10px;
}
nav .current { font-weight: 700; }

table { border-collapse: collapse; width: 100%; }
th {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
tbody tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }

pre {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code-bg);
  overflow-x: auto;
}
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
:not(pre) > code { padding: 1px 5px; border-radius: 4px; background: var(--code-bg); }

article h2 { padding-bottom: 6px; border-bottom: 1px solid var(--border); }
article blockquote {
  margin: 1rem 0;
  padding: 2px 16px;
  border-left: 3px solid var(--accent);
  color: var(--muted);
}
article img { max-width: 100%; border-radius: 8px; }
article hr { border: 0; border-top: 1px solid var(--border); }
`;

function layout(title: string, body: string): string {
	// Load the vendored mermaid bundle only when the page has a diagram.
	// The script draws the diagrams and puts a visible message on failure.
	const diagram = body.includes('class="mermaid"')
		? `<script src="/assets/mermaid.min.js"></script>
<script>
(function () {
  var theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
  mermaid.initialize({ startOnLoad: false, theme: theme });
  mermaid.run({ querySelector: ".mermaid" }).catch(function (error) {
    console.error(error);
    document.querySelectorAll(".mermaid").forEach(function (node) {
      node.textContent = "Diagram failed to render: " + (error && error.message ? error.message : error);
    });
  });
})();
</script>
`
		: "";

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
<a class="brand" href="/">Explorer</a>
<span class="meta">read-only</span>
<a href="" class="meta">reload</a>
</header>
<main>
${body}
</main>
${diagram}<script>
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
	const cards = view.projects
		.map(
			(project) =>
				`<a class="card" href="/p/${escapeHtml(project.project)}">\n` +
				`<h3>${escapeHtml(project.title)}</h3>\n` +
				`<p class="card-slug">${escapeHtml(project.project)}</p>\n` +
				`<p class="card-meta"><span class="badge${statusClass(project.status)}">${escapeHtml(project.status)}</span>` +
				`<span class="meta">${escapeHtml(project.phase)} &middot; ${escapeHtml(project.updated)}</span></p>\n` +
				`</a>`,
		)
		.join("\n");

	const body =
		`<h1>Projects</h1>\n` +
		`<p class="meta">${view.projects.length} project${view.projects.length === 1 ? "" : "s"}</p>\n` +
		(view.projects.length === 0
			? `<p class="meta">No projects yet.</p>`
			: `<div class="cards">${cards}</div>`);

	return layout("Projects", body);
}

export function projectPage(view: ProjectPageView): string {
	const slug = escapeHtml(view.project.project);

	const tickets = `<li><a href="/p/${slug}/tickets">Tickets (${view.tickets.length})</a></li>`;

	const phases = view.phases
		.map((phase) => {
			const label = `${phase.number}. ${phase.title}`;
			const current = phase.isCurrent ? ` <span class="badge doing">current</span>` : "";
			if (!phase.exists) {
				return `<li class="meta">${escapeHtml(label)} (empty)${current}</li>`;
			}
			return `<li><a href="/p/${slug}/phase/${escapeHtml(phase.name)}">${escapeHtml(label)}</a>${current}</li>`;
		})
		.join("\n");

	const body =
		`<h1>${escapeHtml(view.project.title)}</h1>\n` +
		`<p class="meta">${slug} &middot; phase ${escapeHtml(view.project.phase)} &middot; ` +
		`<span class="badge${statusClass(view.project.status)}">${escapeHtml(view.project.status)}</span> &middot; ` +
		`updated ${escapeHtml(view.project.updated)}</p>\n` +
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
				`${version.current ? ` <span class="badge doing">current</span>` : ""}</li>`,
		)
		.join("\n");

	const doc = view.doc ? renderMarkdown(view.doc.body) : "";
	const docBlock = view.doc
		? doc || `<p class="meta">This phase document is empty.</p>`
		: `<p class="meta">This phase has no document yet.</p>`;

	const meta = view.doc
		? `<p class="meta"><span class="badge">status ${escapeHtml(view.doc.status)}</span> ` +
			`&middot; saves ${escapeHtml(String(view.doc.saves))} &middot; updated ${escapeHtml(view.doc.updated)}</p>`
		: "";

	const body =
		`<h1>${escapeHtml(view.phase.title)}</h1>\n` +
		`<p class="meta"><a href="/p/${slug}">&larr; ${escapeHtml(view.project.title)}</a></p>\n` +
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
		`<p class="meta"><a href="/p/${slug}/tickets">&larr; Tickets</a></p>\n` +
		`<p class="card-meta"><span class="badge">#${escapeHtml(ticket.number === null ? "-" : String(ticket.number))}</span>` +
		`<span class="badge${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>` +
		`<span class="badge">epic ${escapeHtml(ticket.epic)}</span>` +
		`<span class="badge">task ${escapeHtml(ticket.task)}</span></p>\n` +
		`<p class="meta">file ${escapeHtml(ticket.filename)} &middot; updated ${escapeHtml(ticket.updated)}</p>\n` +
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
				`<td><span class="badge${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td></tr>`
			);
		})
		.join("\n");

	const body =
		`<h1>Tickets</h1>\n` +
		`<p class="meta"><a href="/p/${escapeHtml(slug)}">&larr; Project</a></p>\n` +
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
