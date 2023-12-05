
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

Deno.test("Recursive Types", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/recursive.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_schema, {
    functions: {
      "bar": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [],
        result_type: {
          type: "named",
          kind: "object",
          name: "Foo"
        }
      }
    },
    object_types: {
      Foo: {
        properties: [
          {
            property_name: "a",
            type: {
              type: "named",
              kind: "scalar",
              name: "Float"
            }
          },
          {
            property_name: "b",
            type: {
              type: "array",
              element_type: {
                type: "named",
                kind: "object",
                name: "Foo"
              }
            }
          }
        ]
      },
    },
    scalar_types: {
      Float: {},
    },
  });
});
