
import * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.1.0';
import { FunctionPositions, ProgramInfo, programInfo, Struct } from "./infer.ts";
import { resolve } from 'https://deno.land/std@0.201.0/path/resolve.ts';

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
  port?: number, // Is this hard-coded in start?
  hostname?: string,
  schemaMode?: 'READ' | 'INFER',
  schemaLocation?: string,
  vendor?: string
}

export const CONFIGURATION_SCHEMA: unknown = { }; // Could get this from @json-schema-tools/meta-schema

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



/**
 * Helper functions
 */

// TODO: Consider making this async
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
      const info = programInfo(cmdObj.functions, cmdObj.vendor); // TODO: entrypoint param
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
 * @param payload such as {function: "concat", args: ["hello", " ", "world"]}
 * @returns 
 */
async function invoke(functions: any, positions: FunctionPositions, payload: Payload<unknown>): Promise<any> {
  const ident = payload.function;
  const func = functions[ident as any] as any;
  const args = reposition(positions, payload);
  // TODO: Exception handling.
  let result = func.apply(null, args);
  if (typeof result === "object" && 'then' in result && typeof result.then === "function") {
    result = await result;
  }
  return result;
}

type Payload<X> = {
  function: string,
  args: Struct<X>
}

function reposition<X>(functions: FunctionPositions, payload: Payload<X>): Array<X> {
  const positions = functions[payload.function];

  if(!positions) {
    throw new Error(`Couldn't find function ${payload.function} in schema.`);
  }

  return positions.map(k => payload.args[k]);
}

// TODO: Do deeper field recursion once that's available
function pruneFields<X>(func: string, fields: Struct<sdk.Field> | null | undefined, result: Struct<X>): Struct<X> {
  // This seems like a bug to request {} fields when expecting a scalar response...
  // File with engine?
  if(!fields || Object.keys(fields).length == 0) {
    // TODO: How to log with SDK?
    console.error(`Warning: No fields present in query for function ${func}.`); // TODO: Add context for which function is being called
    return result;
  }

  const response: Struct<X> = {};

  for(const [k,v] of Object.entries(fields)) {
    switch(v.type) {
      case 'column':
        response[k] = result[v.column];
        break;
      default:
        console.error(`field of type ${v.type} is not supported.`); // TODO: Add context for which function is being called
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
    const functionsArg = config.functions || './functions/index.ts'; // TODO: Resolve this upstream or in a helper.
    const resolvedFunctionsPath = resolve(functionsArg); // Makes relative to CWD instead of the source
    const functions = await import(resolvedFunctionsPath);
    const info = getInfo(config);
    return {
      functions,
      info
    }
  },

  get_capabilities(_: Configuration): sdk.CapabilitiesResponse {
    return CAPABILITIES_RESPONSE;
  },

  get_configuration_schema(): any {
    return CONFIGURATION_SCHEMA;
  },

  make_empty_configuration(): Configuration {
    const conf: Configuration = {
      functions: './functions/index.ts',
      vendor: './functions/vendor'
    };
    return conf;
  },

  // TODO: Does this add in the defaults?
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

  // TODO: What do we want explain to do in this scenario?
  explain(
    _configuration: Configuration,
    _: State,
    _request: sdk.QueryRequest
  ): Promise<sdk.ExplainResponse> {
    throw new Error('TODO: Implement `explain`.');
  },

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

  // TODO: Deprecated
  get_read_regions(_: Configuration): string[] {
    return [];
  },

  // TODO: Deprecated
  get_write_regions(_: Configuration): string[] {
    return [];
  },

  // TODO: https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/healthz
  health_check(_: Configuration, __: State): Promise<undefined> {
    return Promise.resolve(undefined);
  },

  // TODO: https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/metrics
  fetch_metrics(_: Configuration, __: State): Promise<undefined> {
    return Promise.resolve(undefined);
  },
};
