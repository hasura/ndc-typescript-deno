
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer   from '../infer.ts';

// Skipped due to NPM dependency resolution not currently being supported.
Deno.test({
  name: "Inference",
  fn() {
    const program_path = path.fromFileUrl(import.meta.resolve('./data/external_dependencies.ts'));
    const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
    const program_results = infer.programInfo(program_path, vendor_path, true);

    test.assertEquals(program_results, {
      positions: {
        test_deps: [
          "s"
        ]
      },
      schema: {
        scalar_types: {
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
            name: "test_deps",
            arguments: {
              s: {
                type: {
                  name: "String",
                  type: "named",
                },
              },
            },
            result_type: {
              name: "String",
              type: "named",
            },
          },
        ],
      }
    });
  }
});
