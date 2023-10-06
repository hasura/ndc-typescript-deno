
import { CapabilitiesResponse, Connector, ExplainResponse, FunctionInfo, MutationRequest, MutationResponse, QueryRequest, QueryResponse, ScalarType, SchemaResponse, Type } from 'npm:@hasura/ndc-sdk-typescript@1.0.0';

/**
 * Implementation of the Connector interface for Deno connector.
 * Using https://github.com/hasura/ndc-qdrant/blob/main/src/index.ts as an example.
 */

export interface Configuration {
  functions_location?: string,
  schema?: SchemaResponse,
  schema_location?: string,
  vendor_location?: string
}
export interface State { }
export const CONFIGURATION_SCHEMA: unknown = { } // Could get this from @json-schema-tools/meta-schema
export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
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
 * See https://github.com/hasura/ndc-sdk-typescript for information on these interfaces.
 */
const connector: Connector<Configuration, State> = {
  try_init_state(
      _: Configuration,
      __: unknown
  ): Promise<State> {
      return Promise.resolve({});
  },

  get_capabilities(_: Configuration): CapabilitiesResponse {
      return CAPABILITIES_RESPONSE;
  },

  get_configuration_schema(): any {
      return CONFIGURATION_SCHEMA;
  },

  make_empty_configuration(): Configuration {
      const conf: Configuration = { };
      return conf;
  },

  update_configuration(configuration: Configuration): Promise<Configuration> {
      // Do nothing for now.
      return Promise.resolve(configuration);
  },

  validate_raw_configuration( configuration: Configuration): Promise<Configuration> {
      return Promise.resolve(configuration);
  },

  get_schema(_configuration: Configuration): SchemaResponse {
    // TODO: read or infer based on presence of schema or schema_location in configuration
    return EMPTY_SCHEMA;
  },

  explain(
      _configuration: Configuration,
      _: State,
      _request: QueryRequest
  ): Promise<ExplainResponse> {
    throw new Error('TODO: Implement `explain`.');
  },

  query(
      _configuration: Configuration,
      _: State,
      _request: QueryRequest
  ): Promise<QueryResponse> {
    throw new Error('TODO: Implement `query`.')
  },

  mutation(
      _configuration: Configuration,
      _state: State,
      _request: MutationRequest
  ): Promise<MutationResponse> {
      throw new Error('TODO: Implement `mutation`.');
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
