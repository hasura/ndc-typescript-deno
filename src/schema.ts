import * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.5';
import { mapObjectValues, unreachable } from "./util.ts";

export type ProgramSchema = {
  functions: FunctionDefinitions
  object_types: ObjectTypeDefinitions
  scalar_types: ScalarTypeDefinitions
}

export type FunctionDefinitions = {
  [function_name: string]: FunctionDefinition
}

export type FunctionDefinition = {
  ndc_kind: FunctionNdcKind
  description: string | null,
  arguments: ArgumentDefinition[] // Function arguments are ordered
  result_type: TypeDefinition
}

export enum FunctionNdcKind {
  Function = "Function",
  Procedure = "Procedure"
}

export type ArgumentDefinition = {
  argument_name: string,
  description: string | null,
  type: TypeDefinition
}

export type ObjectTypeDefinitions = {
  [object_type_name: string]: ObjectTypeDefinition
}

export type ObjectTypeDefinition = {
  properties: ObjectPropertyDefinition[]
}

export type ObjectPropertyDefinition = {
  property_name: string,
  type: TypeDefinition,
}

export type ScalarTypeDefinitions = {
  [scalar_type_name: string]: ScalarTypeDefinition
}

export type ScalarTypeDefinition = Record<string, never> // Empty object, for now

export type TypeDefinition = ArrayTypeDefinition | NullableTypeDefinition | NamedTypeDefinition

export type ArrayTypeDefinition = {
  type: "array"
  element_type: TypeDefinition
}

export type NullableTypeDefinition = {
  type: "nullable",
  null_or_undefinability: NullOrUndefinability
  underlying_type: TypeDefinition
}

export type NamedTypeDefinition = {
  type: "named"
  name: string
  kind: "scalar" | "object"
}

export enum NullOrUndefinability {
  AcceptsNullOnly = "AcceptsNullOnly",
  AcceptsUndefinedOnly = "AcceptsUndefinedOnly",
  AcceptsEither = "AcceptsEither",
}

export function get_ndc_schema(programInfo: ProgramSchema): sdk.SchemaResponse {
  const functions = Object.entries(programInfo.functions);

  const object_types = mapObjectValues(programInfo.object_types, obj_def => {
    return {
      fields: Object.fromEntries(obj_def.properties.map(prop_def => [prop_def.property_name, { type: convert_type_definition_to_sdk_type(prop_def.type)}]))
    }
  });

  const scalar_types = mapObjectValues(programInfo.scalar_types, _scalar_def => {
    return {
      aggregate_functions: {},
      comparison_operators: {},
    }
  })

  return {
    functions: functions
      .filter(([_, def]) => def.ndc_kind === FunctionNdcKind.Function)
      .map(([name, def]) => convert_function_definition_to_sdk_schema_type(name, def)),
    procedures: functions
      .filter(([_, def]) => def.ndc_kind === FunctionNdcKind.Procedure)
      .map(([name, def]) => convert_function_definition_to_sdk_schema_type(name, def)),
    collections: [],
    object_types,
    scalar_types,
  }
}

function convert_type_definition_to_sdk_type(typeDef: TypeDefinition): sdk.Type {
  switch (typeDef.type) {
    case "array": return { type: "array", element_type: convert_type_definition_to_sdk_type(typeDef.element_type) }
    case "nullable": return { type: "nullable", underlying_type: convert_type_definition_to_sdk_type(typeDef.underlying_type) }
    case "named": return { type: "named", name: typeDef.name }
    default: return unreachable(typeDef["type"])
  }
}

function convert_function_definition_to_sdk_schema_type(function_name: string, definition: FunctionDefinition): sdk.FunctionInfo | sdk.ProcedureInfo {
  const args =
    definition.arguments
      .map(arg_def =>
        [ arg_def.argument_name,
          {
            type: convert_type_definition_to_sdk_type(arg_def.type),
            ...(arg_def.description ? { description: arg_def.description } : {}),
          }
        ]
      );

  return {
    name: function_name,
    arguments: Object.fromEntries(args),
    result_type: convert_type_definition_to_sdk_type(definition.result_type),
    ...(definition.description ? { description: definition.description } : {}),
  }
}

/**
 * Logs simple listing of functions/procedures on stderr.
 *
 * @param prompt
 * @param functionDefinitions
 * @param info
 */
export function listing(functionNdcKind: FunctionNdcKind, functionDefinitions: FunctionDefinitions) {
  const functions = Object.entries(functionDefinitions).filter(([_, def]) => def.ndc_kind === functionNdcKind);
  if (functions.length > 0) {
    console.error(``);
    console.error(`${functionNdcKind}s:`)
    for (const [function_name, function_definition] of functions) {
      const args = function_definition.arguments.join(', ');
      console.error(`* ${function_name}(${args})`);
    }
    console.error(``);
  }
}
