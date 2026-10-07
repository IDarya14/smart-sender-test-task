# Webhooks

Login, webhook list, and edit. API is mocked with MSW, there is no backend.

Needs Node 20.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Test

```bash
npm test
```

One Cypress test: two parallel requests get 401, `/auth/token/rotate` runs once, both retries succeed.

The test signs in, expires the in-memory mock session (so it does not wait 30 seconds), then refetches `/v1/me` and `/v1/webhooks` through the same client the UI uses.

## Login

- email: `test@example.com`
- password: `password`

## Notes

- `device_session_token` is kept in a module variable. The session itself lives in the MSW handlers, same idea as an HttpOnly cookie, so the client never stores an access token.
- Fingerprint is 32 hex characters, created once and kept in `localStorage`. It goes out with the auth calls.
- `GET /csrf` runs before the first request. `X-CSRF-TOKEN` is sent on POST and PUT. A 419 loads a new token and retries once.
- 401s share one rotate promise in the axios interceptor. Rotate itself does not go through that retry, so a failed rotate does not start another one. If rotate fails, or the retry is 401 again, the local session is cleared and the login screen comes back.
- List page and search are query params: `/webhooks?page=2&search=order`. Changing the search goes back to page 1.
- Session lasts 30 seconds. Rotate adds another 30. After a reload you sign in again; the list params in the url still apply.
