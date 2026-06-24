# Login Server

Minimal Next.js login UI for Ory Hydra authorization-code login challenges.

This service does not own a user database. It receives Hydra `login_challenge` requests, validates credentials by calling the resource server, accepts the login request in Hydra, and redirects the browser back to Hydra.

The login challenge account type is selected with Hydra/OIDC `acr_values`:

```text
acr_values=user-account
acr_values=maintainer-account
```

If `acr_values` is omitted, the app treats the challenge as `user-account` for existing clients.

## Flow

1. Hydra redirects the browser to `/login?login_challenge=...`.
2. The app fetches the login request from `HYDRA_ADMIN_URL`.
3. The user submits credentials.
4. The app posts those credentials to the configured resource-server login endpoint.
5. The resource server returns a stable user subject/id.
6. The app accepts the Hydra login request and redirects to Hydra's `redirect_to` URL.

## Resource Server Contract

The user-account login endpoint is configured by either `RESOURCE_SERVER_LOGIN_URL` or `RESOURCE_SERVER_URL` plus `RESOURCE_SERVER_LOGIN_PATH`. Use `POST /auth/login` for new integrations. `POST /internal/auth/verify-credentials` is a legacy/internal alias and should not be used by this app unless the new route is unavailable.

The maintainer-account login endpoint is configured by either `RESOURCE_SERVER_MAINTAINER_LOGIN_URL` or `RESOURCE_SERVER_URL` plus `RESOURCE_SERVER_MAINTAINER_LOGIN_PATH`. The default path is `POST /auth/maintainer-login`.

For user-account login, the app posts:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

For maintainer-account login, the app derives `serviceClientId` from Hydra's `loginRequest.client.client_id` and posts:

```json
{
  "email": "maintainer@example.com",
  "password": "secret",
  "serviceClientId": "user-portal"
}
```

The browser never provides `serviceClientId`.

The user-account field names can be changed with `RESOURCE_SERVER_IDENTIFIER_FIELD` and `RESOURCE_SERVER_PASSWORD_FIELD`. Maintainer-account login always sends `email`, `password`, and `serviceClientId`.

The response must include a stable user identifier in one of these fields: `subject`, `sub`, `id`, `user_id`, or `userId`. If your resource server uses another field, set `RESOURCE_SERVER_SUBJECT_FIELD`. Subjects must be globally unique across user and maintainer accounts.

Successful maintainer-account authentication returns a response like:

```json
{
  "authenticated": true,
  "accountType": "maintainer",
  "subject": "maintainer:user-portal:<maintainerId>",
  "email": "maintainer@example.com",
  "name": "maintainer",
  "service": {
    "id": "<service-db-id>",
    "clientId": "user-portal",
    "name": "<service-name>",
    "type": "APPLICATION"
  }
}
```

The login client forwards `email`, `name`, `account_type`, `accountType`, and `service` into the accepted Hydra login context when present.

Invalid maintainer credentials or a wrong/unknown service return:

```json
{
  "authenticated": false
}
```

The resource-server endpoint is protected. This service obtains a Hydra client-credentials token from `HYDRA_PUBLIC_URL` and sends it as:

```http
Authorization: Bearer <hydra-access-token>
```

The Hydra client must be allowed to request:

```text
audience: resource-server
user-account scope: internal.auth.verify-credentials
maintainer-account scope: internal.auth.verify-maintainer-credentials
```

For maintainer-account login, the bearer token identifies this login client as the trusted verifier. The target service is the `serviceClientId` value derived server-side from Hydra's login request.

## Setup

`idp-client.yaml` is the committed source of truth for this service's Hydra
machine client registration and local runtime env contract. It is safe to commit
because it describes required values but does not contain generated credentials
or real secrets.

The platform orchestrator generates the ignored `.env.local` file from
`idp-client.yaml` after registering this service in Hydra. For standalone local
development, run `./init.sh` once. If no env file exists, it creates `.env.local`
from `idp-client.yaml` and exits so you can fill `LOGIN_SERVER_CLIENT_SECRET`.

Then rerun:

```bash
./init.sh
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
