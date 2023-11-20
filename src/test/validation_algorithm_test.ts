
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer   from '../infer.ts';

Deno.test({ name: "Type Parameters",
 ignore: false,
 fn() {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/validation_algorithm_update.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      bar: [
        "string",
        "aliasedString",
        "genericScalar",
        "array",
        "promise",
        "anonObj",
        "aliasedObj",
        "genericAliasedObj",
        "interfce",
        "genericInterface",
        "aliasedIntersectionObj",
        "anonIntersectionObj",
        "genericIntersectionObj",
      ],
    },
    schema: {
      collections: [],
      functions: [],
      object_types: {
        "GenericBar<string>": {
          fields: {
            data: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        "GenericIntersectionObject<string>": {
          fields: {
            data: {
              type: {
                name: "String",
                type: "named",
              },
            },
            test: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        Bar: {
          fields: {
            test: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        IGenericThing: {
          fields: {
            data: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        IThing: {
          fields: {
            prop: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        IntersectionObject: {
          fields: {
            test: {
              type: {
                name: "String",
                type: "named",
              },
            },
            wow: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        bar_arguments_anonIntersectionObj: {
          fields: {
            num: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            test: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
        },
        bar_arguments_anonObj: {
          fields: {
            a: {
              type: {
                name: "Float",
                type: "named",
              },
            },
            b: {
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
            aliasedIntersectionObj: {
              type: {
                name: "IntersectionObject",
                type: "named",
              },
            },
            aliasedObj: {
              type: {
                name: "Bar",
                type: "named",
              },
            },
            aliasedString: {
              type: {
                name: "String",
                type: "named",
              },
            },
            anonIntersectionObj: {
              type: {
                name: "bar_arguments_anonIntersectionObj",
                type: "named",
              },
            },
            anonObj: {
              type: {
                name: "bar_arguments_anonObj",
                type: "named",
              },
            },
            array: {
              type: {
                element_type: {
                  name: "String",
                  type: "named",
                },
                type: "array",
              },
            },
            genericAliasedObj: {
              type: {
                name: "GenericBar<string>",
                type: "named",
              },
            },
            genericInterface: {
              type: {
                name: "IGenericThing",
                type: "named",
              },
            },
            genericIntersectionObj: {
              type: {
                name: "GenericIntersectionObject<string>",
                type: "named",
              },
            },
            genericScalar: {
              type: {
                name: "String",
                type: "named",
              },
            },
            interfce: {
              type: {
                name: "IThing",
                type: "named",
              },
            },
            promise: {
              type: {
                name: "String",
                type: "named",
              },
            },
            string: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
          name: "bar",
          result_type: {
            name: "String",
            type: "named",
          },
        },
      ],
      scalar_types: {
        Float: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
        String: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
      }
    }
  });
}});
