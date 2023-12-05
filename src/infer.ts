
/**
 * This module provides the inference implementation for the connector.
 * It relies on the Typescript compiler to perform the heavy lifting.
 *
 * The exported function that is intended for use is `inferProgramSchema`.
 *
 * Dependencies are required to be vendored before invocation.
 */

import ts, { FunctionDeclaration, StringLiteralLike } from "npm:typescript@5.1.6";
import { resolve, dirname } from "https://deno.land/std@0.208.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.208.0/fs/mod.ts";
import * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.5';
import { mapObject, mapObjectValues, unreachable } from "./util.ts";

export type Struct<X> = Record<string, X>;

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
            description: definition.description ?? undefined,
            type: convert_type_definition_to_sdk_type(arg_def.type)
          }
        ]
      );

  return {
    name: function_name,
    arguments: Object.fromEntries(args),
    result_type: convert_type_definition_to_sdk_type(definition.result_type),
    description: definition.description ?? undefined,
  }
}

const scalar_mappings: {[key: string]: string} = {
  "string": "String",
  "bool": "Boolean",
  "boolean": "Boolean",
  "number": "Float",
  "arraybuffer": "ArrayBuffer", // Treat ArrayBuffer as scalar since it shouldn't recur
  "blob": "Blob",               // Treat ArrayBuffer as scalar since it shouldn't recur
  // "void": "Void",            // Void type can be included to permit void types as scalars
};

// TODO: https://github.com/hasura/ndc-typescript-deno/issues/21 Use standard logging from SDK
const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "INFO";
const DEBUG = LOG_LEVEL == 'DEBUG';
const MAX_INFERENCE_RECURSION = 20; // Better to abort than get into an infinite loop, this could be increased if required.

function gql_name(n: string): string {
  // Construct a GraphQL complient name: https://spec.graphql.org/draft/#sec-Type-Name-Introspection
  // Check if this is actually required.
  return n.replace(/^[^a-zA-Z]/, '').replace(/[^0-9a-zA-Z]/g,'_');
}

function qualify_type_name(root_file: string, t: any, name: string): string {
  let symbol = t.getSymbol();

  if (!symbol) {
    try {
      symbol = t.types[0].getSymbol();
    } catch {
      throw new Error(`Couldn't find symbol for type ${name}`);
    }
  }

  const locations = symbol.declarations.map((d: ts.Declaration) => d.getSourceFile());
  for(const f of locations) {
    const where = f.fileName;
    const short = where.replace(dirname(root_file) + '/','').replace(/\.ts$/, '');

    // If the type is present in the entrypoint, don't qualify the name
    // If it is under the entrypoint's directory qualify with the subpath
    // Otherwise, use the minimum ancestor of the type's location to ensure non-conflict
    if(root_file == where) {
      return name;
    } else if (short.length < where.length) {
      return `${gql_name(short)}_${name}`;
    } else {
      throw new Error(`Unsupported location for type ${name} in ${where}`);
    }
  }

  throw new Error(`Couldn't find any declarations for type ${name}`);
}

