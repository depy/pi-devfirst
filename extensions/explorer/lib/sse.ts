/**
 * Server-Sent Events client registry. One-way push to the browser.
 */

import type { ServerResponse } from "node:http";

const clients = new Set<ServerResponse>();

export function addClient(res: ServerResponse): void {
	res.writeHead(200, {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});
	res.write(": connected\n\n");
	clients.add(res);
	res.on("close", () => {
		clients.delete(res);
	});
}

export function removeClient(res: ServerResponse): void {
	clients.delete(res);
}

export function clientCount(): number {
	return clients.size;
}

export function broadcastReload(): void {
	for (const res of clients) {
		try {
			res.write("event: reload\ndata: {}\n\n");
		} catch {
			clients.delete(res);
		}
	}
}

export function closeAllClients(): void {
	for (const res of clients) {
		try {
			res.end();
		} catch {
			// Already gone.
		}
	}
	clients.clear();
}
