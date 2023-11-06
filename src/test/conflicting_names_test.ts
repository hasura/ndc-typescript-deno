
import * as test  from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer from '../infer.ts';

Deno.test("Conflicting Type Names in Imports", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/conflicting_names.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      foo: [],
    },
    schema: {
      collections: [],
      functions: [],
      object_types: {
        Foo: {
          fields: {
            x: {
              type: {
                name: "Boolean",
                type: "named",
              },
            },
            y: {
              type: {
                name: "conflicting_names_dep_Foo",
                type: "named",
              },
            },
          },
        },
        conflicting_names_dep_Foo: {
          fields: {
            a: {
              type: {
                name: "String",
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
        },
      },
      procedures: [
        {
          arguments: {},
          name: "foo",
          result_type: {
            name: "Foo",
            type: "named",
          },
        },
      ],
      scalar_types: {
        Boolean: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
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
      }
    }
  })
});
