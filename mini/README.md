# Break the Night presskit editor

A single-purpose password form. No database, npm dependencies, user accounts,
OAuth login, collaborator management or webhook service.

The server uses the existing private GitHub App to read/write only
`content/presskit.json` and `website/press/media/` in
`litanonpng-ops/break-the-night-website`, branch `main`. Installation tokens are
short-lived and limited to that repository's contents. Credentials never reach
the browser. Concurrent content edits are protected by GitHub's file SHA check.

Images are converted in the browser to WebP (maximum 3200px, 2.5MB). Uploads create
their own GitHub commit; Save applies the selected image to the page. Removing an
image from the form does not permanently delete its original GitHub file.

`lib/presskit.mjs` and `public/press/vendor/` reuse the website's existing static
presskit() renderer and styles, without redesigning the public page. `schema.json`
is the website's original `.pages.yml` JSON form definition.

## Hosting

Deploy **this folder**, not the old Pages CMS root, to the existing Vercel project
as a Preview. Point `breakthenight-cms-preview.vercel.app` at the new deployment.
Do not change the production website or enable Cloudflare deployment.

Preview environment variables:

- `CMS_PASSWORD_HASH`: `salt:hex-scrypt-digest` (32-byte scrypt output).
- `CMS_SESSION_SECRET`: random signing key. Cookies are Secure, HttpOnly,
  SameSite=Strict and expire after eight hours. Password changes invalidate them.
- `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`: existing private GitHub App.

Use `npm test` for focused input/session checks. There is intentionally no build
step and no Neon or PostgreSQL connection. The original editor remains on the
`cms-preview` branch for rollback; `simple-cms` contains this replacement.

The UI has basic per-instance login throttling, not a distributed rate limiter.
Use a strong password and rotate it if shared outside the intended team.

The CMS alias is excluded from Vercel's extra account-login gate, so visitors use
only the editor password. Other deployment URLs retain Vercel protection. Neon
is disconnected and all database environment variables have been removed. The
unused free database is retained as a rollback backup, not used by this editor.

The former GitHub webhook bypass is revoked. Disabling the obsolete GitHub App
webhook subscription itself requires the owner's GitHub identity confirmation;
its old endpoint no longer exists in this editor and is not needed for saving.
