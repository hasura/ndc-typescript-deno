
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

Deno.test({ name: "Type Parameters",
 ignore: false,
 fn() {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/type_parameters.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  // TODO: Currently broken since parameters aren't normalised

  test.assertEquals(program_schema, {
    functions: {
      "bar": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [],
        result_type: {
          name: "Bar<Foo>",
          kind: "object",
          type: "named",
        }
      }
    },
    object_types: {
      "Bar<Foo>": {
        properties: [
          {
            property_name: "x",
            type: {
              type: "named",
              kind: "scalar",
              name: "Float"
            }
          },
          {
            property_name: "y",
            type: {
              type: "named",
              kind: "object",
              name: "Foo"
            }
          },
        ]
      },
      "Foo": {
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
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
        ]
      },
    },
    scalar_types: {
      Float: {},
      String: {},
    },
  });

}});
