
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer   from '../infer.ts';

// This previously went into an infinite loop
Deno.test("Inference on Dependency", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/infinite_loop.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_results = infer.programInfo(program_path, vendor_path, false);
  test.assertEquals(program_results.schema.procedures, [
    {
      name: "infinite_loop",
      arguments: {},
      result_type: { type: "named", name: "Response" }
    }
  ]);
});
