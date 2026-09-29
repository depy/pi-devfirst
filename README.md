# pi-devfirst

A Pi package with two extensions and a set of skills:

- **tickets** — file-backed ticket management in `~/.tickets`.
- **projects** — global, phase-based project workflow in `~/.projects`.

## Install

Load the package during development:

```bash
pi -e /home/matjaz/dev/pi-devfirst
```

Install it for all sessions:

```bash
pi install /home/matjaz/dev/pi-devfirst
```

## Layout

```text
extensions/
├── tickets/index.ts
└── projects/
    ├── index.ts
    └── lib/
skills/
├── problem-definition/SKILL.md
├── research-and-discovery/SKILL.md
├── architecture-planning/SKILL.md
├── tickets-planning/SKILL.md
├── implementation-and-testing/SKILL.md
├── review-and-validation/SKILL.md
└── releasing/SKILL.md
```

## Projects

Projects live in `~/.projects/<slug>/`. A project has one metadata file and one
document per phase:

```text
~/.projects/my-project/
├── 0-project.md
├── 1-problem-definition.md
├── 2-research-and-discovery.md
├── 3-architecture-planning.md
├── 4-tickets-planning.md
├── 5-implementation-and-testing.md
├── 6-review-and-validation.md
├── 7-releasing.md
└── .history/
```

Phase documents are numbered so the folder listing matches the phase order.

### Commands

| Command | Purpose |
|---|---|
| `/project new <slug> [title]` | Create a project and enter project mode. |
| `/project phase <name>` | Save the current phase, then switch. |
| `/project save` | Synthesize the current phase into its document. |
| `/project off` | Save, then pause project mode. |
| `/project resume [slug]` | Resume a project at its saved phase. |
| `/project finish` | Save, mark the project finished, turn mode off. |
| `/project delete <slug> [tickets\|keep]` | Delete the project folder. Asks whether to delete its tickets too. |
| `/project list` | List projects. |
| `/project show [slug]` | Show `0-project.md`. |
| `/project status` | Show the active project and phase. |

### Phases

Fixed, in order:

1. `problem-definition`
2. `research-and-discovery`
3. `architecture-planning`
4. `tickets-planning`
5. `implementation-and-testing`
6. `review-and-validation`
7. `releasing`

Skipping and going back are allowed. Each phase has a matching skill with the
playbook. All seven playbooks are written.

Switching to `tickets-planning` starts an agent turn. The agent proposes a
ticket set and waits for your confirmation. It creates nothing until you agree.

### Saving

Save is synthesis. The agent reads the old document and the conversation, then
writes one clean Markdown body. Before each write, the extension copies the old
document to `.history/<number>-<phase>/<timestamp>.md`.

A phase switch is blocked while the current phase has unsaved work. The agent
must call `project_save_phase` first. This makes auto-save safe.

### Agent tools

| Tool | Purpose |
|---|---|
| `project_save_phase` | Write the current phase document, with a snapshot. |
| `project_read_doc` | Read one phase document. |
| `project_set_phase` | Switch phase. Refuses while dirty. |
| `project_pause` | Turn project mode off. Refuses while dirty. |
| `project_finish` | Finish the project. Refuses while dirty. |

## Tickets

Tickets live in `~/.tickets`. See `extensions/tickets/README.md` for the full
ticket reference. Tickets do not need a project. When the project exists, the
agent passes `project: <slug>` to `ticket_add`, and that slug is the link.

## Design

See `docs/projects-design.md` for decisions, contracts, and tests.
