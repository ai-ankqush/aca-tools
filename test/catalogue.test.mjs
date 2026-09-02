#!/usr/bin/env node
/**
 * Data-layer tests for the catalogue query functions. No MCP dependency, so this
 * runs without installing anything. The full stdio smoke test is test/smoke.mjs.
 *
 *   node test/catalogue.test.mjs
 */

import * as cat from "../src/catalogue.mjs";

const C = cat.loadCatalogue();
const fails = [];
const check = (cond, label) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}`);
  if (!cond) fails.push(label);
};

const a = cat.about(C);
check(a.requirements === 34 && a.pillars === 10, `about: ${a.pillars} pillars, ${a.requirements} reqs`);
check(a.license === "CC-BY-4.0", `license tag: ${a.license}`);

check(cat.listPillars(C).length === 10, "list_pillars -> 10");

const p = cat.getPillar(C, "tool");
check(p && p.id === "12", `get_pillar('tool') -> ${p && p.id}`);
check(p && p.requirements.length === 4, `pillar 12 has ${p && p.requirements.length} reqs (expected 4)`);
check(cat.getPillar(C, "9").id === "09", "get_pillar('9') zero-pads to 09");
check(cat.getPillar(C, "zzz") === null, "get_pillar unknown -> null");

const r = cat.getRequirement(C, "aca-12-02");
check(r && r.id === "ACA-12-02", `get_requirement case-insensitive -> ${r && r.id}`);
check(r && r.pillar_name === "Tool & Action Control", `enriched with pillar_name: ${r && r.pillar_name}`);
check(cat.getRequirement(C, "ACA-99-99") === null, "get_requirement unknown -> null");

check(cat.listRequirements(C).count === 34, "list_requirements no filter -> 34");

const t1 = cat.listRequirements(C, { tier: "T1" }).count;
const t2 = cat.listRequirements(C, { tier: "T2" }).count;
const t3 = cat.listRequirements(C, { tier: "T3" }).count;
const t4 = cat.listRequirements(C, { tier: "T4" }).count;
const t5 = cat.listRequirements(C, { tier: "T5" }).count;
check(
  t1 < t2 && t2 < t3 && t3 < t4 && t4 < t5 && t5 === 34,
  `tier monotonic: T1=${t1} < T2=${t2} < T3=${t3} < T4=${t4} < T5=${t5}=all`
);

// tier means "applies at": T5 includes every lower-origin Enforced req.
const t5enf = cat.listRequirements(C, { tier: "T5", boundary: "Enforced" });
check(
  t5enf.count === 7 && t5enf.requirements.every((x) => x.boundary === "Enforced"),
  `T5 (applies) + Enforced -> ${t5enf.count} (expected 7, all Enforced reqs)`
);

check(cat.listRequirements(C, { pillar: "16" }).count === 3, "pillar 16 -> 3");
check(cat.listRequirements(C, { framework: "EU-AI-ACT" }).count === 34, "framework EU-AI-ACT -> 34 (universal)");
const agentic = cat.listRequirements(C, { framework: "OWASP-AGENTIC" }).count;
check(agentic > 0 && agentic < 34, `framework OWASP-AGENTIC -> ${agentic} (subset)`);
check(cat.listRequirements(C, { framework: "eu-ai-act" }).count === 34, "framework match is case-insensitive");

const v = cat.vocabulary(C);
check(v.boundary_sources.length === 4, `vocab boundary_sources: ${v.boundary_sources.length}`);
check(v.frameworks.includes("NIST-AI-RMF") && v.frameworks.length >= 6, `vocab frameworks: ${v.frameworks.length}`);

if (fails.length) {
  console.error(`\n${fails.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll data-layer checks passed.");
