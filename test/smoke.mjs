#!/usr/bin/env node
/**
 * End-to-end smoke test: spawn the server over stdio, list tools and resources,
 * call each tool, and assert the responses look right. Exits non-zero on failure.
 *
 *   node test/smoke.mjs
 */

import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = fileURLToPath(new URL("../src/index.mjs", import.meta.url));
const fails = [];
const check = (cond, label) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}`);
  if (!cond) fails.push(label);
};
const parse = (r) => JSON.parse(r.content[0].text);

const transport = new StdioClientTransport({ command: "node", args: [SERVER] });
const client = new Client({ name: "aca-smoke", version: "0.0.0" });
await client.connect(transport);

const tools = (await client.listTools()).tools.map((t) => t.name).sort();
check(
  ["about", "get_pillar", "get_requirement", "get_vocabulary", "list_pillars", "list_requirements"].every((t) =>
    tools.includes(t)
  ),
  `tools present: ${tools.join(", ")}`
);

const resources = (await client.listResources()).resources.map((r) => r.uri);
check(resources.includes("aca://catalogue"), "catalogue resource registered");

const about = parse(await client.callTool({ name: "about", arguments: {} }));
check(about.requirements === 34 && about.pillars === 10, `about: ${about.pillars} pillars, ${about.requirements} reqs`);

const pillars = parse(await client.callTool({ name: "list_pillars", arguments: {} }));
check(pillars.length === 10, `list_pillars returns ${pillars.length}`);

const p12 = parse(await client.callTool({ name: "get_pillar", arguments: { id: "tool" } }));
check(p12.id === "12" && p12.requirements.length >= 1, `get_pillar('tool') -> ${p12.id} with ${p12.requirements.length} reqs`);

const req = parse(await client.callTool({ name: "get_requirement", arguments: { id: "aca-12-02" } }));
check(req.id === "ACA-12-02" && req.pillar_name, `get_requirement case-insensitive -> ${req.id} (${req.pillar_name})`);

const t5enf = parse(await client.callTool({ name: "list_requirements", arguments: { tier: "T5", boundary: "Enforced" } }));
check(t5enf.count === 7, `T5(applies)+Enforced -> ${t5enf.count} (expected 7, all Enforced reqs)`);

const euact = parse(await client.callTool({ name: "list_requirements", arguments: { framework: "EU-AI-ACT" } }));
check(euact.count === 34, `framework EU-AI-ACT -> ${euact.count} (all pillars map to it)`);

const owasp = parse(await client.callTool({ name: "list_requirements", arguments: { framework: "OWASP-AGENTIC" } }));
check(owasp.count > 0 && owasp.count < 34, `framework OWASP-AGENTIC -> ${owasp.count} (subset)`);

const vocab = parse(await client.callTool({ name: "get_vocabulary", arguments: {} }));
check(vocab.boundary_sources.length === 4 && vocab.frameworks.length > 0, `vocab: ${vocab.frameworks.length} frameworks`);

await client.close();

if (fails.length) {
  console.error(`\n${fails.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
