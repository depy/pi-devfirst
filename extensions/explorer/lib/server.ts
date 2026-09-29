/**
 * Loopback HTTP server for the explorer.
 *
 * Start and stop are idempotent. The server binds 127.0.0.1 only. A fixed
 * default port falls back to the next free port.
 */

import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import { handleRequest } from "./routes.ts";
import { broadcastReload, closeAllClients } from "./sse.ts";
import { getStatus, isRunning, markRunning, markStopped } from "./state.ts";
import type { ExplorerConfig, ExplorerStatus } from "./types.ts";
import { startWatching, stopWatching } from "./watcher.ts";

export const DEFAULT_PORT = 7391;
export const PORT_ATTEMPTS = 10;

let server: http.Server | null = null;

/** A browser-usable host. 0.0.0.0 or :: becomes the first external IPv4. */
export function publicHost(host: string): string {
	if (host !== "0.0.0.0" && host !== "::") return host;
	for (const infos of Object.values(os.networkInterfaces())) {
		for (const info of infos ?? []) {
			if (info.family === "IPv4" && !info.internal) return info.address;
		}
	}
	return "127.0.0.1";
}

function tryListen(host: string, port: number): Promise<http.Server | null> {
	return new Promise((resolve, reject) => {
		const candidate = http.createServer((req, res) => {
			void handleRequest(req, res);
		});
		candidate.once("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "EADDRINUSE" && port !== 0) {
				resolve(null);
				return;
			}
			reject(error);
		});
		candidate.listen({ host, port }, () => resolve(candidate));
	});
}

export async function startServer(
	config: ExplorerConfig = { host: "0.0.0.0", port: DEFAULT_PORT },
): Promise<ExplorerStatus> {
	if (isRunning() && server) return getStatus();

	const attempts = config.port === 0 ? 1 : PORT_ATTEMPTS;
	for (let offset = 0; offset < attempts; offset += 1) {
		const port = config.port === 0 ? 0 : config.port + offset;
		const candidate = await tryListen(config.host, port);
		if (!candidate) continue;

		server = candidate;
		const actual = (candidate.address() as AddressInfo).port;
		markRunning(actual, publicHost(config.host));
		startWatching(broadcastReload);
		return getStatus();
	}

	throw new Error(
		`Could not bind ${config.host} on ports ${config.port}..${config.port + attempts - 1}`,
	);
}

export async function stopServer(): Promise<void> {
	stopWatching();
	closeAllClients();

	const current = server;
	server = null;
	if (current) {
		await new Promise<void>((resolve) => {
			current.close(() => resolve());
		});
	}

	markStopped();
}
