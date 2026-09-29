---
name: implementation-and-testing
description: Guide the implementation-and-testing phase. Use when the active project phase is implementation-and-testing. The human writes code and tests. The agent inspects, hands off, reviews the diff against the criteria, records evidence, and reports problems. Do not edit implementation code or tests unless asked.
---

# Implementation and testing

This phase moves tickets from ready to verified.

The human writes the implementation code and the tests. The agent prepares,
inspects, reviews, and records.

## Rules

These rules come from the user's collaboration agreement.

- The human writes implementation code and tests, unless the user says otherwise.
- Do not edit implementation code or tests unless the user explicitly asks.
- Inspect the relevant sources before proposing any change.
- Ask the user for clarification, documentation, or datasheets when facts are
  missing.
- Discuss consequential design choices with the user.
- You may update planning documents and tickets.
- Report problems. Do not fix them automatically.
- Record verification evidence.
- Create an investigation ticket when a necessary fact is unknown.

## Run the loop

1. Pick the next ticket with `ticket_list` and `ticket_show`.
2. Set status `doing` with `ticket_modify`.
3. Inspect the relevant sources. When a fact is unknown, stop and create an
   investigation ticket.
4. Hand off the ticket to the user. State the contract, the acceptance
   criteria, and the test cases. Ask for clarification when needed.
5. Wait for the user to implement.
6. Review the diff against the ticket. See the review checklist below.
7. Record the evidence.
8. Report every problem. Do not fix it. The user fixes it, or it becomes a new
   ticket.
9. Set status `done` only after all acceptance criteria pass.
10. Repeat until the function-level batch is done.
11. Switch back to tickets-planning to detail the next batch.

## Review checklist

- The diff matches the ticket scope. No extra work.
- Every acceptance criterion is met.
- The contract is respected: names, inputs, outputs, and errors.
- The tests cover the acceptance criteria.
- The tests pass. You may run them to verify.
- Evidence exists for any measured criterion.
- File paths and line numbers are recorded.

## Record evidence

For each ticket, record:

- What changed, with file paths and line numbers.
- The test command and the result.
- Any measured number against a success criterion.
- A log or screenshot when behavior is visual.

## When to go back a phase

- The next batch needs function contracts: go to tickets-planning.
- A contract or a decision is wrong: go to architecture-planning.
- The stated need is wrong: go to problem-definition.
- A fact is unknown: create an investigation ticket. Do not change phase.

## Document shape

```markdown
# Implementation and Testing

## Batch

## Tickets Completed

### <number>. <title>
- Status
- What changed (file paths and lines)
- Review result
- Tests
- Evidence
- Problems reported
- Notes

## Tickets In Progress

## Investigation Tickets

## New Tickets Needed

## Blockers

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when:

- Every ticket in the batch is `done` or explicitly `blocked`.
- Every `done` ticket was reviewed against its acceptance criteria.
- Tests pass and evidence is recorded.
- Problems are reported, not fixed automatically.
- Unknown facts became investigation tickets.
- New work is captured as a ticket, not done silently.
- The agent edited no implementation code or tests.
- No code body appears in the phase document.
