/**
 * /explorer commands. Start, stop, status, and open.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_PORT, startServer, stopServer } from "./server.ts";
import { getStatus, isRunning } from "./state.ts";

interface NotifyUi {
	notify(message: string, level?: string): void;
}

export interface CommandContext {
	ui: NotifyUi;
}

const CONFIG = { host: "0.0.0.0", port: DEFAULT_PORT };

export async function handleExplorer(args: string, ctx: CommandContext): Promise<void> {
	const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
	const sub = parts[0] ?? "";
	const hostArg = parts[1];
	const host = hostArg && /^[A-Za-z0-9.:_-]+$/.test(hostArg) ? hostArg : CONFIG.host;
	const config = { host, port: CONFIG.port };

	switch (sub) {
		case "":
		case "status": {
			const status = getStatus();
			ctx.ui.notify(
				status.running
					? `Explorer running at ${status.url} (port ${status.port}).`
					: "Explorer is stopped. Use /explorer start.",
				"info",
			);
			return;
		}
		case "start": {
			const status = await startServer(config);
			ctx.ui.notify(`Explorer running at ${status.url}`, "info");
			return;
		}
		case "open": {
			if (!isRunning()) await startServer(config);
			ctx.ui.notify(`Open ${getStatus().url}`, "info");
			return;
		}
		case "stop": {
			await stopServer();
			ctx.ui.notify("Explorer stopped.", "info");
			return;
		}
		default: {
			ctx.ui.notify(
				`Unknown /explorer subcommand "${sub}". Use start [host], stop, status, or open.`,
				"error",
			);
		}
	}
}

export function registerCommands(pi: ExtensionAPI): void {
	pi.registerCommand("explorer", {
		description: "Start, stop, or open the project and ticket explorer",
		handler: async (args, ctx) => {
			await handleExplorer(args, ctx as unknown as CommandContext);
		},
	});
}
