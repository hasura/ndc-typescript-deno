
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer   from '../infer.ts';

Deno.test({ name: "Type Parameters",
 ignore: false,
 fn() {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/inline_types.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.programInfo(program_path, vendor_path, false);

  // TODO: Currently broken since parameters aren't normalised

  test.assertEquals(program_results, 
    {
      "schema": {
        "scalar_types": {
          "String": {
            "aggregate_functions": {},
            "comparison_operators": {},
            "update_operators": {}
          },
          "Float": {
            "aggregate_functions": {},
            "comparison_operators": {},
            "update_operators": {}
          }
        },
        "object_types": {
          "bar_arguments_x": {
            "fields": {
              "a": {
                "type": {
                  "type": "named",
                  "name": "Float"
                }
              },
              "b": {
                "type": {
                  "type": "named",
                  "name": "String"
                }
              }
            }
          }
        },
        "collections": [],
        "functions": [],
        "procedures": [
          {
            "name": "bar",
            "arguments": {
              "x": {
                "type": {
                  "type": "named",
                  "name": "bar_arguments_x"
                }
              }
            },
            "result_type": {
              "type": "named",
              "name": "String"
            }
          }
        ]
      },
      "positions": {
        "bar": [
          "x"
        ]
      }
    }
  );

}});