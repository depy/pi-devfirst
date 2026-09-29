/**
 * Request handling. Loads a view model, renders a page, sets status and type.
 *
 * Read-only. The only side effect is registering an SSE client.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { loadPhasePage, loadProjectList, loadProjectPage, loadTicketPage } from "./read-model.ts";
import { matchRoute } from "./router.ts";
import { addClient } from "./sse.ts";
import {
	STYLE_CSS,
	errorPage,
	phasePage,
	projectsPage,
	projectPage,
	ticketPage,
	ticketsPage,
} from "./views.ts";

function sendHtml(res: ServerResponse, status: number, html: string): void {
	res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
	res.end(html);
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
	try {
		const match = matchRoute(req.method ?? "GET", req.url ?? "/");

		switch (match.name) {
			case "projects": {
				sendHtml(res, 200, projectsPage(await loadProjectList()));
				return;
			}
			case "asset": {
				if (match.file === "style.css") {
					res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
					res.end(STYLE_CSS);
					return;
				}
				sendHtml(res, 404, errorPage(404, "Asset not found."));
				return;
			}
			case "events": {
				addClient(res);
				return;
			}
			case "project": {
				const view = await loadProjectPage(match.slug!);
				if (!view) {
					sendHtml(res, 404, errorPage(404, `Project not found: ${match.slug}`));
					return;
				}
				sendHtml(res, 200, projectPage(view));
				return;
			}
			case "tickets": {
				const view = await loadProjectPage(match.slug!);
				if (!view) {
					sendHtml(res, 404, errorPage(404, `Project not found: ${match.slug}`));
					return;
				}
				sendHtml(res, 200, ticketsPage(match.slug!, view.tickets));
				return;
			}
			case "phase":
			case "version": {
				const view = await loadPhasePage(match.slug!, match.phase!, match.version);
				if (!view) {
					sendHtml(res, 404, errorPage(404, "Phase or version not found."));
					return;
				}
				sendHtml(res, 200, phasePage(view));
				return;
			}
			case "ticket": {
				const view = await loadTicketPage(match.slug!, match.file!);
				if (!view) {
					sendHtml(res, 404, errorPage(404, "Ticket not found."));
					return;
				}
				sendHtml(res, 200, ticketPage(view));
				return;
			}
			case "badRequest": {
				sendHtml(res, 400, errorPage(400, "Bad request."));
				return;
			}
			default: {
				sendHtml(res, 404, errorPage(404, "Not found."));
				return;
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal error.";
		sendHtml(res, 500, errorPage(500, message));
	}
}
