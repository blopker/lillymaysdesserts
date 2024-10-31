/// <reference path="../.astro/types.d.ts" />
/// <reference types="gtag.js" />

interface Window {
  // TODO: install @types/gtag.js or similar for this
  gtag: any;
  dataLayer: any[];
  setNav: string;
}
