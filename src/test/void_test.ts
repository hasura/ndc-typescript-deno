
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

// NOTE: It would be good to have explicit timeout for this
// See: https://github.com/denoland/deno/issues/11133
// Test bug: https://github.com/hasura/ndc-typescript-deno/issues/45
Deno.test("Void", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/void_types.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  test.assertThrows(() => {
    infer.inferProgramSchema(program_path, vendor_path, false);
  })
});
