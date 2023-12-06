
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';
import { FunctionNdcKind, NullOrUndefinability } from "../schema.ts";

Deno.test("Inference", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/program.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_schema, {
    scalar_types: {
      Float: {},
      String: {},
    },
    object_types: {},
    functions: {
      "hello": {
        ndc_kind: FunctionNdcKind.Procedure,
        description: null,
        arguments: [],
        result_type: {
          name: "String",
          kind: "scalar",
          type: "named",
        }
      },
      "add": {
        ndc_kind: FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "a",
            description: null,
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            }
          },
          {
            argument_name: "b",
            description: null,
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            }
          }
        ],
        result_type: {
          name: "Float",
          kind: "scalar",
          type: "named",
        }
      }
    }
  });
});

Deno.test("Complex Inference", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/complex.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, true);

  test.assertEquals(program_schema, {
    functions: {
      "complex": {
        ndc_kind: FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "a",
            description: null,
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            }
          },
          {
            argument_name: "b",
            description: null,
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            }
          },
          {
            argument_name: "c",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                name: "String",
                kind: "scalar",
                type: "named",
              }
            }
          }
        ],
        result_type: {
          name: "Result",
          kind: "object",
          type: "named",
        },
      }
    },
    object_types: {
      Result: {
        properties: [
          {
            property_name: "num",
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "str",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "bod",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ]
      },
    },
    scalar_types: {
      Float: {},
      String: {},
    }
  });
});
