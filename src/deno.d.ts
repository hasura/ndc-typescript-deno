

/**
 * This module exists to be included as a library by the typescript compiler in `infer.ts`.
 * The reason for this is that the user is likely to use the Deno dev tools when developing their functions.
 * And they will have `Deno` in scope.
 * This ensures that these references will typecheck correctly in `infer.ts`.
 */

export {};

declare global {
  var Deno: any
}