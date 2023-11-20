
// Infinite loop void bug: https://github.com/hasura/ndc-typescript-deno/issues/45

export function void_function(): void {
  return
}
