
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';
import { FunctionNdcKind } from "../schema.ts";

Deno.test("Conflicting Type Names in Imports", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/conflicting_names.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_schema, {
    functions: {
      "foo": {
        ndc_kind: FunctionNdcKind.Procedure,
        description: null,
        arguments: [],
        result_type: {
          name: "Foo",
          kind: "object",
          type: "named",
        },
      }
    },
    object_types: {
      Foo: {
        properties: [
          {
            property_name: "x",
            type: {
              name: "Boolean",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "y",
            type: {
              name: "conflicting_names_dep_Foo",
              kind: "object",
              type: "named",
            },
          },
        ]
      },
      conflicting_names_dep_Foo: {
        properties: [
          {
            property_name: "a",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "b",
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            },
          },
        ]
      },
    },
    scalar_types: {
      Boolean: {},
      Float: {},
      String: {},
    }
  })
});
