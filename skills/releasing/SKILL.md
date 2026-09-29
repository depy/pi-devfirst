---
name: releasing
description: Guide the releasing phase. Use when the active project phase is releasing. Confirm readiness, record the version and artifacts, define a rollback plan, perform the release, and verify it. Do not add features or fix code.
---

# Releasing

This phase ships the validated result. It adds no features and fixes no code.

Read `review-and-validation` first for the readiness result, and
`problem-definition` for the success criteria.

## Rules

- Release only when review-and-validation says ready. Do not release on a
  `fail` or an unresolved `not verified` item.
- Do not edit implementation code or tests unless the user explicitly asks.
- Record the version, the artifacts, and the rollback plan before you release.
- Have a rollback plan before you touch production.
- Verify after the release, not only before.
- Report problems. Do not fix them automatically. A fix is a new ticket.
- Record evidence: commands, results, times, and file paths.
- Keep the release small and reversible.
- Ask how the release happens, what tooling must be prepared, and whether to run
  it. Run the release only with explicit approval.

## Run the loop

1. Confirm readiness and list the success criteria.
2. Define the release scope: what ships, and what does not.
3. Confirm the version.
4. Ask how the release happens. Ask what tooling must be prepared, and prepare
   only what the user approves.
5. Prepare the artifacts and the release notes.
6. Write the pre-release checklist.
7. Write the rollback plan. Name the trigger and the steps.
8. Ask whether to run the release. Run it only with explicit approval.
9. Perform the release, or hand it off to the user with the steps.
10. Verify after the release: smoke test, error rate, and the success criteria.
11. Record the result.
12. Report every problem and turn each one into a ticket or a rollback.

## Release notes

Summarize what changed for the user. Keep it short:

- What is new.
- What changed.
- What is fixed.
- What is removed or breaking.
- Any required action.

## Rollback plan

- Trigger: the condition that starts a rollback.
- Steps: the exact commands or actions.
- Owner: who runs them.
- Verification: how you know the rollback worked.

## Release method and tooling

Ask how this release happens:

- Manual, step by step.
- A CI/CD pipeline or a workflow.
- A package registry or an app store.
- A container image or a server deploy.
- A firmware flash or a device update.

Ask what must be prepared, and prepare only what the user approves:

- A build pipeline or a job.
- A package artifact, an image, or a binary.
- Signing keys, tokens, or credentials.
- A changelog or release-note step.
- A release script or a checklist runner.
- A staging environment.

Then ask who runs the release, and whether to run it now. Run the release only
with explicit approval. Never run a production release without it. You may
prepare the release tooling. Do not edit the product code or its tests.

## Document shape

```markdown
# Releasing

## Release Scope

## Version

## Readiness

## Pre-release Checklist

## Artifacts

## Release Method

## Release Notes

## Rollback Plan

## Release Steps

## Post-release Verification

## Result

## Follow-ups

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when:

- Readiness was confirmed before the release.
- The version and artifacts are recorded.
- A rollback plan exists, with a trigger and steps.
- The release method is recorded, and tooling was prepared only with approval.
- The release was performed with explicit approval, or handed off with exact
  steps.
- Post-release verification is done and recorded.
- Problems are reported, not fixed.
- Follow-ups are captured as tickets.
- No implementation code or test was edited.
