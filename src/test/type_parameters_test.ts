
import * as test    from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer   from '../infer.ts';

Deno.test({ name: "Type Parameters",
 ignore: false,
 fn() {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/type_parameters.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.programInfo(program_path, vendor_path, false);

  // TODO: Currently broken since parameters aren't normalised

  test.assertEquals(program_results, {
    positions: {
      bar: [],
    },
    schema: {
      collections: [],
      functions: [],
      object_types: {
        "Bar<Foo>": {
          fields: {
            x: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            y: {
              type: {
                name: "Foo",
                type: "named",
              },
            },
          },
        },
        "Foo": {
          fields: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
      },
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
        },
        String: {
          aggregate_functions: {},
          comparison_operators: {},
        },
      },
      procedures: [
        {
          arguments: {},
          name: "bar",
          result_type: {
            name: "Bar<Foo>",
            type: "named",
          },
        },
      ],
    }
  });

}});