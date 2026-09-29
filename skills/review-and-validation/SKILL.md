---
name: review-and-validation
description: Guide the review-and-validation phase. Use when the active project phase is review-and-validation. Verify the result against the problem criteria and the ticket acceptance criteria, record evidence, and report problems. Do not fix them.
---

# Review and validation

This phase verifies the result. It does not add features and does not fix code.

The reviewer is not the author. The human wrote the code. The agent reviews it
independently.

Read the earlier documents first: `problem-definition` for the success criteria,
`architecture-planning` for the contracts and non-goals, and
`implementation-and-testing` for the evidence.

## Rules

- Verify, do not trust. Run the checks yourself when possible.
- Check each criterion on its own. Do not batch them into one "looks fine".
- Record evidence with file paths, line numbers, commands, and results.
- Report problems. Do not fix them automatically.
- Do not edit implementation code or tests unless the user explicitly asks.
- Classify every item as `pass`, `fail`, or `not verified`.
- Look for what the tests miss: edge cases, error paths, security, performance,
  compatibility, and documentation.
- Revisit the constraints, the non-goals, and the open questions.
- Turn each failure into a ticket, or record the user's decision.
- Ask which environments and tools you may use to verify behavior, and prepare
  the ones the user approves. Do not edit the product code or its tests.

## Run the loop

1. List the success criteria from `problem-definition`.
2. List the tickets and their acceptance criteria.
3. Read the recorded evidence from `implementation-and-testing`.
4. Verify each criterion: run the tests, reproduce the scenario, or inspect the
   source.
5. Ask which extra environments and tools you may use. Prepare only what the
   user approves.
6. Run the cross-cutting checks below.
7. Check the constraints and the non-goals. Confirm none was violated or
   silently skipped.
8. Classify each item.
9. Report the failures. Do not fix them. Create a ticket or record a decision.
10. State the readiness.

## Cross-cutting checks

- Edge cases: empty, missing, large, and duplicate input.
- Error paths: failure, timeout, and recovery.
- Security: input validation, secrets, and permissions.
- Performance: the measured number against the success criterion.
- Compatibility: versions, platforms, and external contracts.
- Documentation: does it match the behavior.

## Verification environments and tooling

Ask the user what you may use to verify behavior beyond the test suite:

- Serial console, for example `/dev/ttyUSB`, for embedded Linux and MCUs.
- SSH to the host where the code runs.
- A local run on this machine.
- A local run in Docker.
- A staging or production-like environment.
- Hardware in the loop.
- Network capture, logs, or metrics.

Then ask what must be prepared, and prepare only what the user approves:

- A Docker image or a container setup.
- An automation script to drive the scenario.
- Fixtures, test data, or a seeded database.
- Access, credentials, or a tunnel.

You may create this verification tooling. Do not edit the product code or the
product's tests. Record each tool, how to run it, and its result.

## Document shape

```markdown
# Review and Validation

## Scope

## Success Criteria

| Criterion | Result | Evidence |

## Ticket Acceptance Criteria

### <number>. <title>
- Result
- Evidence

## Cross-cutting Checks

## Verification Environments

## Constraints and Non-Goals

## Problems Found

### Problem 1
- Severity
- What happens
- Evidence
- Ticket to create

## Not Verified

## Readiness

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when:

- Every success criterion has a result and evidence.
- Every ticket acceptance criterion was reviewed.
- Each failure has a ticket or a recorded decision.
- `not verified` items are explicit, with the reason.
- Constraints and non-goals are confirmed or flagged.
- Problems are reported, not fixed.
- Extra verification tools are asked for, approved, and recorded.
- No implementation code or test was edited.
- Readiness is stated.
