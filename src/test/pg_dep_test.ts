
import * as test    from "https://deno.land/std@0.202.0/assert/mod.ts";
import * as path    from "https://deno.land/std@0.203.0/path/mod.ts";
import * as infer   from '../infer.ts';

// NOTE: It would be good to have explicit timeout for this
// See: https://github.com/denoland/deno/issues/11133
// Test bug: https://github.com/hasura/ndc-typescript-deno/issues/45
Deno.test("Inferred Dependency Based Result Type", () => {
  const program_path = path.fromFileUrl(import.meta.resolve('./data/pg_dep.ts'));
  const vendor_path = path.fromFileUrl(import.meta.resolve('./vendor'));
  const program_results = infer.programInfo(program_path, vendor_path, false);

  test.assertEquals(program_results, {
    positions: {
      delete_todos: [
        "todo_id",
      ],
      insert_todos: [
        "user_id",
        "todo",
      ],
      insert_user: [
        "user_name",
      ],
    },
    schema: {
      collections: [],
      functions: [],
      procedures: [
        {
          arguments: {
            user_name: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
          name: "insert_user",
          result_type: {
            name: "insert_user_output",
            type: "named",
          },
        },
        {
          arguments: {
            todo: {
              type: {
                name: "String",
                type: "named",
              },
            },
            user_id: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
          name: "insert_todos",
          result_type: {
            name: "insert_todos_output",
            type: "named",
          },
        },
        {
          arguments: {
            todo_id: {
              type: {
                name: "String",
                type: "named",
              },
            },
          },
          name: "delete_todos",
          result_type: {
            name: "String",
            type: "named",
          },
        },
      ],
      scalar_types: {
        String: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
        insert_todos_output: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
        insert_user_output: {
          aggregate_functions: {},
          comparison_operators: {},
          update_operators: {},
        },
      },
      object_types: {},
    }
  });
});
