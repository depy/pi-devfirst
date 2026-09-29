# projects — design note

Status: draft. No implementation yet.

## 1. Goal

Add a global, phase-based project workflow to Pi. A project holds phase
documents. Tickets stay separate. The agent can turn any project document into
implementation tickets.

## 2. Decisions (locked)

- Build a new `projects` extension. Do not extend `tickets`.
- Projects live under `~/.projects/<slug>/`. Slugs are globally unique.
- Tickets stay in `~/.tickets`. A ticket can exist without a project.
- Link: `ticket.project === project slug`.
- No blocking. Ticket creation never requires a project.
- Extension = mechanism. Skills = content.
- Phases are fixed. See section 5.
- Save = agent synthesis. Clean rewrite plus history snapshots.
- Ship as one Pi package.

## 3. Repository layout (target)

```text
pi-devfirst/
├── package.json                      # keywords: ["pi-package"]
├── extensions/
│   ├── tickets/index.ts              # existing extension
│   └── projects/
│       ├── index.ts                  # registration only
│       └── lib/
│           ├── registry.ts           # phase list and order
│           ├── store.ts              # project folders and metadata
│           ├── phase-doc.ts          # phase docs and snapshots
│           ├── ticket-link.ts        # read and delete project tickets
│           ├── session.ts            # project mode, active project, dirty flag
│           ├── serialization.ts      # frontmatter parse and serialize
│           ├── tools.ts              # agent tools
│           └── commands.ts           # /project commands
├── skills/
│   ├── problem-definition/SKILL.md
│   ├── research-and-discovery/SKILL.md
│   ├── architecture-planning/SKILL.md
│   ├── tickets-planning/SKILL.md
│   ├── implementation-and-testing/SKILL.md
│   ├── review-and-validation/SKILL.md
│   └── releasing/SKILL.md
└── docs/
    └── projects-design.md
```

An explicit `pi` manifest in `package.json` can keep `tickets/` at the repo
root. Moving it to `extensions/` is the conventional form.

## 4. On-disk layout

```text
~/.projects/
└── <slug>/
    ├── 0-project.md                          # metadata
    ├── 1-problem-definition.md
    ├── 2-research-and-discovery.md
    ├── 3-architecture-planning.md
    ├── 4-tickets-planning.md
    ├── 5-implementation-and-testing.md
    ├── 6-review-and-validation.md
    ├── 7-releasing.md
    └── .history/
        └── <phase-file>/
            └── <YYYYMMDD-HHMMSS>.md          # snapshot before each rewrite
```

Rules:

- One folder per slug.
- Every file starts with the phase number, so the directory listing shows the
  phase order. Metadata is `0-project.md`. Phases are `1` to `7`.
- The extension creates a phase document on first save. It does not create all
  seven files at `new`.
- Snapshot folder names use the phase file stem, for example
  `2-research-and-discovery`.
- Snapshot file names avoid `:` because Windows forbids it in file names.

## 5. Phase registry

Fixed, in code, in order:

| # | Phase | File | Purpose (content defined later) |
|---|---|---|---|
| 1 | `problem-definition` | `1-problem-definition.md` | Define the problem |
| 2 | `research-and-discovery` | `2-research-and-discovery.md` | Explore the problem |
| 3 | `architecture-planning` | `3-architecture-planning.md` | Plan the structure |
| 4 | `tickets-planning` | `4-tickets-planning.md` | Turn documents into tickets |
| 5 | `implementation-and-testing` | `5-implementation-and-testing.md` | Build and test |
| 6 | `review-and-validation` | `6-review-and-validation.md` | Review the result |
| 7 | `releasing` | `7-releasing.md` | Release |

Rules:

- `/project phase` accepts any registered name. Skipping is allowed.
- Going back to an earlier phase is allowed. The agent amends that document.
- The order only defines `next` and `previous` helpers.

## 6. Metadata

### 0-project.md

```markdown
---
project: "<slug>"
title: "<title>"
status: "active"            # active | finished
phase: "<phase>"            # last active phase
created: "<ISO-8601>"
updated: "<ISO-8601>"
finished: null              # ISO-8601 when finished
---

# <title>

Free-form notes. Optional.
```

