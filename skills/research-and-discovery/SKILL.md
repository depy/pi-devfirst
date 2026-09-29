---
name: research-and-discovery
description: Guide the research-and-discovery phase. Use when the active project phase is research-and-discovery. Search the web and read existing code to gather verified facts, documentation, reference implementations, and known issues. Make no design decisions.
---

# Research and discovery

This phase gathers facts and references. It does not design or decide. Keep
design choices for architecture-planning.

First ask: **Is there an existing code base or system?** If yes, explore it
before or alongside the web research.

## Rules

- Use the web search and fetch tools heavily.
- Search small atoms: a concept, an API name, a symbol, a version, an error
  message.
- Cite every claim.
- For a web source, include the full URL.
- For code, include the full file path with file name and extension, plus line
  numbers.
- Label each claim: `observed` (you read the source or saw it run),
  `documented` (claimed in docs), or `assumed` (your guess).
- When documented behavior and observed behavior differ, record both.
- No design decisions. Record options and trade-offs as facts only.

## Explore an existing code base

Map the current state, with file paths as evidence:

- Structure and entry points.
- Contracts, conventions, and patterns already in use.
- Responsibilities and ownership: what owns what.
- Data transformations: input, output, and where data changes.
- Dependencies, including hidden and transitive ones.
- Extension points and integration seams.

## Compile four outputs

### 1. Domain model and contracts

- Domain objects, terms, and business rules.
- Formats, schemas, protocols, and interfaces.
- External contracts and who owns them.
- Versions that matter.

### 2. Relevant documentation

- Official docs and API references.
- Specifications, standards, and RFCs.
- Release notes, changelogs, migration guides.
- Blog posts, tutorials, and talks.
- Security advisories and CVEs.
- Datasheets and hardware manuals, when relevant.

### 3. Reference implementations

- Official examples and starter templates.
- Similar open source projects and code bases.
- Code snippets and gists.
- Tests in similar projects, as behavior evidence.

### 4. Issues and discussions

- GitHub issues, pull requests, and discussions.
- Q&A sites, forums, and community channels.
- Reports of limits, bugs, and edge cases.
- Breaking changes named in release notes.

Verify each item against its source. Mark unverified items as `assumed`.

## Done

The phase is done when:

- Each output list has at least 3 items.
- Keep each list to 5 items or fewer. Use up to 10 only when more than 5 items
  are high quality and very relevant.
- For each list, search 20 to 50 sources. Review them, rank them, and keep only
  the best. Never keep fewer than 3.
- Each web entry has the full URL.
- Each code reference has the full path and line numbers.
- Every claim has a label and a source, or is marked `assumed`.
- Open questions list what the research could not answer.
- No design decision appears in the document.

## Write the document

Synthesize the findings into the phase document:

```markdown
# Research and Discovery

## Existing System (if any)

## Domain Model and Contracts

## Documentation

## Reference Implementations

## Issues and Discussions

## Observed vs Documented

## Open Questions
```

Then call `project_save_phase` with the body, without frontmatter.
