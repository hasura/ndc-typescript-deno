
import * as test    from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer   from '../infer.ts';

// Classes are currently not supoported and should throw an error
Deno.test("Complex Dependency", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/classes.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  test.assertThrows(() => {
    infer.programInfo(program_path, vendor_path, false);
  })
});
