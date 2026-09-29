/**
 * Phase-entry instructions.
 *
 * When a project enters the tickets-planning phase, the agent proposes a ticket
 * set and waits for confirmation. It creates nothing until the user agrees.
 */

export function ticketsPlanningProposal(slug: string): string {
	return [
		`Project "${slug}" entered the tickets-planning phase.`,
		`Do this now, but do not create tickets yet:`,
		`1. Read the project documents with project_read_doc: problem-definition, research-and-discovery, and architecture-planning.`,
		`2. List existing tickets with ticket_list, and inspect likely matches with ticket_show.`,
		`3. Propose a ticket set. For each ticket give: title, epic, task (3-5 words), description, acceptance criteria, and order.`,
		`4. Group related work into epics. Note duplicates you would skip.`,
		`5. Wait for my confirmation before calling ticket_add.`,
		`6. After I confirm, create the tickets, then call project_save_phase to record the plan.`,
	].join("\n");
}
