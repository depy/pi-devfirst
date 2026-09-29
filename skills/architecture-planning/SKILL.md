---
name: architecture-planning
description: Guide the architecture-planning phase. Use when the active project phase is architecture-planning. Choose the structure, name modules and interfaces, record decisions and trade-offs. No code bodies.
---

# Architecture planning

This phase decides the structure. It turns the defined problem and the research
into a plan that tickets can be cut from.

No code bodies. No implementation. You may name modules, interfaces, types,
function contracts (signatures), and test cases.

Read the prior phase documents first with `project_read_doc`, at least
`problem-definition` and `research-and-discovery`.

## Rules

- Tie every decision to a success criterion or a constraint.
- Give each major decision two or three options, with trade-offs.
- Record the chosen option and the reason.
- Prefer the simplest option that meets the constraints.
- Discuss consequential choices with the user. Do not decide alone.
- Reuse what research found. Do not invent when a reference exists.
- Name what you will not build. These are non-goals.
- No code bodies. Signatures, contracts, and schemas only.
- Specify types, even for a dynamic language. "Array of numbers" is enough for
  shared understanding.
- Describe each change in the context of the current system: what changes at the
  system level, and what changes at the module level.
- Add diagrams. They are heavily encouraged. See the Diagrams section.
- Address every cross-cutting concern that applies. See the Cross-cutting
  concerns section.
- Keep decisions separate from open questions.

## Run the loop

Iterate. Ask, probe, confirm, then write.

1. Restate the problem, success criteria, scope, and constraints. Ask if it is
   right.
2. List the main design decisions and the questions behind them.
3. For each decision, write the options and trade-offs. Ask the user to choose
   when the choice is consequential.
4. Record the choice, the reason, and the criteria it serves.
5. Describe the structure: modules, responsibilities, interfaces, data model,
   and data flow.
6. Define contracts: names, inputs, outputs, types, errors, and edge cases. No
   bodies. Use plain type words when the language is dynamic.
7. Describe the impact on the current system, at the system level and at the
   module level.
8. Map integration points, extension points, and ownership.
9. Define the test strategy: what proves each success criterion, and where the
   test seams are.
10. Record risks, mitigations, non-goals, and open questions.

## Diagrams

Add diagrams. They are heavily encouraged. Use Mermaid so they render.

Pick the kinds that fit the work:

- Component diagram: modules and their links.
- Sequence diagram: one key interaction over time.
- State diagram: states and transitions.
- Flow diagram: a process or a decision path.
- Data model or ER diagram: entities and their relations.
- Call graph: the call chain for a key path.

Prefer two or three diagrams. Use no more than 10, and only when each one is
necessary and relevant.

## Cross-cutting concerns

Check each item. When the work touches it, address it in the document. When it
does not apply, say so in one line.

- Concurrency and threading.
- Persistence and storage.
- Transactions and atomicity.
- Cancellation.
- Retries and backoff.
- Idempotency.
- Ordering and delivery guarantees.
- Failure handling and recovery.

## Document shape

```markdown
# Architecture Planning

## Inputs and Restated Goals

## Decisions

### Decision 1: <title>
- Context
- Options
- Choice
- Rationale

## Structure

### Modules
### Responsibilities
### Interfaces and Contracts
### Data Model
### Data Flow

## Impact on the Current System

### System level
### Module level

## Diagrams

## Cross-cutting Concerns

## Integration and Extension Points

## Test Strategy

## Non-Goals

## Risks and Mitigations

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.

## Done

The phase is done when:

- Every major decision has options, a choice, and a rationale tied to a
  criterion or constraint.
- Modules, responsibilities, and interfaces are named.
- Contracts list inputs, outputs, types, errors, and edge cases.
- The impact on the current system is described at the system level and the
  module level.
- Diagrams are present, and there are two or three unless more are truly
  needed.
- Every applicable cross-cutting concern is addressed, and the rest are marked
  as not applicable.
- The test strategy maps to the success criteria.
- Non-goals and open questions are explicit.
- No code body appears.
