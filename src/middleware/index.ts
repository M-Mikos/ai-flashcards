import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/reset", "/auth/reset/confirm", "/api/auth/login"];
const PUBLIC_PREFIXES = ["/auth/", "/api/auth/"];
const ASSET_PREFIXES = ["/_astro", "/_image"];
const ASSET_EXTENSIONS = /\.(css|js|ico|png|jpg|jpeg|svg|webp|gif|txt|map)$/;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAssetRequest(pathname: string) {
  return ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || ASSET_EXTENSIONS.test(pathname);
}

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  if (isAssetRequest(url.pathname)) {
    return next();
  }

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? null,
    };
  }

  if (url.pathname.startsWith("/api/auth/")) {
    return next();
  }

  const isPublic = isPublicPath(url.pathname);

  if (user && isPublic) {
    return redirect("/");
  }

  if (user) {
    return next();
  }

  if (!isPublic) {
    return redirect("/auth/login");
  }

  return next();
});
