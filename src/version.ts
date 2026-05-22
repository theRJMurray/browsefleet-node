// `globalThis.__BROWSEFLEET_VERSION__` is replaced by tsup's `define` at build
// time with the package.json `version` string. esbuild's `define` does a literal
// token-form substitution: the member-expression form in the source must match
// the key in tsup.config.ts exactly. The fallback covers tsx / vitest / raw-
// source runs where no replacement has happened.
declare global {
  // The injected build-time constant. `var` is required for ambient global declarations.
  var __BROWSEFLEET_VERSION__: string | undefined;
}

export const SDK_VERSION: string =
  typeof globalThis.__BROWSEFLEET_VERSION__ === 'string'
    ? globalThis.__BROWSEFLEET_VERSION__
    : '0.0.0-dev';
