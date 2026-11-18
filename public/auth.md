# Auth.md

Vietnam Accounting 30-Day Interactive Learning Platform (Thông tư 99/2025/TT-BTC, Thông tư 58/2026/TT-BTC, Thông tư 200/2014/TT-BTC & Thông tư 133/2016/TT-BTC).
This service supports **agentic registration** and OAuth 2.1 + PKCE (S256) authentication for users, orchestrators, and tool runners: discover → register → authorize → exchange for an access_token → call API → revoke.

## Registration

- `POST /auth/register` — Register an account (`{"email", "password", "display_name"}`)
- `GET /oauth2/auth` — OAuth 2.1 + PKCE S256 authorization & consent form
- `POST /oauth2/token` — Exchange authorization code or refresh token for an access token
- `POST /oauth2/revoke` — Revoke an active refresh token / session
- `register_uri`: https://hoa.tanhdev.com/auth/register
- `authorization_endpoint`: https://hoa.tanhdev.com/oauth2/auth
- `token_endpoint`: https://hoa.tanhdev.com/oauth2/token
- `identity_types_supported`:
  - `anonymous`
  - `identity_assertion` (JWT Bearer)

## OAuth Metadata

- Protected Resource: https://hoa.tanhdev.com/.well-known/oauth-protected-resource
- Authorization Server: https://hoa.tanhdev.com/.well-known/oauth-authorization-server
- API Catalog: https://hoa.tanhdev.com/.well-known/api-catalog
- Agent Card: https://hoa.tanhdev.com/.well-known/agent-card.json
- Agent Skills: https://hoa.tanhdev.com/.well-known/agent-skills/index.json
- AI Catalog: https://hoa.tanhdev.com/.well-known/ai-catalog.json

## MCP Servers

- name: vietnam-accounting-learning-mcp
  transport: streamable-http
  endpoint: https://hoa.tanhdev.com/mcp
  card: https://hoa.tanhdev.com/.well-known/mcp/server-card.json

## Autonomy Governance

- tier: Tier 1 Supervised
- protocol_version: 1.0