### phase document frontmatter

```markdown
---
phase: "<phase>"
status: "draft"             # draft | saved
saves: 0
created: "<ISO-8601>"
updated: "<ISO-8601>"
---

# <Phase title>

(synthesized content)
```

Meaning of phase `status`: `draft` until the first synthesis save, then `saved`.
The per-turn "is the current work saved" signal is the session dirty flag, not
this field.

## 7. Save model

Save is synthesis. The agent reads the existing document and the conversation,
then writes one clean `<phase>.md`.

Procedure (`savePhase`):

1. If the phase document exists, copy it to
   `.history/<phase-file>/<timestamp>.md`.
2. Write the new body and frontmatter. Increment `saves`. Set `updated`.
3. Set phase `status` to `saved`.
4. The agent may append one dated section for a quick manual capture. The next
   save merges those sections into the normal headings.

Do not use "Appendix A/B" sections in the main document.

## 8. Commands

| Command | Contract |
|---|---|
| `/project new <slug> [title]` | Create `~/.projects/<slug>/0-project.md`. Set phase to `problem-definition`. Enter project mode. Error if the slug exists or is invalid. No agent turn. |
| `/project phase <name>` | Start an agent turn to save the current phase, then switch. See section 10. Switching to `tickets-planning` also starts a ticket-proposal turn (see section 16). |
| `/project save` | Start an agent turn to synthesize the current phase document. |
| `/project off` | Save the current phase (agent turn), then leave project mode. Keep the persisted phase. |
| `/project resume [slug]` | Enter project mode. Use the given slug or the last slug in this session. Set the phase from `0-project.md`. No agent turn. |
| `/project finish` | Save the current phase, set project `status` to `finished` and the `finished` timestamp, then turn project mode off. |
| `/project delete <slug> [tickets\|keep]` | Delete `~/.projects/<slug>` and its history. In TUI mode, ask twice: once for the project, once for its tickets. Without UI, the second word `tickets` or `keep` is required. A deleted active project clears project mode. |
| `/project list` | List projects: slug, title, phase, status, updated. |
| `/project show [slug]` | Show `0-project.md` for the slug or the active project. |
| `/project status` | Show the active project and phase, or "no active project". |

A finished project can always be resumed. Resuming it sets `status` back to
`active`.

## 9. Agent tools

| Tool | Params | Contract |
|---|---|---|
| `project_save_phase` | `body: string` | Write the active project's current phase document with snapshot. Clear the dirty flag. Error when no active project. |
| `project_set_phase` | `phase: string` | Set the current phase and update `project.md`. Error when the dirty flag is set. |
| `project_finish` | none | Set the project finished and turn project mode off. Error when the dirty flag is set. |
| `project_pause` | none | Turn project mode off but keep the project and phase. Error when the dirty flag is set. |
| `project_read_doc` | `phase?: string` | Return one phase document body. Default: current phase. |

`project_set_phase`, `project_finish`, and `project_pause` refuse while dirty. The
refusal text tells the agent to call `project_save_phase` first. This enforces
auto-save without making a command handler wait. All five tools use
`executionMode: "sequential"` because they share session state and files.

## 10. Project mode and skill injection

- Project mode is session state, not global. Two Pi sessions do not collide.
- State: `{ activeSlug, mode: "on" | "off" }`.
- Persist with `pi.appendEntry()`. Rebuild from `ctx.sessionManager.getBranch()`
  on `session_start`.
- The dirty flag is session state. The extension sets it when the agent emits
  assistant text while a project phase is active. `project_save_phase` clears it.
- A command-driven agent run sets an internal-run flag. Assistant text in that
  run does not set the dirty flag. This stops the closing summary of a save or
  switch turn from re-dirtying the phase.
- In `before_agent_start`, when mode is `on`, add context: active slug, current
  phase, phase document path, and "use the `<phase>` skill".
- `/project phase`, `/project save`, `/project off`, and `/project finish` call
  `pi.sendUserMessage()` with a short instruction. The agent then calls the
  matching tool. The command does not wait for the turn.

## 11. Tickets link

