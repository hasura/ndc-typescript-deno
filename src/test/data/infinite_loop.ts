
// Infinite loop bug: https://github.com/hasura/ndc-typescript-deno/issues/45

export async function infinite_loop() {
  const contents = await fetch('https://www.google.com')
  return contents;
}
