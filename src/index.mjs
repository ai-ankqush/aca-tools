#!/usr/bin/env node
/**
 * AI Control Architecture, MCP server.
 *
 * Exposes the machine-readable requirements catalogue over the Model Context
 * Protocol so an AI agent (or any MCP client) can query the architecture at
 * assessment time instead of reading the docs.
 *
 * Thin glue over src/catalogue.mjs (the pure query layer). Data source:
 * data/aca-requirements.json (vendored from ai-control-architecture; refresh
 * with `npm run sync`). Framework text is CC BY 4.0; this server code is Apache-2.0.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cat from "./catalogue.mjs";

const CATALOGUE = cat.loadCatalogue();

const ok = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const err = (message) => ({ content: [{ type: "text", text: message }], isError: true });

const server = new McpServer({
  name: "ai-control-architecture",
  version: CATALOGUE.version || "0.1.0",
});

server.registerTool(
  "about",
  {
    title: "About the catalogue",
    description:
      "Metadata about the AI Control Architecture requirements catalogue: schema, version, license, homepage, and counts.",
    inputSchema: {},
  },
  async () => ok(cat.about(CATALOGUE))
);

server.registerTool(
  "get_vocabulary",
  {
    title: "Get vocabulary",
    description:
      "The controlled vocabularies: risk tiers (T1..T5), the boundary-source ladder (Declared/Evidenced/Verified/Enforced), and the framework tags used across pillars.",
    inputSchema: {},
  },
  async () => ok(cat.vocabulary(CATALOGUE))
);

server.registerTool(
  "list_pillars",
  {
    title: "List pillars",
    description:
      "The ten control pillars (07..16), each with its control question, the surface it governs (See/Decide/Do), and its framework crosswalks.",
    inputSchema: {},
  },
  async () => ok(cat.listPillars(CATALOGUE))
);

server.registerTool(
  "get_pillar",
  {
    title: "Get a pillar",
    description:
      "One control pillar and all of its requirements. Accepts the two-digit id (e.g. '12') or a name fragment (e.g. 'tool').",
    inputSchema: {
      id: z.string().describe("Two-digit pillar id 07..16, or a name fragment like 'inventory' or 'tool'"),
    },
  },
  async ({ id }) => {
    const p = cat.getPillar(CATALOGUE, id);
    return p ? ok(p) : err(`No pillar matching "${id}". Try 07..16 or a name fragment.`);
  }
);

server.registerTool(
  "get_requirement",
  {
    title: "Get a requirement",
    description: "A single requirement by its identifier, with its pillar context.",
    inputSchema: {
      id: z.string().describe("Requirement id, e.g. 'ACA-12-02' (case-insensitive)"),
    },
  },
  async ({ id }) => {
    const r = cat.getRequirement(CATALOGUE, id);
    return r ? ok(r) : err(`No requirement "${id}". Ids look like ACA-12-02.`);
  }
);

server.registerTool(
  "list_requirements",
  {
    title: "List / filter requirements",
    description:
      "All requirements, optionally filtered. `tier` returns everything that APPLIES at that tier (from_tier at or below it). `boundary`, `pillar`, and `framework` narrow further. With no arguments, returns the full set.",
    inputSchema: {
      tier: z.enum(["T1", "T2", "T3", "T4", "T5"]).optional().describe("Return requirements that apply at this tier"),
      boundary: z
        .enum(["Declared", "Evidenced", "Verified", "Enforced"])
        .optional()
        .describe("Only requirements whose minimum boundary source is this"),
      pillar: z.string().optional().describe("Two-digit pillar id, e.g. '09'"),
      framework: z
        .string()
        .optional()
        .describe("Framework tag, e.g. 'EU-AI-ACT', 'NIST-AI-RMF', 'OWASP-LLM' (see get_vocabulary)"),
    },
  },
  async (args) => ok(cat.listRequirements(CATALOGUE, args))
);

server.registerResource(
  "catalogue",
  "aca://catalogue",
  {
    title: "AI Control Architecture requirements catalogue",
    description: "The full machine-readable catalogue as JSON.",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(CATALOGUE, null, 2) }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `AI Control Architecture MCP server v${CATALOGUE.version} ready (${CATALOGUE.requirements.length} requirements).`
);
