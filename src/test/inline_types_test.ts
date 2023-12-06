
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';
import { FunctionNdcKind } from "../schema.ts";

Deno.test("Inline Types", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/inline_types.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_schema,
    {
      scalar_types: {
        String: {},
        Float: {}
      },
      functions: {
        "bar": {
          ndc_kind: FunctionNdcKind.Procedure,
          description: null,
          arguments: [
            {
              argument_name: "x",
              description: null,
              type: {
                type: "named",
                kind: "object",
                name: "bar_arguments_x"
              }
            }
          ],
          result_type: {
            type: "named",
            kind: "scalar",
            name: "String"
          }
        }
      },
      object_types: {
        "bar_arguments_x": {
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
        }
      }
    }
  );

});
