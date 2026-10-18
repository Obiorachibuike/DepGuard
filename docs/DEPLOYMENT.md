# Website deployment

The private `website/` workspace is a Next.js App Router documentation site, not an API for uploading projects. Publishing the core npm package does not deploy the website.

## Local / Node hosting

Use Node 24. From the repository root:

```bash
npm ci
npm run website:build
npm run start --workspace website
```

The start script copies static/public assets into the generated standalone output and runs its server. The server binds to `0.0.0.0`, defaults to port 3000, and accepts `PORT` from the environment. Put TLS and normal reverse-proxy resource limits in front of it. Browser features use same-origin pages; they do not call localhost services. The development preview allows `*.e2b.app` origins. No external font downloads, scanner credentials or npm authentication are needed to build the site.

`output: standalone` is enabled. For a minimal container, preserve the generated `.next/standalone/` directory layout (including workspace paths), copy `website/.next/static` to the corresponding `website/.next/static` directory inside it, and copy `website/public` if populated. Run the generated workspace `server.js` with `HOSTNAME=0.0.0.0` and `PORT=3000`. Confirm the generated layout for your Next.js version rather than assuming it is a single root server file.

## Managed Next.js hosts

Connect the GitHub repository, set the app root to `website` with monorepo install support, use the root lockfile/workspaces for `npm ci`, and build with `npm run website:build` from the root (or `npm run build` in `website`). Do not publish the website workspace to npm. Configure the public domain in the hosting provider; no production domain or deployment is claimed by this repository.

After deployment, verify the homepage, documentation navigation/search, code copying, both themes, narrow layouts, keyboard focus and unknown-route 404s. Update external URLs and publication-status wording only after the corresponding release/deployment succeeds.
