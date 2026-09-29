/**
 * Pure request routing. No data access, no HTML.
 *
 * URL scheme:
 *   /                                -> projects
 *   /events                          -> events (SSE)
 *   /assets/<file>                   -> asset
 *   /p/<slug>                        -> project
 *   /p/<slug>/tickets                -> tickets
 *   /p/<slug>/phase/<name>           -> phase
 *   /p/<slug>/phase/<name>/v/<stamp> -> version
 *   /p/<slug>/ticket/<file>          -> ticket
 */

import { isPhase } from "../../projects/lib/registry.ts";
import type { RouteMatch } from "./types.ts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TICKET_FILE_RE = /^[A-Za-z0-9._-]+\.md$/;
const ASSET_FILE_RE = /^[A-Za-z0-9._-]+$/;

export function matchRoute(method: string, url: string): RouteMatch {
	if (method !== "GET" && method !== "HEAD") return { name: "badRequest" };

	let pathname: string;
	try {
		pathname = new URL(url, "http://127.0.0.1").pathname;
	} catch {
		return { name: "badRequest" };
	}

	if (pathname === "/") return { name: "projects" };
	if (pathname === "/events") return { name: "events" };

	const parts = pathname.split("/").filter((part) => part !== "");
	if (parts.length === 0) return { name: "projects" };

	if (parts[0] === "assets") {
		if (parts.length !== 2 || !ASSET_FILE_RE.test(parts[1]!)) return { name: "notFound" };
		return { name: "asset", file: parts[1] };
	}

	if (parts[0] !== "p" || parts.length < 2) return { name: "notFound" };
	const slug = parts[1]!;
	if (!SLUG_RE.test(slug)) return { name: "badRequest" };

	if (parts.length === 2) return { name: "project", slug };

	if (parts.length === 3 && parts[2] === "tickets") return { name: "tickets", slug };

	if (parts.length >= 4 && parts[2] === "phase") {
		const phase = parts[3]!;
		if (!SLUG_RE.test(phase)) return { name: "badRequest" };
		if (!isPhase(phase)) return { name: "notFound" };
		if (parts.length === 4) return { name: "phase", slug, phase };
		if (parts.length === 6 && parts[4] === "v") {
			const version = parts[5]!;
			if (!/^[A-Za-z0-9._-]+$/.test(version)) return { name: "badRequest" };
			return { name: "version", slug, phase, version };
		}
		return { name: "notFound" };
	}

	if (parts.length === 4 && parts[2] === "ticket") {
		const file = parts[3]!;
		if (!TICKET_FILE_RE.test(file) || file.includes("..")) return { name: "badRequest" };
		return { name: "ticket", slug, file };
	}

	return { name: "notFound" };
}
