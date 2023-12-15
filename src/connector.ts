/**
 * Implementation of the Connector interface for Deno connector.
 * Using https://github.com/hasura/ndc-qdrant/blob/main/src/index.ts as an example.
 */

import { FunctionDefinitions, get_ndc_schema, NullOrUndefinability, ObjectTypeDefinitions, ProgramSchema, TypeDefinition } from "./schema.ts";
import { inferProgramSchema, Struct, } from "./infer.ts";
import { resolve } from "https://deno.land/std@0.208.0/path/mod.ts";
import { JSONSchemaObject } from "npm:@json-schema-tools/meta-schema";
import { isArray, unreachable } from "./util.ts";

import * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.5';
export * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.5';

export type State = {
  functions: RuntimeFunctions
}

export type RuntimeFunctions = {
  // deno-lint-ignore ban-types
  [function_name: string]: Function
}

export interface RawConfiguration {
  functions: string,
  port?: number, // Included only for punning Connector.start()
  hostname?: string, // Included only for punning Connector.start()
  schemaMode?: 'READ' | 'INFER',
  schemaLocation?: string,
  vendor?: string,
  preVendor?: boolean,
}

export const RAW_CONFIGURATION_SCHEMA: JSONSchemaObject = {
  description: 'Typescript (Deno) Connector Configuration',
  type: 'object',
  required: [ 'functions' ],
  properties:
  {
    functions: {
      description: 'Location of your functions entrypoint (default: ./functions/index.ts)',
      type: 'string'
    },
    vendor: {
      description: 'Location of dependencies vendor folder (optional)',
      type: 'string'
    },
    preVendor: {
      description: 'Perform vendoring prior to inference in a sub-process (default: true)',
      type: 'boolean'
    },
    schemaMode:  {
      description: 'INFER the schema from your functions, or READ it from a file.',
      type: "string",
      enum: ["READ", "INFER"]
    },
    schemaLocation: {
      description: 'Location of your schema file. schemaMode=READ reads the file, schemaMode=INFER writes the file (optional)',
      type: 'string'
    },
  }
};

type Configuration = {
  inferenceConfig: InferenceConfig,
  programSchema: ProgramSchema,
}

type InferenceConfig = {
  functions: string,
  schemaMode: 'READ' | 'INFER',
  schemaLocation?: string,
  vendorDir: string,
  preVendor: boolean,
}

export const CAPABILITIES_RESPONSE: sdk.CapabilitiesResponse = {
  versions: "^0.1.0",
  capabilities: {
    query: {
      variables: {}
    },
  },
};

type Payload = {
  function: string,
  args: Struct<unknown>
}


///////////////////// Helper Functions /////////////////////


/**
 * Performs analysis on the supplied program.
 * Expects that if there are dependencies then they will have been vendored.
 *
 * @param cmdObj
 * @returns Schema and argument position information
 */
export function getProgramSchema(cmdObj: InferenceConfig): ProgramSchema {
  switch(cmdObj.schemaMode) {
    /**
     * The READ option is available in case the user wants to pre-cache their schema during development.
     */
    case 'READ': {
      if(!cmdObj.schemaLocation) {
        throw new Error('--schema-location is required if using --schema-mode READ');
      }
      console.error(`Reading existing schema: ${cmdObj.schemaLocation}`);
      const bytes = Deno.readFileSync(cmdObj.schemaLocation);
      const decoder = new TextDecoder("utf-8");
      const decoded = decoder.decode(bytes);
      return JSON.parse(decoded);
    }
    case 'INFER': {
      console.error(`Inferring schema with map location ${cmdObj.vendorDir}`);
      const programSchema = inferProgramSchema(cmdObj.functions, cmdObj.vendorDir, cmdObj.preVendor);
      const schemaLocation = cmdObj.schemaLocation;
      if(schemaLocation) {
        console.error(`Writing schema to ${cmdObj.schemaLocation}`);
        const infoString = JSON.stringify(programSchema);
        // NOTE: Using sync functions should be ok since they're run on startup.
        Deno.writeTextFileSync(schemaLocation, infoString);
      }
      return programSchema;
    }
    default:
      throw new Error('Invalid schema-mode. Use READ or INFER.');
  }
}

/**
 * Performs invocation of the requested function.
 * Assembles the arguments into the correct order.
 * This doesn't catch any exceptions.
 *
 * @param functions
 * @param function_definitions
 * @param payload
 * @returns the result of invocation with no wrapper
 */