function validate_type(root_file: string, checker: ts.TypeChecker, object_type_definitions: ObjectTypeDefinitions, scalar_type_definitions: ScalarTypeDefinitions, name: string, ty: any, depth: number): TypeDefinition {
  const type_str = checker.typeToString(ty);
  const type_name = ty.symbol?.escapedName || ty.intrinsicName || 'unknown_type';
  const type_name_lower: string = type_name.toLowerCase();

  if(depth > MAX_INFERENCE_RECURSION) {
    throw_error(`Schema inference validation exceeded depth ${MAX_INFERENCE_RECURSION} for type ${type_str}`);
  }

  // PROMISE
  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/32 There is no recursion that resolves inner promises.
  //       Nested promises should be resolved in the function definition.
  // TODO: promises should not be allowed in parameters
  if (type_name == "Promise") {
    const inner_type = ty.resolvedTypeArguments[0];
    const inner_type_result = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, name, inner_type, depth + 1);
    return inner_type_result;
  }

  // ARRAY
  if (checker.isArrayType(ty)) {
    const inner_type = ty.resolvedTypeArguments[0];
    const inner_type_result = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, `Array_of_${name}`, inner_type, depth + 1);
    return { type: 'array', element_type: inner_type_result };
  }

  const not_nullable_result = unwrap_nullable_type(ty);
  if (not_nullable_result !== null) {
    const [not_nullable_type, null_or_undefinability] = not_nullable_result;
    const not_nullable_type_result = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, `Array_of_${name}`, not_nullable_type, depth + 1);
    return { type: "nullable", underlying_type: not_nullable_type_result, null_or_undefinability: null_or_undefinability }
  }

  // Named SCALAR
  if (scalar_mappings[type_name_lower]) {
    const type_name_gql = scalar_mappings[type_name_lower];
    scalar_type_definitions[type_name_gql] = {};
    return { type: 'named', name: type_name_gql, kind: "scalar" };
  }

  // OBJECT
  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/33 There should be a library function that allows us to check this case
  const info = get_object_type_info(root_file, checker, ty, name);
  if (info) {
    const type_str_qualified = info.type_name;

    // Shortcut recursion if the type has already been named
    if (object_type_definitions[type_str_qualified]) {
      return { type: 'named', name: type_str_qualified, kind: "object" };
    }

    object_type_definitions[type_str_qualified] = { properties: [] }; // Break infinite recursion

    const properties = Array.from(info.members, ([property_name, property_type]) => {
      const property_type_validated = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, `${name}_field_${property_name}`, property_type, depth + 1);
      return { property_name, type: property_type_validated };
    });

    object_type_definitions[type_str_qualified] = { properties }

    return { type: 'named', name: type_str_qualified, kind: "object" }
  }

  // TODO: We could potentially support classes, but only as return types, not as function arguments
  if ((ty.objectFlags & ts.ObjectFlags.Class) !== 0) {
    console.error(`class types are not supported: ${name}`);
    throw_error('validate_type failed');
  }

  if (ty === checker.getVoidType()) {
    console.error(`void functions are not supported: ${name}`);
    throw_error('validate_type failed');
  }

  // UNHANDLED: Assume that the type is a scalar
  console.error(`Unable to validate type of ${name}: ${type_str} (${type_name}). Assuming that it is a scalar type.`);
  scalar_type_definitions[name] = {};
  return { type: 'named', name, kind: "scalar" };
}

/**
 * Executes `deno vendor` in a subprocess as a conveneience.
 *
 * @param vendorPath
 * @param filename
 */
function pre_vendor(vendorPath: string, filename: string) {
  // Exampe taken from:
  // https://docs.deno.com/runtime/tutorials/subprocess
  const deno_exec_path = Deno.execPath();
  const vendor_args = [ "vendor", "--node-modules-dir", "--output", vendorPath, "--force", filename ];

  console.error(`Vendoring dependencies: ${[deno_exec_path, ...vendor_args].join(" ")}`);

  const vendor_command = new Deno.Command(deno_exec_path, { args: vendor_args });
  const { code, stdout, stderr } = vendor_command.outputSync();

  if(code !== 0) {
    console.error(`Error: Got code ${code} during deno vendor operation.`)
    console.error(`stdout: ${new TextDecoder().decode(stdout)}`);
    console.error(`stderr: ${new TextDecoder().decode(stderr)}`);
    throw_error('pre_vendor failed');
  }
}

function throw_error(message: string): never {
  throw new Error(message);
}

/**
 * Logs simple listing of functions/procedures on stderr.
 *
 * @param prompt
 * @param functionDefinitions
 * @param info
 */
