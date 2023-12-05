
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

Deno.test({ name: "Type Parameters",
 ignore: false,
 fn() {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/validation_algorithm_update.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));

  const program_results = infer.inferProgramSchema(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    functions: {
      "bar": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "string",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
          {
            argument_name: "aliasedString",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
          {
            argument_name: "genericScalar",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
          {
            argument_name: "array",
            description: null,
            type: {
              type: "array",
              element_type: {
                type: "named",
                kind: "scalar",
                name: "String"
              }
            }
          },
          {
            argument_name: "promise",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
          {
            argument_name: "anonObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "bar_arguments_anonObj"
            }
          },
          {
            argument_name: "aliasedObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "Bar"
            }
          },
          {
            argument_name: "genericAliasedObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "GenericBar<string>"
            }
          },
          {
            argument_name: "interfce",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "IThing"
            }
          },
          {
            argument_name: "genericInterface",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "IGenericThing"
            }
          },
          {
            argument_name: "aliasedIntersectionObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "IntersectionObject"
            }
          },
          {
            argument_name: "anonIntersectionObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "bar_arguments_anonIntersectionObj"
            }
          },
          {
            argument_name: "genericIntersectionObj",
            description: null,
            type: {
              type: "named",
              kind: "object",
              name: "GenericIntersectionObject<string>"
            }
          },
        ],
        result_type: {
          name: "String",
          kind: "scalar",
          type: "named",
        }
      }
    },
    object_types: {
      "GenericBar<string>": {
        properties: [
          {
            property_name: "data",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      "GenericIntersectionObject<string>": {
        properties: [
          {
            property_name: "data",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "test",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      Bar: {
        properties: [
          {
            property_name: "test",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      IGenericThing: {
        properties: [
          {
            property_name: "data",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      IThing: {
        properties: [
          {
            property_name: "prop",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      IntersectionObject: {
        properties: [
          {
            property_name: "wow",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "test",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      bar_arguments_anonIntersectionObj: {
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
            property_name: "test",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
      bar_arguments_anonObj: {
        properties: [
          {
            property_name: "a",
            type: {
              name: "Float",
              kind: "scalar",
              type: "named",
            },
          },
          {
            property_name: "b",
            type: {
              name: "String",
              kind: "scalar",
              type: "named",
            },
          },
        ],
      },
    },
    scalar_types: {
      Float: {},
      String: {},
    }
  });
}});
