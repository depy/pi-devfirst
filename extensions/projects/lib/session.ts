/**
 * Project mode is session state. It is not global, so two Pi sessions do not
 * collide. The dirty flag blocks a phase switch until the current phase is saved.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface ProjectModeState {
	activeSlug: string | null;
	activePhase: string | null;
	mode: "on" | "off";
	dirty: boolean;
}

export const PROJECT_MODE_ENTRY = "project-mode";

/** Stable footer status key. The footer sorts keys, so this entry stays first. */
export const STATUS_KEY = "project";

let state: ProjectModeState = { activeSlug: null, activePhase: null, mode: "off", dirty: false };
let currentTurnIndex = -1;
let lastSavedTurn = -1;
/** True while an agent run was started by a /project command, not by the user. */
let internalRun = false;

export function isOn(): boolean {
	return state.mode === "on" && state.activeSlug !== null;
}

export function getState(): Readonly<ProjectModeState> {
	return state;
}

export function getActiveSlug(): string | null {
	return state.activeSlug;
}

export function getActivePhase(): string | null {
	return isOn() ? state.activePhase : null;
}

export function requireActiveProject(): { slug: string; phase: string } {
	if (!isOn() || !state.activeSlug || !state.activePhase) {
		throw new Error("No active project. Run /project new <slug> or /project resume.");
	}
	return { slug: state.activeSlug, phase: state.activePhase };
}

export function activate(slug: string, phase: string): void {
	state = { activeSlug: slug, activePhase: phase, mode: "on", dirty: false };
	lastSavedTurn = currentTurnIndex;
}

/** Footer label for the active project: "<slug> (<phase>)". Undefined when off. */
export function formatStatusLabel(): string | undefined {
	if (!isOn()) return undefined;
	if (!state.activeSlug || !state.activePhase) return undefined;
	return `${state.activeSlug} (${state.activePhase})`;
}

/** Update the pi footer status line to match the current project state. */
export function syncStatus(ctx: ExtensionContext): void {
	ctx.ui.setStatus(STATUS_KEY, formatStatusLabel());
}

export function clearActive(): void {
	state = { activeSlug: null, activePhase: null, mode: "off", dirty: false };
}

export function pause(): void {
	state.mode = "off";
	state.dirty = false;
}

export function setDirty(value: boolean): void {
	state.dirty = value;
}

export function isDirty(): boolean {
	return state.dirty;
}

/** Called by project_save_phase. Suppress the dirty mark for the save turn. */
export function markSaved(): void {
	state.dirty = false;
	lastSavedTurn = currentTurnIndex;
}

export function beginTurn(turnIndex: number): void {
	currentTurnIndex = turnIndex;
}

/** Mark the next agent run as command-driven so its output does not set dirty. */
export function beginInternalRun(): void {
	internalRun = true;
}

export function endInternalRun(): void {
	internalRun = false;
}

/**
 * A turn with assistant text marks the phase dirty, unless that turn is the
 * turn that just saved. This keeps the "Saved." reply from re-dirtying.
 */
export function noteAssistantActivity(turnIndex: number): void {
	if (!isOn()) return;
	if (internalRun) return;
	if (turnIndex === lastSavedTurn) return;
	state.dirty = true;
}

export function persist(pi: ExtensionAPI): void {
	pi.appendEntry(PROJECT_MODE_ENTRY, { ...state });
}

export function restoreFrom(ctx: ExtensionContext): void {
	const entries = ctx.sessionManager.getBranch();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as { type?: string; customType?: string; data?: unknown };
		if (entry.type !== "custom" || entry.customType !== PROJECT_MODE_ENTRY) continue;
		const data = (entry.data ?? {}) as Partial<ProjectModeState>;
		state = {
			activeSlug: typeof data.activeSlug === "string" ? data.activeSlug : null,
			activePhase: typeof data.activePhase === "string" ? data.activePhase : null,
			mode: data.mode === "on" ? "on" : "off",
			dirty: false,
		};
		return;
	}
}
