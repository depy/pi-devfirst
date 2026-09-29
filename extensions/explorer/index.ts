/**
 * Explorer Extension
 *
 * Read-only browser view of devfirst projects, phase documents, and tickets.
 *
 * User commands: /explorer start|stop|status|open
 *
 * The factory opens no socket. The server starts from the command and closes
 * from session_shutdown.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerCommands } from "./lib/commands.ts";
import { stopServer } from "./lib/server.ts";

export default function explorerExtension(pi: ExtensionAPI): void {
	registerCommands(pi);

	pi.on("session_shutdown", async () => {
		await stopServer();
	});
}
