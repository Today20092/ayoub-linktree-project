/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    GALLERY_SESSION_SECRET: string
    GALLERY_ACCESS_AUDS?: string
  }
}
