---
name: tickets-planning
description: Guide the tickets-planning phase. Use when the active project phase is tickets-planning. Turn the project documents into ordered, non-duplicate implementation tickets with acceptance criteria.
---

# Tickets planning

This phase turns the architecture into an ordered set of tickets. It does not
add new design.

Read every project document first: `problem-definition`,
`research-and-discovery`, and `architecture-planning`. Use `project_read_doc`.

## Rules

- One ticket is one bounded action with one deliverable.
- A ticket must be finishable and verifiable alone.
- Give every ticket acceptance criteria.
- Add testing scenarios when the behavior can be tested.
- Reference the source: a document path, a decision, or a contract.
- Set `project` to the active slug on every ticket.
- `task` must be three to five words.
- Order tickets: dependencies first, then value. Use `number`.
- Check for duplicates before you create anything.
- No code. Tickets are plans.
- Break only the next few tickets to function level. Keep later tickets coarse.

## Define the work

1. Read the architecture documents. List the work items: modules,
   responsibilities, contracts, integration points, and test seams.
2. Group related work into epics.
3. Order the tickets. A ticket that another ticket needs comes first.
4. For each ticket, write the goal, the scope, and the acceptance criteria.
5. For the next few tickets only, break them to function level. See below.
6. Check each item against existing tickets. Use `ticket_list` and
   `ticket_show`. Drop duplicates.
7. Create the missing tickets with `ticket_add`.
8. Write the phase document.

## Function level

Only for the next few tickets. Give each one:

- The module or file it touches, by name.
- Function contracts: name, inputs, outputs, errors. No bodies.
- Test cases: the cases that prove the acceptance criteria.

The project rule applies here: modules, interfaces, contracts, and test cases,
but no function bodies and no implementation code.

## Ticket fields

Map your plan to the `ticket_add` fields:

- `project`: the active slug.
- `epic`: the group.
- `task`: three to five words.
- `title`: short and concrete.
- `number`: the order.
- `links`: document paths and decisions.
- `description`: what and why, scope, and references.
- `testingScenarios`: one per line.
- `acceptanceCriteria`: one per line.

## Document shape

```markdown
# Tickets Planning

## Inputs

## Epics

## Ticket Order

## Tickets

### <number>. <title>
- Epic
- Goal
- Scope
- Reference
- Acceptance criteria
- Function contracts (next few tickets only)
- Test cases (next few tickets only)

## Duplicates Skipped

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when:

- Every work item from the architecture maps to a ticket or a non-goal.
- Each ticket has a goal and acceptance criteria.
- Tickets are ordered by dependency and value.
- The next few tickets have function contracts and test cases.
- Existing tickets were checked, and no duplicate was created.
- Every created ticket has the active project slug.
- No code body appears.
