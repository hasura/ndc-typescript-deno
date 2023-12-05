
import * as test  from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as path  from "https://deno.land/std@0.208.0/path/mod.ts";
import * as infer from '../infer.ts';

// NOTE: It would be good to have explicit timeout for this
// See: https://github.com/denoland/deno/issues/11133
// Test bug: https://github.com/hasura/ndc-typescript-deno/issues/45
Deno.test("Inferred Dependency Based Result Type", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/pg_dep.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_schema = infer.inferProgramSchema(program_path, vendor_path, true);

  test.assertEquals(program_schema, {
    functions: {
      "insert_user": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "user_name",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        ],
        result_type: {
          type: "named",
          kind: "scalar",
          name: "insert_user_output"
        }
      },
      "insert_todos": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "user_id",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
          {
            argument_name: "todo",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          },
        ],
        result_type: {
          type: "named",
          kind: "scalar",
          name: "insert_todos_output"
        }
      },
      "delete_todos": {
        ndc_kind: infer.FunctionNdcKind.Procedure,
        description: null,
        arguments: [
          {
            argument_name: "todo_id",
            description: null,
            type: {
              type: "named",
              kind: "scalar",
              name: "String"
            }
          }
        ],
        result_type: {
          type: "named",
          kind: "scalar",
          name: "String"
        }
      },
    },
    scalar_types: {
      String: {},
      insert_todos_output: {},
      insert_user_output: {},
    },
    object_types: {},
  });
});
