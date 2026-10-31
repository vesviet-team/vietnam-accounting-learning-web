# Auth.md

Vietnam Accounting 30-Day Interactive Learning Platform (Thông tư 99/2025/TT-BTC, Thông tư 200/2014/TT-BTC & Thông tư 133/2016/TT-BTC).
This service supports **agentic registration** for autonomous AI agents, orchestrators, and tool runners: discover → register → (claim if needed) → exchange for an access_token → call API → handle revocation.

## Registration

- `POST /agent/identity` — Register a new agent identity
- `POST /agent/identity/callback` — Handle OAuth 2.1 + PKCE callback for agent sessions
- `register_uri`: https://learn.tanhdev.com/oauth2/register
- `claim_uri`: https://learn.tanhdev.com/oauth2/claim
- `token_endpoint`: https://learn.tanhdev.com/oauth2/token
- `identity_types_supported`:
  - `anonymous`
  - `identity_assertion` (JWT Bearer)

## OAuth Metadata

- Protected Resource: https://learn.tanhdev.com/.well-known/oauth-protected-resource
- Authorization Server: https://learn.tanhdev.com/.well-known/oauth-authorization-server
- API Catalog: https://learn.tanhdev.com/.well-known/api-catalog
- Agent Card: https://learn.tanhdev.com/.well-known/agent-card.json
- Agent Skills: https://learn.tanhdev.com/.well-known/agent-skills/index.json
- AI Catalog: https://learn.tanhdev.com/.well-known/ai-catalog.json

## MCP Servers

- name: vietnam-accounting-learning-mcp
  transport: streamable-http
  endpoint: https://learn.tanhdev.com/mcp
  card: https://learn.tanhdev.com/.well-known/mcp/server-card.json

## Autonomy Governance

- tier: Tier 1 Supervised
- protocol_version: 1.0
