import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';
import { FunctionNdcKind, NullOrUndefinability } from "../schema.ts";

Deno.test("Nullable Types", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/nullable_types.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_schema, {
    functions: {
      "test": {
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
          {
            argument_name: "nullableParam",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            argument_name: "undefinedParam",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            argument_name: "nullOrUndefinedParam",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsEither,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            argument_name: "unionWithNull",
            description: null,
            type: {
              kind: "scalar",
              name: "test_arguments_unionWithNull",
              type: "named",
            },
          },
          {
            argument_name: "optionalParam",
            description: null,
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
        ],
        description: null,
        ndc_kind: FunctionNdcKind.Procedure,
        result_type: {
          type: "nullable",
          null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
          underlying_type: {
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
              null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            property_name: "optionalString",
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            property_name: "undefinedString",
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                kind: "scalar",
                name: "String",
                type: "named",
              },
            },
          },
          {
            property_name: "nullOrUndefinedString",
            type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsEither,
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
  });
});
