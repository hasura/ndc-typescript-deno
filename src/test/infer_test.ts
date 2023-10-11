
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std/path/mod.ts";
import * as infer   from '../infer.ts';

Deno.test("Inference", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/program.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      add: [
        "a",
        "b",
      ],
      hello: [],
    },
    schema: {
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
        String: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
      },
      object_types: {},
      collections: [],
      functions: [],
      procedures: [
        {
          arguments: {},
          name: "hello",
          result_type: {
            name: "String",
            type: "named",
          },
        },
        {
          arguments: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
              type: {
                name: "Float",
                type: "named",
              },
            },
          },
          name: "add",
          result_type: {
            name: "Float",
            type: "named",
          },
        },
      ],
    }
  });
});
