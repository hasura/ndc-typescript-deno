
import * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.1.0';
import { FunctionPositions, ProgramInfo, programInfo, Struct } from "./infer.ts";
import { resolve } from 'https://deno.land/std@0.201.0/path/resolve.ts';
import { JSONSchemaObject } from "npm:@json-schema-tools/meta-schema";

/**
 * Implementation of the Connector interface for Deno connector.
 * Using https://github.com/hasura/ndc-qdrant/blob/main/src/index.ts as an example.
 */

export type State = {
  info: ProgramInfo,
  functions: any
}

export interface Configuration {
  functions: string,
  port?: number, // Included only for punning Connector.start()
  hostname?: string, // Included only for punning Connector.start()
  schemaMode?: 'READ' | 'INFER',
  schemaLocation?: string,
  vendor?: string,
  preVendor?: boolean,
}

export const CONFIGURATION_SCHEMA: JSONSchemaObject = {
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
      description: 'Perform vendoring prior to inference in a sub-process (default: false)',
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

export const CAPABILITIES_RESPONSE: sdk.CapabilitiesResponse = {
  versions: "^0.1.0",
  capabilities: {
    query: { },
    mutations: { },
  },
};

export const EMPTY_SCHEMA = {
  collections: [],
  functions: [],
  procedures: [],
  object_types: {},
  scalar_types: {},
};

type Payload<X> = {
  function: string,
  args: Struct<X>
}


///////////////////// Helper Functions /////////////////////


/**
 * Performs analysis on the supplied program.
 * Expects that if there are dependencies then they will have been vendored.
 * 
 * @param cmdObj 
 * @returns Schema and argument position information
 */
export function getInfo(cmdObj: Configuration): ProgramInfo {
  const schemaMode = cmdObj.schemaMode || 'INFER';
  switch(schemaMode) {
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
      console.error(`Inferring schema with map location ${cmdObj.vendor}`);
      const info = programInfo(cmdObj.functions, cmdObj.vendor, cmdObj.preVendor);
      const schemaLocation = cmdObj.schemaLocation;
      if(schemaLocation) {
        console.error(`Writing schema to ${cmdObj.schemaLocation}`);
        const infoString = JSON.stringify(info);
        // NOTE: Using sync functions should be ok since they're run on startup.
        Deno.writeTextFileSync(schemaLocation, infoString);
      }
      return info;
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
 * @param positions 
 * @param payload 
 * @returns the result of invocation with no wrapper
 */
async function invoke(functions: any, positions: FunctionPositions, payload: Payload<unknown>): Promise<any> {
  const ident = payload.function;
  const func = functions[ident as any] as any;
  const args = reposition(positions, payload);

  let result = func.apply(null, args);
  if (typeof result === "object" && 'then' in result && typeof result.then === "function") {
    result = await result;
  }
  return result;
}

/**
 * This takes argument position information and a payload of function
 * and named arguments and returns the correctly ordered arguments ready to be applied.
 * 
 * @param functions 
 * @param payload 
 * @returns An array of the function's arguments in the definition order
 */
function reposition<X>(functions: FunctionPositions, payload: Payload<X>): Array<X> {
  const positions = functions[payload.function];

  if(!positions) {
    throw new Error(`Couldn't find function ${payload.function} in schema.`);
  }

  return positions.map(k => payload.args[k]);
}

// TODO: https://github.com/hasura/ndc-typescript-deno/issues/26 Do deeper field recursion once that's available
function pruneFields<X>(func: string, fields: Struct<sdk.Field> | null | undefined, result: Struct<X>): Struct<X> {
  // This seems like a bug to request {} fields when expecting a scalar response...
  // File with engine?
  if(!fields || Object.keys(fields).length == 0) {
    // TODO: https://github.com/hasura/ndc-typescript-deno/issues/21 How to log with SDK?
    console.error(`Warning: No fields present in query for function ${func}.`);
    return result;
  }

  const response: Struct<X> = {};

  for(const [k,v] of Object.entries(fields)) {
    switch(v.type) {
      case 'column':
        response[k] = result[v.column];
        break;
      default:
        console.error(`Function ${func} field of type ${v.type} is not supported.`);
    }
  }

  return response;
}

async function query(
  state: State,
  func: string,
  requestArgs: Struct<unknown>,
  requestFields?: { [k: string]: sdk.Field; } | null | undefined
): Promise<Struct<unknown>> {
  const payload: Payload<unknown> = {
    function: func,
    args: requestArgs
  };
  try {
    const result = await invoke(state.functions, state.info.positions, payload);
    const pruned = pruneFields(func, requestFields, result);
    return pruned;
  } catch(e) {
    throw new sdk.InternalServerError(`Error encountered when invoking function ${func}`, { message: e.message, stack: e.stack });
  }
}

function resolveArguments(
  func: string,
  requestArgs: Struct<sdk.Argument>,
): Struct<unknown> {
  const args = Object.fromEntries(Object.entries(requestArgs).map(([k,v], _i) => {
    switch(v.type) {
      case 'literal':
        return [k, v.value];
      default:
        throw new Error(`Function ${func} argument ${k} of type ${v.type} not supported.`);
    }
  }));
  return args;
}

/**
 * This is exported here so that there only needs to be one reference to the SDK version.
 */
export const start = sdk.start;

/**
 * See https://github.com/hasura/ndc-sdk-typescript for information on these interfaces.
 */
export const connector: sdk.Connector<Configuration, State> = {
  async try_init_state(
      config: Configuration,
      _metrics: unknown
  ): Promise<State> {
    const functionsArg = resolve(config.functions || './functions/index.ts');
    const functionsURL = `file://${functionsArg}`; // NOTE: This is required to run directly from deno.land.
    const functions = await import(functionsURL);
    const info = getInfo(config);
    return {
      functions,
      info
    }
  },

  get_capabilities(_: Configuration): sdk.CapabilitiesResponse {
    return CAPABILITIES_RESPONSE;
  },

  get_configuration_schema(): JSONSchemaObject {
    return CONFIGURATION_SCHEMA;
  },

  make_empty_configuration(): Configuration {
    const conf: Configuration = {
      functions: './functions/index.ts',
      vendor: './vendor'
    };
    return conf;
  },

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/27 Make this add in the defaults
  update_configuration(configuration: Configuration): Promise<Configuration> {
    return Promise.resolve(configuration);
  },

  validate_raw_configuration(configuration: Configuration): Promise<Configuration> {
    return Promise.resolve(configuration);
  },

  get_schema(config: Configuration): Promise<sdk.SchemaResponse> {
    const result = getInfo(config);
    return Promise.resolve(result.schema);
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
    _configuration: Configuration,
    state: State,
    request: sdk.QueryRequest
  ): Promise<sdk.QueryResponse> {
    const args = resolveArguments(request.collection, request.arguments);
    const pruned = await query(state, request.collection, args, request.query.fields);
    return [{
      aggregates: {},
      rows: [{
        '__value': pruned
      }]
    }];
  },

  async mutation(
    _configuration: Configuration,
    state: State,
    request: sdk.MutationRequest
  ): Promise<sdk.MutationResponse> {
    const results: Array<sdk.MutationOperationResults> = [];
    for(const op of request.operations) {
      switch(op.type) {
        case 'procedure': {
          const result = await query(state, op.name, op.arguments, op.fields);
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

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/30 Deprecated
  get_read_regions(_: Configuration): string[] {
    return [];
  },

  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/30 Deprecated
  get_write_regions(_: Configuration): string[] {
    return [];
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
