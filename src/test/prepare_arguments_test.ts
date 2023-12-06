import * as test from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as connector from '../connector.ts';
import { FunctionDefinitions, FunctionNdcKind, NullOrUndefinability, ObjectTypeDefinitions } from "../infer.ts";

Deno.test("argument ordering", () => {
  const function_name = "test_fn"
  const function_definitions: FunctionDefinitions = {
    [function_name]: {
      ndc_kind: FunctionNdcKind.Function,
      description: null,
      arguments: [
        {
          argument_name: "c",
          description: null,
          type: {
            type: "named",
            kind: "scalar",
            name: "Float"
          }
        },
        {
          argument_name: "a",
          description: null,
          type: {
            type: "named",
            kind: "scalar",
            name: "Float"
          }
        },
        {
          argument_name: "b",
          description: null,
          type: {
            type: "named",
            kind: "scalar",
            name: "Float"
          }
        },
      ],
      result_type: {
        type: "named",
        kind: "scalar",
        name: "String"
      }
    }
  }
  const object_types: ObjectTypeDefinitions = {}
  const args = {
    b: 1,
    a: 2,
    c: 3,
  }

  const prepared_args = connector.prepare_arguments(function_name, args, function_definitions, object_types);

  test.assertEquals(prepared_args, [ 3, 2, 1 ]);
})

Deno.test("nullable type coercion", async t => {
  const function_name = "test_fn"
  const function_definitions: FunctionDefinitions = {
    [function_name]: {
      ndc_kind: FunctionNdcKind.Function,
      description: null,
      arguments: [
        {
          argument_name: "nullOnlyArg",
          description: null,
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        },
        {
          argument_name: "undefinedOnlyArg",
          description: null,
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        },
        {
          argument_name: "nullOrUndefinedArg",
          description: null,
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsEither,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        },
        {
          argument_name: "objectArg",
          description: null,
          type: {
            type: "named",
            kind: "object",
            name: "MyObject",
          }
        },
        {
          argument_name: "nullOnlyArrayArg",
          description: null,
          type: {
            type: "array",
            element_type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
              underlying_type: {
                type: "named",
                kind: "scalar",
                name: "String"
              }
            }
          }
        },
        {
          argument_name: "undefinedOnlyArrayArg",
          description: null,
          type: {
            type: "array",
            element_type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
              underlying_type: {
                type: "named",
                kind: "scalar",
                name: "String"
              }
            }
          }
        },
        {
          argument_name: "nullOrUndefinedArrayArg",
          description: null,
          type: {
            type: "array",
            element_type: {
              type: "nullable",
              null_or_undefinability: NullOrUndefinability.AcceptsEither,
              underlying_type: {
                type: "named",
                kind: "scalar",
                name: "String"
              }
            }
          }
        },
      ],
      result_type: {
        type: "named",
        kind: "scalar",
        name: "String"
      }
    }
  }
  const object_types: ObjectTypeDefinitions = {
    "MyObject": {
      properties: [
        {
          property_name: "nullOnlyProp",
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsNullOnly,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        },
        {
          property_name: "undefinedOnlyProp",
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsUndefinedOnly,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        },
        {
          property_name: "nullOrUndefinedProp",
          type: {
            type: "nullable",
            null_or_undefinability: NullOrUndefinability.AcceptsEither,
            underlying_type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        }
      ]
    }
  }
  const test_cases = [
    {
      name: "all nulls",
      args: {
        nullOnlyArg: null,
        undefinedOnlyArg: null,
        nullOrUndefinedArg: null,
        objectArg: {
          nullOnlyProp: null,
          undefinedOnlyProp: null,
          nullOrUndefinedProp: null,
        },
        nullOnlyArrayArg: [null, null],
        undefinedOnlyArrayArg: [null, null],
        nullOrUndefinedArrayArg: [null, null],
      },
      expected: [
        null,
        undefined,
        null,
        { nullOnlyProp: null, undefinedOnlyProp: undefined, nullOrUndefinedProp: null },
        [null, null],
        [undefined, undefined],
        [null, null],
      ]
    },
    {
      name: "all undefineds",
      args: {
        nullOnlyArg: undefined,
        undefinedOnlyArg: undefined,
        nullOrUndefinedArg: undefined,
        objectArg: {
          nullOnlyProp: undefined,
          undefinedOnlyProp: undefined,
          nullOrUndefinedProp: undefined,
        },
        nullOnlyArrayArg: [undefined, undefined],
        undefinedOnlyArrayArg: [undefined, undefined],
        nullOrUndefinedArrayArg: [undefined, undefined],
      },
      expected: [
        null,
        undefined,
        undefined,
        { nullOnlyProp: null, undefinedOnlyProp: undefined, nullOrUndefinedProp: undefined },
        [null, null],
        [undefined, undefined],
        [undefined, undefined],
      ]
    },
    {
      name: "all missing",
      args: {
        objectArg: {},
        nullOnlyArrayArg: [],
        undefinedOnlyArrayArg: [],
        nullOrUndefinedArrayArg: [],
      },
      expected: [
        null,
        undefined,
        undefined,
        { nullOnlyProp: null, undefinedOnlyProp: undefined, nullOrUndefinedProp: undefined },
        [],
        [],
        [],
      ]
    },
    {
      name: "all valued",
      args: {
        nullOnlyArg: "a",
        undefinedOnlyArg: "b",
        nullOrUndefinedArg: "c",
        objectArg: {
          nullOnlyProp: "d",
          undefinedOnlyProp: "e",
          nullOrUndefinedProp: "f",
        },
        nullOnlyArrayArg: ["g", "h"],
        undefinedOnlyArrayArg: ["i", "j"],
        nullOrUndefinedArrayArg: ["k", "l"],
      },
      expected: [
        "a",
        "b",
        "c",
        { nullOnlyProp: "d", undefinedOnlyProp: "e", nullOrUndefinedProp: "f" },
        ["g", "h"],
        ["i", "j"],
        ["k", "l"],
      ]
    },
  ];

  await Promise.all(test_cases.map(test_case => t.step({
    name: test_case.name,
    fn: () => {
      const prepared_args = connector.prepare_arguments(function_name, test_case.args, function_definitions, object_types);
      test.assertEquals(prepared_args, test_case.expected);
    },
    sanitizeOps: false,
    sanitizeResources: false,
    sanitizeExit: false,
  })));

})