async function invoke(function_name: string, args: Record<string, unknown>, functions: RuntimeFunctions, program_schema: ProgramSchema): Promise<unknown> {
  const func = functions[function_name];
  const prepared_args = prepare_arguments(function_name, args, program_schema.functions, program_schema.object_types);

  try {
    const result = func.apply(undefined, prepared_args);
    // Resolve the result if it is a promise
    if (typeof result === "object" && 'then' in result && typeof result.then === "function") {
      return await result;
    }
    return result;
  } catch (e) {
    throw new sdk.InternalServerError(`Error encountered when invoking function ${function_name}`, { message: e.message, stack: e.stack });
  }
}

/**
 * This takes argument position information and a payload of function
 * and named arguments and returns the correctly ordered arguments ready to be applied.
 *
 * @param function_definitions
 * @param payload
 * @returns An array of the function's arguments in the definition order
 */
export function prepare_arguments(function_name: string, args: Record<string, unknown>, function_definitions: FunctionDefinitions, object_type_definitions: ObjectTypeDefinitions): unknown[] {
  const function_definition = function_definitions[function_name];

  if(!function_definition) {
    throw new sdk.InternalServerError(`Couldn't find function ${function_name} in schema.`);
  }

  return function_definition.arguments
    .map(argDef => coerce_argument_value(args[argDef.argument_name], argDef.type, [argDef.argument_name], object_type_definitions));
}

function coerce_argument_value(value: unknown, type: TypeDefinition, value_path: string[], object_type_definitions: ObjectTypeDefinitions): unknown {
  switch (type.type) {
    case "array":
      if (!isArray(value))
        throw new sdk.BadRequest(`Unexpected value in function arguments. Expected an array at '${value_path.join(".")}'.`);
      return value.map((element, index) => coerce_argument_value(element, type.element_type, [...value_path, `[${index}]`], object_type_definitions))

    case "nullable":
      if (value === null) {
        return type.null_or_undefinability == NullOrUndefinability.AcceptsUndefinedOnly
          ? undefined
          : null;
      } else if (value === undefined) {
        return type.null_or_undefinability == NullOrUndefinability.AcceptsNullOnly
          ? null
          : undefined;
      } else {
        return coerce_argument_value(value, type.underlying_type, value_path, object_type_definitions)
      }
    case "named":
      if (type.kind === "scalar") {
        // Scalars are currently treated as opaque values, which is a bit dodgy
        return value;
      } else {
        const object_type_definition = object_type_definitions[type.name];
        if (!object_type_definition)
          throw new sdk.InternalServerError(`Couldn't find object type '${type.name}' in the schema`);
        if (value === null || typeof value !== "object") {
          throw new sdk.BadRequest(`Unexpected value in function arguments. Expected an object at '${value_path.join(".")}'.`);
        }
        return Object.fromEntries(object_type_definition.properties.map(property_definition => {
          const prop_value = (value as Record<string, unknown>)[property_definition.property_name];
          return [property_definition.property_name, coerce_argument_value(prop_value, property_definition.type, [...value_path, property_definition.property_name], object_type_definitions)]
        }));
      }
    default:
      return unreachable(type["type"]);
  }
}

// TODO: https://github.com/hasura/ndc-typescript-deno/issues/26 Do deeper field recursion once that's available
function pruneFields(func: string, fields: Struct<sdk.Field> | null | undefined, result: unknown): unknown {
  // This seems like a bug to request {} fields when expecting a scalar response...
  // File with engine?
  if(!fields || Object.keys(fields).length == 0) {
    // TODO: https://github.com/hasura/ndc-typescript-deno/issues/21 How to log with SDK?
    console.error(`Warning: No fields present in query for function ${func}.`);
    return result;
  }

  const response: Struct<unknown> = {};

  if (result === null || Array.isArray(result) || typeof result !== "object") {
    throw new sdk.InternalServerError(`Function '${func}' did not return an object when expected to`);
  }

  for(const [k,v] of Object.entries(fields)) {
    switch(v.type) {
      case 'column':
        response[k] = (result as Record<string, unknown>)[v.column] ?? null; // Coalesce undefined into null to ensure we always have a value for a requested column
        break;
      default:
        console.error(`Function ${func} field of type ${v.type} is not supported.`);
    }
  }

  return response;
}

async function query(
  configuration: Configuration,
  state: State,
  functionName: string,
  requestArgs: Struct<unknown>,
  requestFields: { [k: string]: sdk.Field; } | null,
): Promise<unknown> {
  const result = await invoke(functionName, requestArgs, state.functions, configuration.programSchema);
  return pruneFields(functionName, requestFields, result);
}

