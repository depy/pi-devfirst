# tickets — pi extension

File-backed ticket management for pi. Tickets are Markdown files in `~/.tickets`.

## Install

Load the whole package while developing:

```bash
pi -e /home/matjaz/dev/pi-devfirst
```

This loads both extensions and all skills. To load only this extension:

```bash
pi --extension /home/matjaz/dev/pi-devfirst/extensions/tickets/index.ts
```

## Naming

```
${project}-${epic}-${task}-${status}-${random-3-chars}.md
```

Example: `healthd-led-policy-grade-sensor-todo-4f2.md`

`project`, `epic`, `task`, and `status` are lowercased and slugified (spaces
become `-`). `task` must be 3–5 words. The 3-char code stays last; `status` is
right before it.

## Order

Every ticket has a `number` that sets the order of work. `ticket_add` accepts
`number`; when you omit it, the extension assigns the highest existing number + 1.
`ticket_modify` accepts `number` to reorder. Lists are sorted by number, and
unnumbered tickets sort last.

## Status

Every ticket has a `status` that also appears in the filename. Allowed values:
`todo`, `doing`, `blocked`, `done`. `ticket_add` accepts `status` (default
`todo`). `ticket_modify` accepts `status` and renames the file when it changes.
Older files without a status read as `todo` and gain the status on their next
modify.

## Tools

| Tool | Purpose |
|---|---|
| `ticket_add` | Create a ticket (project, epic, task, status, title, number, links, description, testing scenarios, acceptance criteria) |
| `ticket_remove` | Delete a ticket file |
| `ticket_modify` | Change any field, including `number` and `status`; renames the file if project/epic/task/status change |
| `ticket_show` | Return one ticket's full Markdown content |
| `ticket_list` | Print `<number>  <filename>` per line, sorted by number |

Reference a ticket by full filename, stem, or the unique 3-char code.

## File format

```markdown
---
ticket: "healthd-led-policy-grade-sensor-4f2"
project: "healthd"
epic: "led-policy"
task: "grade-sensor"
status: "todo"
title: "Grade the sensor input"
number: 3
created: "2026-09-28T10:00:00.000Z"
updated: "2026-09-28T10:00:00.000Z"
links: ["https://example.com/spec"]
---

# Grade the sensor input

## Description

...

## Testing Scenarios

- missing sensor returns error

## Acceptance Criteria

- [ ] grade error when sensor absent
```

## Commands

- `/tickets` — list all tickets, sorted by order number.
- `/ticket <id>` — show one ticket in a Markdown viewer (Enter/Esc to close).
  With no argument it opens a selector. Tab-completion works on filenames.
