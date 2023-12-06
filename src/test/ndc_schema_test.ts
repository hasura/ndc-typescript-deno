import * as test from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as infer from '../infer.ts';
import { ProgramSchema } from '../infer.ts';

Deno.test("NDC Schema Generation", () => {
  const program_schema: ProgramSchema = {
    functions: {
      "test_proc": {
        arguments: [
          {
            argument_name: "nullableParam",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: infer.NullOrUndefinability.AcceptsNullOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
        ],
        description: null,
        ndc_kind: infer.FunctionNdcKind.Procedure,
        result_type: {
          type: "nullable",
          null_or_undefinability: infer.NullOrUndefinability.AcceptsNullOnly,
          underlying_type: {
            kind: "scalar",
            name: "String",
            type: "named",
          }
        },
      },
      "test_func": {
        arguments: [
          {
            argument_name: "myObject",
            description: null,
            type: {
              kind: "object",
              name: "MyObject",
              type: "named",
            },
          },
        ],
        description: null,
        ndc_kind: infer.FunctionNdcKind.Function,
        result_type: {
          type: "array",
          element_type: {
            kind: "scalar",
            name: "String",
            type: "named",
          }
        },
      },
    },
    object_types: {
      "MyObject": {
        properties: [
          {
            property_name: "string",
            type: {
              kind: "scalar",
              name: "String",
              type: "named",
            },
          },
          {
            property_name: "nullableString",
            type: {
              type: "nullable",
              null_or_undefinability: infer.NullOrUndefinability.AcceptsNullOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
        ],
      },
    },
    scalar_types: {
      String: {},
      test_arguments_unionWithNull: {},
    },
  };

  const schema_response = infer.get_ndc_schema(program_schema)

  test.assertEquals(schema_response, {
    collections: [],
    functions: [
      {
        name: "test_func",
        arguments: {
          "myObject": {
            type: {
              name: "MyObject",
              type: "named",
            },
          },
        },
        result_type: {
          type: "array",
          element_type: {
            name: "String",
            type: "named",
          }
        },
      },
    ],
    procedures: [
      {
        name: "test_proc",
        arguments: {
          "nullableParam": {
            type: {
              type: "nullable",
              underlying_type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        result_type: {
          type: "nullable",
          underlying_type: {
            name: "String",
            type: "named",
          }
        },
      }
    ],
    object_types: {
      "MyObject": {
        fields: {
          "string": {
            type: {
              name: "String",
              type: "named",
            },
          },
          "nullableString": {
            type: {
              type: "nullable",
              underlying_type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
      },
    },
    scalar_types: {
      String: {
        aggregate_functions: {},
        comparison_operators: {}
      },
      test_arguments_unionWithNull: {
        aggregate_functions: {},
        comparison_operators: {}
      },
    }
  });

});