The `projects` extension does not import the `tickets` extension.

- The `tickets-planning` skill reads every `~/.projects/<slug>/*.md` file.
- The skill reads existing tickets with `ticket_list` and `ticket_show`.
- The agent calls `ticket_add` with `project: <slug>` for missing work only.
- For "recent changes only", the agent compares the current document with the
  latest `.history/<phase-file>/` snapshot. This is a fallback. The session
  context is the primary source.
- `/project delete` reads the ticket frontmatter and matches `project` exactly.
  It deletes matches only when the user confirms or passes `tickets`.

## 12. Shared code

`slugify`, frontmatter parse, and frontmatter serialize are used by both
extensions. Put them in a shared module inside the package, for example
`extensions/shared/`.

Refactoring the existing `tickets` extension to use the shared module is a
separate, optional ticket. It risks the current ticket format. Do it only after
the `projects` extension works.

## 13. Implementation status and evidence

Implemented in `extensions/projects/`. Package layout: `extensions/tickets/`,
`extensions/projects/`, `skills/`, and `package.json` with the `pi-package`
keyword.

Evidence so far:

- Both extensions load through jiti with the Pi alias map.
- A temporary `registerFlag` appeared in `pi -e <pkg> --help`, so Pi discovers
the package `extensions/` folder.
- All 7 skills appear in `systemPromptOptions.skills`, so Pi discovers the
package `skills/` folder.
- All 7 skill playbooks are written. Their frontmatter is valid: the name
matches the directory, and each description is present and under 1024
characters.
- 19 file-logic checks pass against a temporary `$HOME`: slug rules, first
phase, `0-project.md`, duplicate and invalid slug rejection, save counts,
numbered phase file, first-save snapshot rule, snapshot content and name,
numbered history folder, phase move, unknown phase rejection, go-back, finish,
reopen, and project listing.
- 24 registration and behaviour checks pass: 5 tools, the `project` command,
events, the dirty guard, and the context filter.
- Live smoke test: `/project new smoke-test`, one agent turn, then
`/project save`. The agent read the empty document, synthesized a body, and
called `project_save_phase`. The file
`~/.projects/smoke-test/1-problem-definition.md` was written with `saves: 1`.
- Live dirty-path test: one agent turn, then `/project phase
architecture-planning`. The agent read the document, called
`project_save_phase` (`saves: 2`), then called `project_set_phase`. The phase
moved to `architecture-planning` (2/7). The second save also created the first
history snapshot.
- Live pause test: `/project off` saved the current phase, then called
`project_pause`. `/project resume` returned to project mode at phase
`architecture-planning`.
- Fix after the live tests: the closing summary of a command-driven run set the
new phase dirty. The internal-run flag now prevents that. A focused check
passes: a command run does not set dirty, a real run does, and a save turn does
not re-dirty.
- 14 `/project delete` checks pass: non-interactive `keep` and `tickets`,
slug normalization, ticket matching by exact `project` field, other tickets
survive, missing choice refused, interactive confirm and decline, cancel keeps
the project, busy refuses, missing slug warns, and active project cleared.
- 4 tickets-planning entry checks pass: the command switch sends the proposal,
the phase is set, a switch to another phase sends nothing, and the tool switch
sends the proposal as a follow-up.

Still to verify with a real model session:

- The `context` filter removes stale project context after `/project off`.

## 14. Verification checks

These are implementation checks, not design questions. You do not need to
answer them. The implementer runs each check. Each check becomes a small
verification ticket.

1. Confirm `pi.sendUserMessage()` from a command handler starts an agent turn,
   and that the agent can call a tool in that turn. Verify with a small test.
2. Confirm `before_agent_start` can add phase context without replacing the
   system prompt.
3. Confirm the dirty flag is rebuilt correctly on `session_start` and after
   compaction.
4. Confirm snapshot writes use `withFileMutationQueue()`.

## 15. Implementation tickets

Ticket P-1, P-2, and P-3 are broken to function level. Later tickets stay
coarse until the earlier ones land.

### P-1 — package scaffold, registry, store

