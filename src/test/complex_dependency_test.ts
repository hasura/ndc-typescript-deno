
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

// This program omits its return type and it is inferred via the 'fetch' dependency.
Deno.test("Inference on Dependency", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/infinite_loop.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);
  test.assertEquals(program_schema.functions, {
    infinite_loop: {
      ndc_kind: infer.FunctionNdcKind.Procedure,
      description: null,
      arguments: [],
      result_type: { type: "named", kind: "object", name: "Response" }
    }
  });
});
