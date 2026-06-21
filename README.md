# Login Server

Minimal Next.js login UI for Ory Hydra authorization-code login challenges.

This service does not own a user database. It receives Hydra `login_challenge` requests, validates credentials by calling the resource server, accepts the login request in Hydra, and redirects the browser back to Hydra.

## Flow

1. Hydra redirects the browser to `/login?login_challenge=...`.
2. The app fetches the login request from `HYDRA_ADMIN_URL`.
3. The user submits credentials.
4. The app posts those credentials to the configured resource-server login endpoint.
5. The resource server returns a stable user subject/id.
6. The app accepts the Hydra login request and redirects to Hydra's `redirect_to` URL.

## Resource Server Contract

The login endpoint is configured by either `RESOURCE_SERVER_LOGIN_URL` or `RESOURCE_SERVER_URL` plus `RESOURCE_SERVER_LOGIN_PATH`. Use `POST /auth/login` for new integrations. `POST /internal/auth/verify-credentials` is a legacy/internal alias and should not be used by this app unless the new route is unavailable.

By default, the app posts:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

The field names can be changed with `RESOURCE_SERVER_IDENTIFIER_FIELD` and `RESOURCE_SERVER_PASSWORD_FIELD`.

The response must include a stable user identifier in one of these fields: `subject`, `sub`, `id`, `user_id`, or `userId`. If your resource server uses another field, set `RESOURCE_SERVER_SUBJECT_FIELD`.

The resource-server endpoint is protected. This service obtains a Hydra client-credentials token from `HYDRA_PUBLIC_URL` and sends it as:

```http
Authorization: Bearer <hydra-access-token>
```

The Hydra client must be allowed to request:

```text
audience: resource-server
scope: internal.auth.verify-credentials
```

## Setup

```bash
cp .env.example .env
bun install
bun run dev
```

Default local URL: `http://localhost:3002`.

Configure Hydra's login URL to point at:

```text
http://localhost:3002/login
```

## Commands

```bash
bun run dev
bun run build
bun run start
bun run lint
```
