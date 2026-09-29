/**
 * Independent acceptance verification for the explorer.
 *
 * This is reviewer tooling, not product code and not a product test. It runs
 * against a temporary HOME and checks edge cases, error paths, security, and
 * concurrency that the product test suite does not cover.
 *
 * Run: node test/verification/browser-acceptance.ts
 */

import {
	artifactsFingerprint,
	fetchText,
	makeProject,
	makeTicket,
	projectsDir,
	readTree,
	ticketsDir,
	writePhase,
} from "../explorer/helpers.ts";

const { startServer, stopServer, publicHost } = await import(
	"../../extensions/explorer/lib/server.ts"
);

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ""): void {
	if (condition) {
		passed += 1;
		console.log(`PASS  ${name}`);
	} else {
		failed += 1;
		console.log(`FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
	}
}

await makeProject("alpha", { title: "Alpha", phase: "problem-definition" });
await writePhase("alpha", "problem-definition", 1, "# Problem\n\nBody");
await makeTicket({
	filename: "alpha-core-one-todo-aaa.md",
	project: "alpha",
	title: "One",
	number: 1,
});
await makeTicket({
	filename: "alpha-core-dup-todo-ddd.md",
	project: "alpha",
	title: "Dup",
	number: 1,
});
await makeProject("empty", { title: "Empty", phase: "releasing" });
await writePhase("alpha", "research-and-discovery", 2, `# Big\n\n${"x".repeat(200_000)}`);

const before = artifactsFingerprint([
	...(await readTree(projectsDir())),
	...(await readTree(ticketsDir())),
]);

const status = await startServer({ host: "0.0.0.0", port: 0 });
const base = `http://127.0.0.1:${status.port}`;
check("binds all interfaces and reports a public host", !status.url!.includes("0.0.0.0"), status.url);
check("publicHost maps 0.0.0.0", publicHost("0.0.0.0") !== "0.0.0.0");
check("publicHost keeps an explicit host", publicHost("127.0.0.1") === "127.0.0.1");

const home = await fetchText(`${base}/`);
check("index lists a populated and an empty project", home.text.includes("alpha") && home.text.includes("empty"));

const emptyProject = await fetchText(`${base}/p/empty`);
check("empty project shows zero tickets", /Tickets \(0\)/.test(emptyProject.text));

const emptyTickets = await fetchText(`${base}/p/empty/tickets`);
check("empty project tickets page is valid", emptyTickets.status === 200 && /No tickets/.test(emptyTickets.text));

const emptyPhase = await fetchText(`${base}/p/alpha/phase/releasing`);
check("unwritten phase is a 200 page, not an error", emptyPhase.status === 200 && /no document yet/i.test(emptyPhase.text));

const big = await fetchText(`${base}/p/alpha/phase/research-and-discovery`);
check("large body renders", big.status === 200 && big.text.includes("Big"));

const traversal = await fetchText(`${base}/p/alpha/ticket/..%2F..%2Fetc%2Fpasswd`);
check("path traversal is rejected", traversal.status === 400 || traversal.status === 404);
check("traversal leaks no file content", !traversal.text.includes("root:"));

const malformedSlug = await fetchText(`${base}/p/Bad_Slug`);
check("malformed slug is 400", malformedSlug.status === 400);

const unknownPhase = await fetchText(`${base}/p/alpha/phase/not-a-phase`);
check("unknown phase is 404", unknownPhase.status === 404);

const duplicates = await fetchText(`${base}/p/alpha/tickets`);
check(
	"duplicate numbers both listed",
	duplicates.text.includes("alpha-core-one-todo-aaa.md") &&
		duplicates.text.includes("alpha-core-dup-todo-ddd.md"),
);

const parallel = await Promise.all(
	Array.from({ length: 20 }, (_, index) => fetchText(`${base}/p/alpha?n=${index}`)),
);
check("twenty parallel requests all return 200", parallel.every((response) => response.status === 200));

await stopServer();

const after = artifactsFingerprint([
	...(await readTree(projectsDir())),
	...(await readTree(ticketsDir())),
]);
check("no artifact changed during verification", after === before);

const restarted = await startServer({ host: "0.0.0.0", port: 0 });
check("restart after stop works", restarted.running === true);
await stopServer();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