function listing(functionNdcKind: FunctionNdcKind, functionDefinitions: FunctionDefinitions) {
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

/**
 * Returns the flags associated with a type.
 */
function which_flags(flags_enum: Record<string, string | number>, value: number): string[] {
  return Object
    .keys(flags_enum)
    .flatMap(k => {
      const k_int = parseInt(k);
      return isNaN(k_int)
        ? []
        : (value & k_int) !== 0
          ? [flags_enum[k] as string]
          : []
    });
}

type ObjectTypeInfo = {
  // The qualified name of the type
  type_name: string,
  // Parameter types used with this type in positional order
  generic_parameter_types: readonly ts.Type[]
  // The member properties of the object type. The types are
  // concrete types after type parameter resolution
  members: Map<string, ts.Type>
}

function get_members(checker: ts.TypeChecker, ty: ts.Type, member_names: string[]) {
  return new Map(
    member_names.map(name => [name, checker.getTypeOfSymbol(checker.getPropertyOfType(ty, name)!)])
  )
}

function get_object_type_info(root_file: string, checker: ts.TypeChecker, ty: any, contextual_name: string): ObjectTypeInfo | null {
  // Anonymous object type - this covers:
  // - {a: number, b: string}
  // - type Bar = { test: string }
  // - type GenericBar<T> = { data: T }
  if ((ty.objectFlags & ts.ObjectFlags.Anonymous) !== 0) {
    const members =
      ty.aliasTypeArguments !== undefined
        ? ty.target.members
        : ty.members;
    return {
      type_name: qualify_type_name(root_file, ty, ty.aliasSymbol ? checker.typeToString(ty) : contextual_name),
      generic_parameter_types: ty.aliasTypeArguments ?? [],
      members: get_members(checker, ty, Array.from(members.keys())),
    }
  }
  // Interface type - this covers:
  // interface IThing { test: string }
  else if ((ty.objectFlags & ts.ObjectFlags.Interface) !== 0) {
    return {
      type_name: ty.symbol.escapedName,
      generic_parameter_types: [],
      members: get_members(checker, ty, Array.from(ty.members.keys())),
    }
  }
  // Generic interface type - this covers:
  // interface IGenericThing<T> { data: T }
  else if ((ty.objectFlags & ts.ObjectFlags.Reference) !== 0 && (ty.target.objectFlags & ts.ObjectFlags.Interface) !== 0 && checker.isArrayType(ty) == false && ty.symbol.escapedName !== "Promise") {
    return {
      type_name: ty.symbol.escapedName,
      generic_parameter_types: ty.typeArguments,
      members: get_members(checker, ty, Array.from(ty.target.members.keys())),
    }
  }
  // Intersection type - this covers:
  // - { num: number } & Bar
  // - type IntersectionObject = { wow: string } & Bar
  // - type GenericIntersectionObject<T> = { data: T } & Bar
  else if ((ty.flags & ts.TypeFlags.Intersection) !== 0) {
    return {
      type_name: qualify_type_name(root_file, ty, ty.aliasSymbol ? checker.typeToString(ty) : contextual_name),
      generic_parameter_types: ty.aliasTypeArguments ?? [],
      members: new Map(ty.resolvedProperties.map((symbol: ts.Symbol) => [symbol.name, checker.getTypeOfSymbol(symbol)])),
    }
  }

  return null;
}

function unwrap_nullable_type(ty: ts.Type): [ts.Type, NullOrUndefinability] | null {
  if (!ty.isUnion()) return null;

  const isNullable = ty.types.find(is_null_type) !== undefined;
  const isUndefined = ty.types.find(is_undefined_type) !== undefined;
  const nullOrUndefinability =
    isNullable
      ? isUndefined
        ? NullOrUndefinability.AcceptsEither
        : NullOrUndefinability.AcceptsNullOnly
      : isUndefined
        ? NullOrUndefinability.AcceptsUndefinedOnly
        : null;

  const typesWithoutNullAndUndefined = ty.types
    .filter(t => !is_null_type(t) && !is_undefined_type(t));

  return typesWithoutNullAndUndefined.length === 1 && nullOrUndefinability
    ? [typesWithoutNullAndUndefined[0], nullOrUndefinability]
    : null;
}

function is_null_type(ty: ts.Type): boolean {
  return (ty.flags & ts.TypeFlags.Null) !== 0;
}
function is_undefined_type(ty: ts.Type): boolean {
  return (ty.flags & ts.TypeFlags.Undefined) !== 0;
}

export function inferProgramSchema(filename: string, vendorPath: string, perform_vendor: boolean): ProgramSchema {
  // TODO: https://github.com/hasura/ndc-typescript-deno/issues/27 This should have already been established upstream
  const importMapPath = `${vendorPath}/import_map.json`;
  let pathsMap: {[key: string]: Array<string>} = {};

  // NOTE: We can't just move this inside the else branch of the exists importMap check
  //       Since the dependencies may change when updating your functions.
  if(perform_vendor) {
    pre_vendor(vendorPath, filename);
  }

  if (existsSync(importMapPath)) {
    const importString = Deno.readTextFileSync(importMapPath);
    const vendorMap = JSON.parse(importString);
    pathsMap = mapObject(vendorMap.imports, (k: string, v: string) => {
      if(/\.ts$/.test(k)) {
        return [k, [ v.replace(/./, vendorPath) ]];
      } else {
        return [k.replace(/$/,'*'), [ v.replace(/./, vendorPath).replace(/$/, '*') ]];
      }
    });
  } else {
    // NOTE: We allow the import map to be optional but dependency lookup will fail if it was required.
    console.error(`Couldn't find import map: ${importMapPath}`);
  }

  const deno_d_ts = Deno.makeTempFileSync({ suffix: ".d.ts" });
  Deno.writeTextFileSync(deno_d_ts, `
  /**
   * This module exists to be included as a library by the typescript compiler in infer.ts.
   * The reason for this is that the user is likely to use the Deno dev tools when developing their functions.
   * And they will have Deno in scope.
   * This ensures that these references will typecheck correctly in infer.ts.
   */

  export {};

  declare global {
    var Deno: any
  }
  `);

  const compilerOptions: ts.CompilerOptions = {
    // This should match the version targeted in the deno version that is being used.
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    noImplicitAny: true,
    // NOTE: We just declare Deno globally as any in order to allow users to omit it's declaration in their function files
    //       This should ideally use the real deno type definitions.
    lib: ['lib.d.ts', 'lib.es2022.d.ts',  resolve(deno_d_ts)],
    allowJs: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    baseUrl: '.',
    paths: pathsMap,
    strictNullChecks: true,
  };

  const host = ts.createCompilerHost(compilerOptions);
  host.resolveModuleNameLiterals = (moduleLiterals: StringLiteralLike[], containingFile: string): ts.ResolvedModuleWithFailedLookupLocations[] => {
    return moduleLiterals.map(moduleName => {
      let moduleNameToResolve = moduleName.text;
      // If this looks like a Deno "npm:pkgName[@version][/path]" module import, extract the node module
      // name and resolve that instead. So long as we've done a deno vendor with --node-modules-dir
      // then we'll have a node_modules directory that the standard TypeScript module resolution
      // process can locate the npm package in by its name
      const npmDepMatch = /^npm:(?<pkgName>(?:@.+?\/)?[^/\n]+?)(?:@.+)?(?:\/.+)?$/.exec(moduleName.text);
      if (npmDepMatch) {
        moduleNameToResolve = npmDepMatch.groups?.pkgName!;
      }

      return ts.resolveModuleName(moduleNameToResolve, containingFile, compilerOptions, { fileExists: host.fileExists, readFile: host.readFile });
    })
  }

  const program = ts.createProgram([filename], compilerOptions, host);

  Deno.removeSync(deno_d_ts);

  // These diagnostic codes are ignored because Deno ignores them
  // See: https://github.com/denoland/deno/blob/bf42467e215b20b36ec6b4bf30212e4beb2dd01f/cli/tsc/99_main_compiler.js#L441
  const ignoredDiagnosticCodes = [1452, 2306, 2688, 2792, 5009, 5055, 5070, 7016];
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
  if (diagnostics.length) {
    let fatal = 0;
    console.error(`There were ${diagnostics.length} diagnostic errors.`);
    diagnostics.filter(d => !ignoredDiagnosticCodes.includes(d.code)).forEach(diagnostic => {
      if (diagnostic.file) {
        let errorPrefix = "";
        const isFatal = !resolve(diagnostic.file.fileName).startsWith(vendorPath)
        if (isFatal) {
          fatal++;
          errorPrefix = "FATAL: "
        }
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.error(`${errorPrefix}${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.error(`FATAL: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
        fatal++;
      }
    });

    if(fatal > 0) {
      throw_error(`Fatal errors: ${fatal}`);
    }
  }

  const checker = program.getTypeChecker();

  const object_type_definitions: ObjectTypeDefinitions = {};
  const function_definitions: FunctionDefinitions = {};
  const scalar_type_definitions: ScalarTypeDefinitions = {};

  function isExported(node: FunctionDeclaration): boolean {
    for(const mod of node.modifiers || []) {
        if(mod.kind == ts.SyntaxKind.ExportKeyword) {
          return true;
        }
    }
    return false;
  }

  for (const src of program.getSourceFiles()) {
    if (src.isDeclarationFile) {
      if(DEBUG) {
        console.error(`Skipping analysis of declaration source: ${src.fileName}`);
      }
      continue;
    }

    if (resolve(src.fileName) != resolve(filename)) {
      if(DEBUG) {
        console.error(`Skipping analysis of source with resolve inconsistency: ${src.fileName}`);
      }
      continue;
    }

    const root_file = resolve(filename);

    ts.forEachChild(src, (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        const fn_sym = checker.getSymbolAtLocation(node.name!)!;
        const fn_name = fn_sym.escapedName;

        if(!isExported(node)) {
          console.error(`Skipping non-exported function: ${fn_name}`);
          return;
        }

        const fn_type = checker.getTypeOfSymbolAtLocation(fn_sym, fn_sym.valueDeclaration!);
        const fn_desc = ts.displayPartsToString(fn_sym.getDocumentationComment(checker)).trim();
        const fn_tags = fn_sym.getJsDocTags();
        const fn_pure = !!(fn_tags.find((e) => e.name == 'pure'));

        const call = fn_type.getCallSignatures()[0]!;
        const result_type = call.getReturnType();
        const result_type_name = `${fn_name}_output`;

        const result_type_validated = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, result_type_name, result_type, 0);

        const function_arguments = call.parameters.map(param => {
          const param_name = param.getName();
          const param_desc = ts.displayPartsToString(param.getDocumentationComment(checker)).trim();
          const param_type = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
          // TODO: https://github.com/hasura/ndc-typescript-deno/issues/34 Use the user's given type name if one exists.
          const type_name = `${fn_name}_arguments_${param_name}`;
          const param_type_validated = validate_type(root_file, checker, object_type_definitions, scalar_type_definitions, type_name, param_type, 0); // E.g. `bio_arguments_username`
          const description = param_desc ?  param_desc : null

          return {
            argument_name: param_name,
            description,
            type: param_type_validated,
          }
        });

        function_definitions[node.name!.text] = {
          ndc_kind: fn_pure ? FunctionNdcKind.Function : FunctionNdcKind.Procedure,
          description: fn_desc ? fn_desc : null,
          arguments: function_arguments,
          result_type: result_type_validated
        };
      }
    });

  }

  const result = {
    functions: function_definitions,
    object_types: object_type_definitions,
    scalar_types: scalar_type_definitions,
  }

  listing(FunctionNdcKind.Function, result.functions)
  listing(FunctionNdcKind.Procedure, result.functions)

  return result;
}
