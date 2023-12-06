
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';
import { FunctionNdcKind } from "../schema.ts";

// Skipped due to NPM dependency resolution not currently being supported.
Deno.test("External Dependencies", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/external_dependencies.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, true);

  test.assertEquals(program_schema, {
    scalar_types: {
      String: {},
    },
    object_types: {},
    functions: {
      "test_deps": {
        ndc_kind: FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "s",
            description: null,
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            }
          }
        ],
        result_type: {
          name: "String",
          kind: "scalar",
          type: "named",
        }
      }
    }
  });
});
