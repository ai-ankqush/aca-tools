#!/usr/bin/env node
/**
 * Refresh the vendored catalogue in data/aca-requirements.json from the
 * ai-control-architecture repo. Prefers a local sibling checkout; falls back to
 * the published raw file on GitHub.
 *
 *   node scripts/sync-catalogue.mjs
 */

import { existsSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEST = fileURLToPath(new URL("../data/aca-requirements.json", import.meta.url));
const LOCAL = fileURLToPath(
  new URL("../../ai-control-architecture/controls/aca-requirements.json", import.meta.url)
);
const RAW =
  "https://raw.githubusercontent.com/ai-ankqush/ai-control-architecture/main/controls/aca-requirements.json";

async function main() {
  if (existsSync(LOCAL)) {
    copyFileSync(LOCAL, DEST);
    console.log(`Synced from local sibling repo:\n  ${LOCAL}`);
    return;
  }
  console.log(`Local sibling not found, fetching ${RAW}`);
  const res = await fetch(RAW);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  JSON.parse(text); // validate
  writeFileSync(DEST, text);
  console.log("Synced from GitHub raw.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