function resolveArguments(
  func: string,
  requestArgs: Struct<sdk.Argument>,
  requestVariables: { [k: string]: unknown },
): Struct<unknown> {
  const args = Object.fromEntries(Object.entries(requestArgs).map(([k,v], _i) => {
    const t = v.type;
    switch(t) {
      case 'literal':
        return [k, v.value];
      case 'variable': {
        if(!(v.name in requestVariables)) {
          throw new Error(`Variable ${v.name} not found for function ${func}`);
        }
        const value = requestVariables[v.name];
        return [k, value];
      }
      default:
        return unreachable(t)
    }
  }));
  return args;
}

/**
 * See https://github.com/hasura/ndc-sdk-typescript for information on these interfaces.
 */
export const connector: sdk.Connector<RawConfiguration, Configuration, State> = {
  async try_init_state(
      config: Configuration,
      _metrics: unknown
  ): Promise<State> {
    const functionsArg = config.inferenceConfig.functions;
    const functionsURL = `file://${functionsArg}`; // NOTE: This is required to run directly from deno.land.
    const functions = await import(functionsURL);
    return {
      functions
    }
  },

  get_capabilities(_: Configuration): sdk.CapabilitiesResponse {
    return CAPABILITIES_RESPONSE;
  },

  get_raw_configuration_schema(): JSONSchemaObject {
    return RAW_CONFIGURATION_SCHEMA;
  },

  make_empty_configuration(): RawConfiguration {
    const conf: RawConfiguration = {
      functions: './functions/index.ts',
      vendor: './vendor'
    };
    return conf;
  },

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/27 Make this add in the defaults
  update_configuration(configuration: RawConfiguration): Promise<RawConfiguration> {
    return Promise.resolve(configuration);
  },

  validate_raw_configuration(configuration: RawConfiguration): Promise<Configuration> {
    if (configuration.functions.trim() === "") {
      throw new sdk.BadRequest("'functions' must be set to the location of the TypeScript file that contains your functions")
    }
    if (configuration.schemaMode === "READ" && !configuration.schemaLocation) {
      throw new sdk.BadRequest("'schemaLocation' must be set if 'schemaMode' is READ");
    }
    const inferenceConfig: InferenceConfig = {
      functions: resolve(configuration.functions),
      schemaMode: configuration.schemaMode ?? "INFER",
      preVendor: configuration.preVendor ?? true,
      schemaLocation: configuration.schemaLocation,
      vendorDir: resolve(configuration.vendor || "./vendor"),
    };
    const programSchema = getProgramSchema(inferenceConfig);
    return Promise.resolve({
      inferenceConfig,
      programSchema
    });
  },

  get_schema(config: Configuration): Promise<sdk.SchemaResponse> {
    return Promise.resolve(get_ndc_schema(config.programSchema));
  },

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/28 What do we want explain to do in this scenario?
  explain(
    _configuration: Configuration,
    _: State,
    _request: sdk.QueryRequest
  ): Promise<sdk.ExplainResponse> {
    throw new Error('Implementation of `explain` pending.');
  },

  // NOTE: query and mutation both make all functions available and discrimination is performed by the schema
  async query(
    configuration: Configuration,
    state: State,
    request: sdk.QueryRequest
  ): Promise<sdk.QueryResponse> {

    const rows = [];
    for(const variables of request.variables ?? [{}]) {
      const args = resolveArguments(request.collection, request.arguments, variables);
      const result = await query(configuration, state, request.collection, args, request.query.fields ?? null);
      rows.push({ '__value': result });
    }

    return [{
      aggregates: {},
      rows
    }];
  },

  async mutation(
    configuration: Configuration,
    state: State,
    request: sdk.MutationRequest
  ): Promise<sdk.MutationResponse> {
    const results: Array<sdk.MutationOperationResults> = [];
    for(const op of request.operations) {
      switch(op.type) {
        case 'procedure': {
          const result = await query(configuration, state, op.name, op.arguments, op.fields ?? null);
          results.push({
            affected_rows: 1,
            returning: [{
              '__value': result
            }]
          });
          break;
        }
        default:
          throw new Error(`Mutation type ${op.type} not supported.`);
      }
    }
    return {
      operation_results: results
    }
  },

  // If the connector starts successfully it should be healthy
  health_check(_: Configuration, __: State): Promise<undefined> {
    return Promise.resolve(undefined);
  },

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/29 https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/metrics
  fetch_metrics(_: Configuration, __: State): Promise<undefined> {
    return Promise.resolve(undefined);
  },
};
