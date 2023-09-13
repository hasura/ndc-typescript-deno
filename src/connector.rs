use std::fmt::Display;
use std::io;
use std::path::Path;

use async_trait::async_trait;
use indexmap::IndexMap;
use serde_derive::{Deserialize, Serialize};
use url::Url;
use std::fs::read_to_string;

use ndc_hub::connector::{self, QueryError};
use ndc_hub::models::{self, RowFieldValue};

#[derive(Clone, Default)]
pub struct TypescriptConnector;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
#[serde(untagged)]
pub enum TypescriptSource {
    Static(String),
    FromUrl { url: Url },
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct RawConfiguration {
    pub typescript_source: Option<TypescriptSource>,
    pub schema_location: Option<String>, // Is there a better path type for this?
    pub deno_deployment_url: Option<String>,
}

impl Default for RawConfiguration {
    fn default() -> RawConfiguration {
        RawConfiguration {
            typescript_source: None,
            schema_location: None,
            deno_deployment_url: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct InputFunctionArgumentPositions {
    functions: Vec<InputFunctionInfo>
}

impl InputFunctionArgumentPositions {
    fn fix(&self) -> FunctionArgumentPositions {
        let mut functions = IndexMap::new();

        for f in self.functions.clone() {

            let mut arguments = IndexMap::new();

            for (k, v) in f.arguments.iter() {
                arguments.insert(k.clone(), v.position);
            }

            functions.insert(f.name, ArgumentPositions { arguments });
        }

        FunctionArgumentPositions { functions }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct InputFunctionInfo {
    name: String,
    arguments: IndexMap<String, InputArugmentInfo>
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct InputArugmentInfo {
    position: u32
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct ArgumentPositions {
    arguments: IndexMap<String, u32>
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct FunctionArgumentPositions {
    functions: IndexMap<String, ArgumentPositions>
}

impl FunctionArgumentPositions {
    fn get(&self, func_name: &str, arg_name: &str) -> Option<u32> {
        if let Some(f) = self.functions.get(func_name) {
            if let Some(a) = f.arguments.get(arg_name) {
                return Some(*a);
            }
        }
        None
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, schemars::JsonSchema)]
pub struct Configuration {
    pub deno_deployment_url: Url,
    pub schema: models::SchemaResponse,
    pub function_argument_positions: FunctionArgumentPositions,
}

#[derive(Clone, Debug)]
pub struct State {
    http_client: reqwest::Client,
}

#[async_trait]
impl connector::Connector for TypescriptConnector {
    type RawConfiguration = RawConfiguration;
    type Configuration = Configuration;
    type State = State;

    fn make_empty_configuration() -> Self::RawConfiguration {
        RawConfiguration::default()
    }

    async fn update_configuration(
        config: &Self::RawConfiguration,
    ) -> Result<Self::RawConfiguration, connector::UpdateConfigurationError> {
        Ok(config.clone())
    }

    async fn validate_raw_configuration(
        configuration: &Self::RawConfiguration,
    ) -> Result<Self::Configuration, connector::ValidateError> {

        // Why so many clones?
        let schema_location = configuration.schema_location.clone().unwrap_or("/schema.json".to_string());
        let schema_and_function_arguments = 
            read_schema(schema_location.clone())
                .map_err(|err| mk_single_validate_error("/schema.json", &format!("Couldn't read schema from {}: {}", schema_location.clone(), err)))?;

        let schema = schema_and_function_arguments.0;
        let function_argument_positions = schema_and_function_arguments.1;

        let deno_deployment_url_string = configuration.deno_deployment_url.clone().unwrap_or( "http://localhost:8000".to_string());

        let deno_deployment_url = Url::parse(&deno_deployment_url_string)
            .map_err(|_err| mk_single_validate_error("deno_deployment_url", "Couldn't parse deno deployment url."))?;

        Ok(Configuration {
            deno_deployment_url,
            schema,
            function_argument_positions
        })
    }

    async fn try_init_state(
        _configuration: &Self::Configuration,
        _metrics: &mut prometheus::Registry,
    ) -> Result<Self::State, connector::InitializationError> {
        Ok(State {
            http_client: reqwest::Client::new(),
        })
    }

    fn fetch_metrics(
        _configuration: &Self::Configuration,
        _state: &Self::State,
    ) -> Result<(), connector::FetchMetricsError> {
        todo!()
    }

    async fn health_check(
        _configuration: &Self::Configuration,
        _state: &Self::State,
    ) -> Result<(), connector::HealthError> {
        todo!()
    }

    async fn get_capabilities() -> models::CapabilitiesResponse {
        models::CapabilitiesResponse {
            versions: "^0.1.0".into(),
            capabilities: models::Capabilities {
                query: None,
                explain: None,
                mutations: None,
                relationships: None,
            },
        }
    }

    async fn get_schema(
        configuration: &Self::Configuration,
    ) -> Result<models::SchemaResponse, connector::SchemaError> {
        Ok(configuration.schema.clone())
    }

    async fn explain(
        _configuration: &Self::Configuration,
        _state: &Self::State,
        _request: models::QueryRequest,
    ) -> Result<models::ExplainResponse, connector::ExplainError> {
        todo!()
    }

    async fn mutation(
        _configuration: &Self::Configuration,
        _state: &Self::State,
        _request: models::MutationRequest,
    ) -> Result<models::MutationResponse, connector::MutationError> {
        todo!()
    }

    async fn query(
        configuration: &Self::Configuration,
        state: &Self::State,
        request: models::QueryRequest,
    ) -> Result<models::QueryResponse, connector::QueryError> {
        let function_name = request.collection;

        // Note: The arg names that are passed in here are actually indexed by the name suffix
        let mut indexed_args = request
            .arguments
            .into_iter()
            .map(|(arg_name, argument)| eval_argument(arg_name, argument))
            .collect::<Result<Vec<_>,_>>()?;

        indexed_args.sort_by_key(|(argument_name, _)| configuration.function_argument_positions.get(&function_name, argument_name));
        // indexed_args.sort_by_key(|(i, _)| arg_positions[function_name][arg_name]);

        let args = indexed_args.into_iter().map(|(_, v)| v).collect();

        let request_body = FunctionInvocation {
            function_name,
            args,
        };
        let http_response = state
            .http_client
            .post(configuration.deno_deployment_url.clone())
            .json(&request_body)
            .send()
            .await
            .map_err(|err| QueryError::Other(Box::new(err)))?;

        let response = http_response
            .json::<serde_json::Value>()
            .await
            .map_err(|err| QueryError::Other(Box::new(err)))?;

        let rows: Vec<IndexMap<String, RowFieldValue>> = match response {
            serde_json::Value::Array(arr) => arr
                .into_iter()
                .map(|v| match v {
                    serde_json::Value::Object(obj) => {
                        IndexMap::from_iter(obj.into_iter().map(|(s, v)| (s, RowFieldValue(v))))
                    }
                    _ => IndexMap::from_iter([("value".into(), RowFieldValue(v))]),
                })
                .collect(),
            serde_json::Value::Object(obj) => vec![IndexMap::from_iter(
                obj.into_iter().map(|(s, v)| (s, RowFieldValue(v))),
            )],
            _ => vec![IndexMap::from_iter([(
                "value".into(),
                RowFieldValue(response),
            )])],
        };

        Ok(models::QueryResponse(vec![models::RowSet {
            aggregates: None,
            rows: Some(rows),
        }]))
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FunctionInvocation {
    function_name: String,
    args: Vec<serde_json::Value>,
}

fn eval_argument(arg_name: String, arg: models::Argument) -> Result<(String, serde_json::Value), QueryError> {
    match arg {
        models::Argument::Literal { value } => Ok((arg_name, value)),
        models::Argument::Variable { .. } => Err(QueryError::UnsupportedOperation("Variables in arguments not supported".to_owned())),
    }
}

fn mk_single_validate_error(key: &str, message: &str) -> connector::ValidateError {
    let errs = vec![connector::InvalidRange {
        path: vec![connector::KeyOrIndex::Key(String::from(key))],
        message: String::from(message),
    }];
    connector::ValidateError::ValidateError(errs)
}

fn read_schema<P: AsRef<Path> + Display + Clone>(
    path: P
) -> Result<(models::SchemaResponse, FunctionArgumentPositions), Box<std::io::Error>> {
    
    let file_contents = read_to_string(path.clone())
        .map_err(|err| {
            // TODO: Format the path into the message rather than hardcoding the file
            let message = format!("Could not open {}: {}", path, err);
            let err = io::Error::new(io::ErrorKind::Other, message);
            Box::new(err)
        })?;

    let schema: models::SchemaResponse = serde_json::from_str(&file_contents)
        .map_err(|err| {
            let message = format!("functions.ts.schema.json should be valid SchemaResponse: {}", err);
            let err = io::Error::new(io::ErrorKind::Other, message);
            Box::new(err)
        })?;
    
    let positions_vector: InputFunctionArgumentPositions = serde_json::from_str(&file_contents)
        .map_err(|err| {
            let message = format!("functions.ts.schema.json should be valid FunctionArgumentPositions: {}", err);
            let err = io::Error::new(io::ErrorKind::Other, message);
            Box::new(err)
        })?;
    
    Ok((schema, positions_vector.fix()))
}
