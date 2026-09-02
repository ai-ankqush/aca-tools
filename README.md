# AI Control Architecture, MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the [AI Control Architecture](https://aicontrolarchitecture.org) requirements catalogue to AI agents and MCP-aware tools. Instead of reading the documentation, an agent can query the architecture directly, ask which requirements apply at a given risk tier, what a specific requirement demands, or which controls map to a regulation.

The architecture text is licensed CC BY 4.0. This server code is Apache-2.0.

---

## What it exposes

**Tools**

| Tool | What it does |
|------|--------------|
| `about` | Catalogue metadata: schema, version, license, counts. |
| `get_vocabulary` | The tiers (T1..T5), boundary-source ladder, and framework tags. |
| `list_pillars` | The ten control pillars, their questions and surfaces. |
| `get_pillar` | One pillar and all its requirements (by id `07`..`16` or name fragment). |
| `get_requirement` | A single requirement by id, e.g. `ACA-12-02`. |
| `list_requirements` | Filter by `tier`, `boundary`, `pillar`, and/or `framework`. |

`list_requirements` with `tier` returns everything that *applies* at that tier (its `from_tier` is at or below it), which is the question an assessor actually asks.

**Resource**

- `aca://catalogue`, the full machine-readable catalogue as JSON.

---

## Run it

```bash
npm install
npm start          # serves over stdio
npm test           # end-to-end smoke test
```

The server speaks MCP over stdio, so you point an MCP client at `node src/index.mjs`.

### Use with an MCP client

Example client config (works for Claude Desktop and other MCP hosts):

```json
{
  "mcpServers": {
    "ai-control-architecture": {
      "command": "node",
      "args": ["/absolute/path/to/aca-tools/src/index.mjs"]
    }
  }
}
```

---

## Testing

Three levels, easiest first.

**1. Data-layer checks** (no install needed), verifies the query logic:

```bash
node test/catalogue.test.mjs
```

**2. Full stdio smoke test**, spawns the server, does a real MCP handshake, lists tools and resources, and calls each tool:

```bash
npm install
npm test
```

Passing output ends with `All smoke checks passed.` and every line is prefixed `ok`. A failure exits non-zero and names the check.

**3. Poke it by hand over stdio**, proves the raw JSON-RPC protocol:

```bash
printf '%s\n' \
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}' \
'{"jsonrpc":"2.0","method":"notifications/initialized"}' \
'{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_requirements","arguments":{"tier":"T3","boundary":"Enforced"}}}' \
| node src/index.mjs
```

You should see the tool list, then the seven Enforced requirements that apply at Tier 3.

**In an MCP client.** After wiring the config above into Claude Desktop (or another MCP host) and restarting it, ask in plain language, for example: *"Using the AI Control Architecture server, what requirements apply at Tier 3 and must be enforced?"* The client will call the tool and answer from it.

---

## Keeping the catalogue current

The requirements live in `data/aca-requirements.json`, vendored from the [ai-control-architecture](https://github.com/ai-ankqush/ai-control-architecture) repository (which generates it from the docs). Refresh it with:

```bash
npm run sync
```

This copies from a local sibling checkout of that repo if present, otherwise fetches the published file from GitHub.

---

## Licensing

- **Server code**: Apache-2.0 (see `LICENSE`).
- **Catalogue content** (`data/`): CC BY 4.0, from the AI Control Architecture. The name and conformance marks are reserved; see the architecture's `TRADEMARK.md`.

Stewarded by Neo Control, [neocontrol.ai](https://neocontrol.ai).
