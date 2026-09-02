/**
 * AI Control Architecture catalogue: pure query layer, no MCP dependency.
 *
 * The MCP server (index.mjs) is thin glue over these functions; keeping them
 * dependency-free means they can be unit-tested and reused directly.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TIER_ORDER = ["T1", "T2", "T3", "T4", "T5"];

/** Load the vendored catalogue JSON. */
export function loadCatalogue() {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL("../data/aca-requirements.json", import.meta.url)), "utf-8")
  );
}

const pillarMap = (cat) => new Map(cat.pillars.map((p) => [p.id, p]));

/** Attach pillar name, surface, and framework tags to a requirement. */
export function enrich(cat, r) {
  const p = pillarMap(cat).get(r.pillar) || {};
  return { ...r, pillar_name: p.name, surface: p.surface, frameworks: p.frameworks || [] };
}

export function about(cat) {
  return {
    schema: cat.schema,
    title: cat.title,
    version: cat.version,
    license: cat.license,
    homepage: cat.homepage,
    pillars: cat.pillars.length,
    requirements: cat.requirements.length,
    notes: cat.notes,
  };
}

export function vocabulary(cat) {
  const frameworks = [...new Set(cat.pillars.flatMap((p) => p.frameworks || []))].sort();
  return { tiers: cat.tiers, boundary_sources: cat.boundary_sources, frameworks };
}

export function listPillars(cat) {
  return cat.pillars;
}

/** By two-digit id ('12') or a name fragment ('tool'). Returns null if unmatched. */
export function getPillar(cat, id) {
  let pillar = pillarMap(cat).get(String(id).padStart(2, "0"));
  if (!pillar) {
    const q = String(id).toLowerCase();
    pillar = cat.pillars.find((p) => p.name.toLowerCase().includes(q));
  }
  if (!pillar) return null;
  const requirements = cat.requirements.filter((r) => r.pillar === pillar.id);
  return { ...pillar, requirements };
}

/** By id, case-insensitive. Returns null if unmatched. */
export function getRequirement(cat, id) {
  const r = cat.requirements.find((x) => x.id === String(id).toUpperCase());
  return r ? enrich(cat, r) : null;
}

/** Filter by tier (applies-at), boundary, pillar, framework. */
export function listRequirements(cat, { tier, boundary, pillar, framework } = {}) {
  const pm = pillarMap(cat);
  let rows = cat.requirements.slice();
  if (tier) {
    const max = TIER_ORDER.indexOf(tier);
    rows = rows.filter((r) => TIER_ORDER.indexOf(r.from_tier) <= max);
  }
  if (boundary) rows = rows.filter((r) => r.boundary === boundary);
  if (pillar) rows = rows.filter((r) => r.pillar === String(pillar).padStart(2, "0"));
  if (framework) {
    const f = String(framework).toUpperCase();
    rows = rows.filter((r) => (pm.get(r.pillar)?.frameworks || []).map((x) => x.toUpperCase()).includes(f));
  }
  return { count: rows.length, requirements: rows.map((r) => enrich(cat, r)) };
}
