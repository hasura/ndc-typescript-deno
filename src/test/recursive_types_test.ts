
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

Deno.test("Recursive Types", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/recursive.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      bar: [],
    },
    schema: {
      collections: [],
      functions: [],
      object_types: {
        Foo: {
          fields: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
              type: {
                element_type: {
                  name: "Foo",
                  type: "named",
                },
                type: "array",
              },
            },
          },
        },
      },
      procedures: [
        {
          arguments: {},
          name: "bar",
          result_type: {
            name: "Foo",
            type: "named",
          },
        },
      ],
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
        },
      },
    }
  });
});
