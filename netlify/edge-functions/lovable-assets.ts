// Serves the checked-in Lovable asset pointers (src/assets/*.asset.json → /__l5e/assets-v1/...)
// on Netlify. Those paths are only routed by Lovable's hosting, so without this proxy the
// planet surface maps 404 and the globes render black.
const LOVABLE_ASSET_HOST = "https://90789408-8e00-422f-8845-356faa154276.lovableproject.com";

export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { pathname } = new URL(req.url);
  const upstream = await fetch(`${LOVABLE_ASSET_HOST}${pathname}`, { method: req.method });
  if (!upstream.ok) {
    return new Response("Asset not found", { status: upstream.status });
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Asset URLs embed a unique asset id, so their content never changes.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("netlify-cdn-cache-control", "public, max-age=31536000, immutable, durable");

  return new Response(upstream.body, { status: upstream.status, headers });
};

export const config = {
  path: "/__l5e/assets-v1/*",
  cache: "manual",
};
