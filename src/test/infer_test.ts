
import * as test    from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer   from '../infer.ts';

Deno.test("Inference", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/program.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      add: [
        "a",
        "b",
      ],
      hello: [],
    },
    schema: {
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
        },
        String: {
          aggregate_functions: {},
          comparison_operators: {},
        },
      },
      object_types: {},
      collections: [],
      functions: [],
      procedures: [
        {
          arguments: {},
          name: "hello",
          result_type: {
            name: "String",
            type: "named",
          },
        },
        {
          arguments: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
              type: {
                name: "Float",
                type: "named",
              },
            },
          },
          name: "add",
          result_type: {
            name: "Float",
            type: "named",
          },
        },
      ],
    }
  });
});

Deno.test("Complex Inference", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/complex.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_results = infer.programInfo(program_path, vendor_path, true);

  test.assertEquals(program_results, {
    positions: {
      complex: [
        "a",
        "b",
        "c",
      ],
    },
    schema: {
      collections: [],
      functions: [],
      object_types: {
        Result: {
          fields: {
            bod: {
              type: {
                name: "String",
                type: "named",
              },
            },
            num: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            str: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
      },
      procedures: [
        {
          arguments: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            c: {
              type: {
                type: "nullable",
                underlying_type: {
                  name: "String",
                  type: "named",
                },
              },
            },
          },
          name: "complex",
          result_type: {
            name: "Result",
            type: "named",
          },
        },
      ],
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
        },
        String: {
          aggregate_functions: {},
          comparison_operators: {},
        },
      }
    }
  });
});