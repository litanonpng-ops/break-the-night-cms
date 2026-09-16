# Self-hosting the presskit editor

## What lives where

- `break-the-night-cms` (this public fork): editor source, with no private content or credentials.
- `litanonpng-ops/break-the-night-website` (private): website, `.pages.yml`, presskit JSON and images.
- The editor commits content to the website repository. Its GitHub workflow builds the
  public site. Cloudflare deployment remains disabled in that workflow.

This fork does not use Pages CMS's hosted login, database or GitHub App. Installing
the official Pages CMS App does not authorize this separate self-hosted application.

## Requirements before this becomes the live editor

1. A Next.js/Node-compatible application host and a PostgreSQL database. The website's
   existing static-assets deployment cannot run this editor unchanged.
2. A chosen editor URL (used consistently for `BASE_URL`, callbacks and webhooks).
3. A separate GitHub App, installed on **only** `break-the-night-website`. Review the
   requested permissions before installation. Use the upstream manifest helper below.
4. Generated `BETTER_AUTH_SECRET` and `CRYPTO_KEY`, and the GitHub App credentials,
   kept in the host's secret store or an ignored local `.env.local`.
5. Optional email provider and a verified sender if email sign-in/invitations are needed.
   The `example.com` sender in the sample is a placeholder, not a working email service.

The local checkout is linked to the existing Vercel project `breakthenightgame`
(`prj_U0GpnV4nji522pgrDqCZhI3VweMC`) in `litanonpng-ops-projects`. `vercel.json`
selects the Next.js builder for this code without changing the website's source.
The free Neon database `breakthenight-cms-preview` is provisioned and connected
to Preview only. The private GitHub App `break-the-night-presskit-preview` is
installed on only `break-the-night-website`; its credentials are stored in Vercel's
Preview environment. The CMS uses the `cms-preview` branch and the stable preview
URL `https://breakthenight-cms-preview.vercel.app`.

## Development preview on the existing Vercel project

Use the Preview environment only. Do not promote the CMS to Production, change
production domains, or enable the game website's Cloudflare deployment workflow.

- Provision a Neon `free_v3` database in `iad1`, with Neon Auth disabled (the app
  already has its own authentication), connected to **Preview only**.
- Set CMS secrets in Preview, not Production. Use a stable preview alias as
  `BASE_URL` and for the GitHub App callbacks/webhook.
- Keep Vercel deployment protection enabled. External GitHub callbacks/webhooks
  must be checked against that protection; do not disable it silently.
- Deploy with `vercel deploy --target preview`, never `--prod`.
- The linked `.vercel` metadata and local env files remain ignored by Git.

Neon marketplace terms were approved by the account owner. No paid plan is
authorized. Preview-only use does not itself determine Vercel plan
eligibility; reassess the plan before a studio handoff or commercial use.

## Setup

Use Node 22 or newer. Copy `.env.local.example` to `.env.local`, fill in actual values,
and keep it out of Git. Leave it out of the public repository and website build.

```sh
npm ci
npm run setup:github-app -- --base-url https://YOUR-EDITOR-URL --app-name "Presskit Editor"
npm run db:migrate
npm run dev
```

The helper requires GitHub approval and may write app credentials to your ignored env
file. For local-only development, use `http://localhost:3000` consistently instead;
webhook delivery requires a reachable endpoint. Follow the upstream development docs
linked below for the database and GitHub App setup.

For production, `npm run build` builds Next.js **and runs database migrations through
the upstream postbuild script**. Run it only with the intended database configured,
then `npm start`. Do not run this editor build in the game website's static build job.

After login, open `litanonpng-ops/break-the-night-website`, branch `main`. The existing
`.pages.yml` limits the editing form to the presskit and its own media folder. GitHub
App permissions still apply to the whole selected repository; the form is not a
security boundary.

The current hosted editor can remain usable until this instance is configured and
verified. Do not uninstall it or enable Cloudflare deployment as part of setup.

## Maintenance

Keep the upstream MIT license/copyright notice in distributed copies. User-facing
branding is removed, not authorship or license notices. Track upstream security fixes.
Authentication, authorization and repository access checks have not been bypassed.
Provide your own legal/privacy information before offering this as a public service;
the upstream hosted service's terms do not describe this private editor.

- [Original repository](https://github.com/hunvreus/pagescms)
- [Installation guide](https://pagescms.org/docs/guides/installing/)
