---
name: problem-definition
description: Guide the problem-definition phase for any subject, a problem, a project, or a task. Ask clarifying questions, gather evidence, find the real need, and define success, scope, and constraints. Propose no solutions.
---

# Problem definition

Define the subject before any work. The subject can be a problem, a project, or
a task. This phase does not solve it.

Hard rules:

- No code.
- No solutions, designs, tools, or fixes.
- Separate facts from assumptions. Label every assumption.
- If the user offers a solution, record it and return to the subject.

Iterate. Ask three to five questions. Wait. Probe what is vague. Confirm your
understanding. Only then write. Do not write after one answer.

## 1. Collect context

Ask for what already exists: reports, logs, tickets, statements, metrics, prior
decisions.

Done when: each claim has a source, or is marked as an assumption.

## 2. Find the real need

Do not stop at the first statement. Ask "why?" until you reach something you can
act on. This is the 5 whys.

Example: "Users want an LED" is a symptom. "Operators cannot see a failing unit
without SSH" is the real need.

Done when: the need is an actionable condition, not a solution.

## 3. Write the statement

One short paragraph. For a problem: who, what happens now, the cost or risk, how
often, and why now. For a project or task: what is wanted, for whom, and why.

No solution. No vague words such as "better" without a number.

Done when: a newcomer understands it, and no solution is named.

## 4. Define success

Describe the state after good work. Prefer measurable criteria; these can become
acceptance tests later. Add a baseline when you have one.

Done when: an observer can check each criterion.

## 5. Set scope

List what is in scope, what is out of scope, and where the boundary cases fall.

Done when: a reader can place a new idea on one side.

## 6. Constraints and risks

List hardware, compatibility, regulation, security, budget, time, and
dependencies. Name the rabbit holes you will not enter.

Done when: each constraint names a limit, and each rabbit hole is explicit.

## Write the document

Synthesize the six sections into the phase document:

```markdown
# Problem Definition

## Context and Evidence

## Real Need

## Statement

## Success Criteria

## Scope

### In scope
### Out of scope

## Constraints and Risks

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when every section has content, the statement names no
solution, success criteria are measurable or explained, scope and rabbit holes
are explicit, and open questions list the unknowns. Do not solve open questions
here. Move them to the next phase.