Files: `package.json`, `extensions/projects/index.ts`, `lib/registry.ts`,
`lib/store.ts`, `lib/serialization.ts`.

Functions:

- `listPhases(): readonly Phase[]`
- `isPhase(name: string): boolean`
- `nextPhase(name: string): Phase | null`
- `previousPhase(name: string): Phase | null`
- `assertSlug(value: string): string`
- `projectDir(slug: string): string`
- `projectPath(slug: string): string`
- `projectExists(slug: string): Promise<boolean>`
- `listProjects(): Promise<ProjectSummary[]>`
- `createProject(slug: string, title?: string): Promise<Project>`
- `readProject(slug: string): Promise<Project>`
- `writeProject(project: Project): Promise<void>`
- `setProjectPhase(slug: string, phase: string): Promise<Project>`
- `finishProject(slug: string): Promise<Project>`

### P-2 — phase documents and snapshots

File: `lib/phase-doc.ts`.

Functions:

- `phaseDocPath(slug: string, phase: string): string`
- `readPhaseDoc(slug: string, phase: string): Promise<PhaseDoc | null>`
- `writePhaseDoc(slug: string, phase: string, body: string): Promise<PhaseDoc>`
- `snapshotPhaseDoc(slug: string, phase: string): Promise<string | null>`
- `listSnapshots(slug: string, phase: string): Promise<string[]>`
- `latestSnapshot(slug: string, phase: string): Promise<string | null>`

All paths include the phase number, for example `4-tickets-planning.md`.

### P-3 — read-only commands

File: `lib/commands.ts`.

Functions:

- `handleNew(args, ctx)`
- `handleList(args, ctx)`
- `handleShow(args, ctx)`
- `handleStatus(args, ctx)`

### P-4 — project mode and skill injection

Session state, dirty flag, `before_agent_start`, `session_start` rebuild.

### P-5 — save tools and dirty guard

`project_save_phase`, `project_read_doc`, plus the dirty enforcement in
`project_set_phase`.

### P-6 — phase switch, off, resume, finish

Command-to-turn wiring and the `project_set_phase` / `project_finish` tools.

### P-7 — phase skills

Seven `SKILL.md` files. Content defined per phase.

### P-8 — tickets-planning integration

Skill behavior for reading project documents and creating tickets.

## 16. Tickets-planning entry

When a project enters `tickets-planning`, the extension starts an agent turn.
The agent reads the project documents, lists existing tickets, and proposes a
ticket set. It creates nothing until the user confirms. A shared helper in
`lib/phase-entry.ts` builds the instruction.

Two paths trigger it:

- `/project phase tickets-planning` with no unsaved work switches directly, then
  sends the proposal.
- The `project_set_phase` tool queues the proposal as a follow-up after it
  switches.

`/project resume` does not trigger a proposal. Resume is for continuing work, not
for re-planning.

## 17. Test cases

Store and registry:

1. `new my-project` creates the folder and `0-project.md`; phase is
   `problem-definition`.
2. `new` with an existing slug returns an error.
3. `new` with an invalid slug returns an error.
4. `listProjects` returns slug, title, phase, status, updated.
5. `setProjectPhase` rejects an unknown phase.
6. `setProjectPhase` accepts a previous phase.

Phase documents:

7. First save creates `<number>-<phase>.md`, sets `saves` to 1, makes no
   snapshot.
8. Second save creates one snapshot and sets `saves` to 2.
9. Snapshot content equals the document before the rewrite.
10. Snapshot file names contain no `:`.
10a. Phase documents and `0-project.md` start with the phase number.

Session and mode:

11. Dirty flag is set after agent text, and cleared by `project_save_phase`.
12. `project_set_phase` refuses while dirty and names the fix.
13. `/project off` saves, then clears mode.
14. `/project resume` restores the persisted phase.
15. `/project finish` sets `status` to `finished` and turns project mode off.
16. Resume of a finished project sets `status` back to `active`.
17. Session state rebuilds from the branch on `session_start`.

Tickets link:

18. `ticket_add` works with no project.
19. `ticket_add` accepts a `project` slug that matches a project folder.
20. `tickets-planning` creates no duplicate for an existing ticket.
