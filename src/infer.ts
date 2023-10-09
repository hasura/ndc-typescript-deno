import ts, { FunctionDeclaration } from "npm:typescript@5.1.6";
import { resolve } from "https://deno.land/std@0.201.0/path/posix.ts";
import {existsSync} from "https://deno.land/std@0.201.0/fs/mod.ts";
import { FunctionInfo, ScalarType, SchemaResponse, Type } from 'npm:@hasura/ndc-sdk-typescript@1.0.0';

export type Struct<X> = Record<string, X>;

export type FunctionPositions = Struct<Array<string>>

export type ProgramInfo = {
  schema: SchemaResponse,
  positions: FunctionPositions
}

// TODO: Specialise the any to ty.Type or something similar
function is_struct(ty: any): boolean {
  return (ty?.members?.size || 0) > 0;
}

function mapObject<I, O>(obj: {[key: string]: I}, fn: ((key: string, value: I) => [string, O])): {[key: string]: O} {
  const keys: Array<string> = Object.keys(obj);
  const result: {[key: string]: O} = {};
  for(const k of keys) {
    const [k2, v] = fn(k, obj[k]);
    result[k2] = v;
  }
  return result;
}

function isParameterDeclaration(node: ts.Node | undefined): node is ts.ParameterDeclaration {
  return node?.kind === ts.SyntaxKind.Parameter;
}

const scalar_mappings: {[key: string]: string} = {
  "string": "String",
  "bool": "Boolean",
  "boolean": "Boolean",
  "number": "Float",
};

// TODO: Use ReadOnly?
const no_ops: ScalarType = {
  aggregate_functions: {},
  comparison_operators: {},
  update_operators: {},
};

function validate_type(checker: ts.TypeChecker, schema_response: SchemaResponse, name: string, ty: any): Type {
  const type_str = checker.typeToString(ty);
  const type_name = ty.symbol?.escapedName || ty.intrinsicName || 'unknown_type';
  const type_name_lower: string = type_name.toLowerCase();

  // PROMISE -- TODO: Don't recur on inner promises.
  if (type_name == "Promise") {
    const inner_type = ty.resolvedTypeArguments[0];
    const inner_type_result = validate_type(checker, schema_response, name, inner_type);
    return inner_type_result;
  }

  // ARRAY
  // can we use ty.isArrayType?
  else if (type_name == "Array") { // TODO: Why donesn't Promise<Array<String>> work?
    const inner_type = ty.resolvedTypeArguments[0];
    const inner_type_result = validate_type(checker, schema_response, name, inner_type);
    return { type: 'array', element_type: inner_type_result };
  }

  // SCALAR
  else if (scalar_mappings[type_name_lower]) {
    const type_name_gql = scalar_mappings[type_name_lower];
    schema_response.scalar_types[type_name_gql] = no_ops;
    return { type: 'named', name: type_name_gql };
  }

  // OBJECT
  else if (is_struct(ty)) {
    // TODO: Detect objects by fields?
    // TODO: Use .members vs. .properties
    const fields = Object.fromEntries(Array.from(ty.members, ([k, v]) => {
      const field_type = checker.getTypeAtLocation(v.declarations[0].type);
      const field_type_validated = validate_type(checker, schema_response, `${name}_field_${k}`, field_type);
      return [k, { arguments: {}, type: field_type_validated }];
    }));

    schema_response.object_types[name] = { fields };
    return { type: 'named', name: name}
  }

  // UNHANDLED: Assume that the type is a scalar
  else {
    console.error(`Unable to validate type of ${name}: ${type_str}. Assuming that it is a scalar type.`);
    schema_response.scalar_types[name] = no_ops;
    return { type: 'named', name };
  }
}

export function programInfo(filename_arg?: string, vendor_arg?: string): ProgramInfo {
  const filename = resolve(filename_arg || './functions/index.ts'); // TODO: Should this have already been established upstream?
  const vendorPath = resolve(vendor_arg || './vendor');
  const importMapPath = `${vendorPath}/import_map.json`;
  let pathsMap: {[key: string]: Array<string>} = {};

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
    console.error(`Couldn't find import map: ${importMapPath}`);
    // Deno.exit(1); -- TODO: Decide if we should fail here.
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

  const program = ts.createProgram([filename], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    noImplicitAny: true,
    // NOTE: We just declare Deno globally as any in order to allow users to omit it's declaration in their function files
    lib: ['lib.d.ts', 'lib.es2017.d.ts', resolve(deno_d_ts)],
    allowJs: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    baseUrl: '.',
    // '@/*': ['vendor/*'],
    paths: pathsMap
  });

  Deno.removeSync(deno_d_ts);

  const diagnostics = ts.getPreEmitDiagnostics(program);

  // console.debug(diagnostics);

  // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
  if (diagnostics.length) {
    let fatal = 0;
    console.error(`There were ${diagnostics.length} diagnostic errors.`);
    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        if (! resolve(diagnostic.file.fileName).startsWith(vendorPath)) {
          fatal++;
        }
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        fatal++;
      }
    });

    if(fatal > 0) {
      console.error(`Fatal errors: ${fatal}`);
      Deno.exit(1);
    }
  }

  const checker = program.getTypeChecker();

  const schema_response: SchemaResponse = {
    scalar_types: {},
    object_types: {},
    collections: [],
    functions: [],
    procedures: [],
  };

  const positions: FunctionPositions = {};

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
      console.error(`Skipping analysis of declaration source: ${src.fileName}`);
      continue;
    }

    if (resolve(src.fileName) != resolve(filename)) {
      console.error(`Skipping analysis of source with resolve inconsistency: ${src.fileName}`);
      continue;
    }

    ts.forEachChild(src, (node) => {
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
        const result_type_validated = validate_type(checker, schema_response, result_type_name, result_type);
        const description = fn_desc ? { description: fn_desc } : {}

        const fn: FunctionInfo = {
          name: node.name!.text,
          ...description,
          arguments: {},
          result_type: result_type_validated,
        };

        positions[fn.name] = [];

        call.parameters.forEach((param) => {
          const param_name = param.getName();
          const param_desc = ts.displayPartsToString(param.getDocumentationComment(checker)).trim();
          const param_type = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
          const type_name = `${fn_name}_arguments_${param_name}`; // TODO: Use the user's given type name if one exists.
          const param_type_validated = validate_type(checker, schema_response, type_name, param_type); // E.g. `bio_arguments_username`
          const description = param_desc ? { description: param_desc } : {}

          positions[fn.name].push(param_name);

          // TODO: Creating the structure for optional types should be done by 'validate_type'.
          //       Perhaps give an 'optional' boolean argument to 'validate_type' constructed in this way for params.
          function optionalParameterType(): Type {
            if(param) {
              for(const declaration of param.getDeclarations() || []) {
                if(isParameterDeclaration(declaration)) {
                  if(checker.isOptionalParameter(declaration)) {
                    return {
                      type: 'nullable', underlying_type: param_type_validated
                    }
                  }
                }
              }
            }
            return param_type_validated;
          }

          fn.arguments[param_name] = {
            ...description,
            type: optionalParameterType(),
          }
        });

        if(fn_pure) {
          schema_response.functions.push(fn);
        } else {
          schema_response.procedures.push(fn);
        }
      }
    });

  }

  const result = {
    schema: schema_response,
    positions
  }

  return result;
}

