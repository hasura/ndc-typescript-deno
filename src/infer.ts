import ts, { FunctionDeclaration, SyntaxKind } from "npm:typescript@5.1.6";
import { resolve } from "https://deno.land/std@0.201.0/path/posix.ts";
import {existsSync} from "https://deno.land/std@0.201.0/fs/mod.ts";

type ValidateTypeResult = { type: 'named', name: string } | { type: 'array', element_type: ValidateTypeResult };

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

export function programInfo(filename: string, vendor_arg?: string): any {
  const vendorPath = vendor_arg || './vendor';
  const vendorPathResolved = resolve(vendorPath);
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
    Deno.exit(1);
  }

  const pathname = new URL('', import.meta.url).pathname;
  const dirname = pathname.replace(/\/[^\/]*$/,'');
  const deno_lib_path = resolve(`${dirname}/deno.d.ts`); // Assumes that deno.d.ts and infer.ts will be co-located.

  const program = ts.createProgram([filename], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    noImplicitAny: true,
    // NOTE: We just declare Deno globally as any in order to allow users to omit it's declaration in their function files
    lib: ['lib.d.ts', 'lib.es2017.d.ts', deno_lib_path],
    allowJs: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    baseUrl: '.',
    // '@/*': ['vendor/*'],
    paths: pathsMap
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);

  // console.debug(diagnostics);

  // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
  if (diagnostics.length) {
    let fatal = 0;
    console.error(`There were ${diagnostics.length} diagnostic errors.`);
    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        if (! resolve(diagnostic.file.fileName).startsWith(vendorPathResolved)) {
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

  type Ops = {
    aggregate_functions: {},
    comparison_operators: {},
    update_operators: {},
  };

  const no_ops: Ops = {
    aggregate_functions: {},
    comparison_operators: {},
    update_operators: {},
  };

  const schema_response = {
    scalar_types: {} as {[key: string]: Ops},
    object_types: {} as {[key: string]: any},
    collections: [],
    functions: [] as any[],
    procedures: [] as any[],
  };

  const scalar_mappings: {[key: string]: string} = {
    "string": "String",
    "bool": "Boolean",
    "boolean": "Boolean",
    "number": "Float",
  };

  function isExported(node: FunctionDeclaration): boolean {
    for(const mod of node.modifiers || []) {
        if(mod.kind == ts.SyntaxKind.ExportKeyword) {
          return true;
        }
    }
    return false;
  }

  const validate_type = (name: string, ty: any): ValidateTypeResult => {
    const type_str = checker.typeToString(ty);
    const type_name = ty.symbol?.escapedName || ty.intrinsicName || 'unknown_type';
    const type_name_lower: string = type_name.toLowerCase();

    // PROMISE -- TODO: Don't recur on inner promises.
    if (type_name == "Promise") {
      const inner_type = ty.resolvedTypeArguments[0];
      const inner_type_result = validate_type(name, inner_type);
      return inner_type_result;
    }

    // ARRAY
    // can we use ty.isArrayType?
    else if (type_name == "Array") { // TODO: Why donesn't Promise<Array<String>> work?
      const inner_type = ty.resolvedTypeArguments[0];
      const inner_type_result = validate_type(name, inner_type);
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
        const field_type_validated = validate_type(`${name}_field_${k}`, field_type);
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
        const fn_desc = ts.displayPartsToString(fn_sym.getDocumentationComment(checker));
        const fn_tags = fn_sym.getJsDocTags();
        const fn_pure = !!(fn_tags.find((e) => e.name == 'pure'));

        const call = fn_type.getCallSignatures()[0]!;
        const result_type = call.getReturnType();
        const result_type_name = `${fn_name}_output`;
        const result_type_validated = validate_type(result_type_name, result_type);

        const fn = {
          name: node.name!.text,
          description: fn_desc,
          arguments: {} as any,
          result_type: result_type_validated,
        };

        call.parameters.forEach((param, i) => {
          const param_name = param.getName();
          const param_desc = ts.displayPartsToString(param.getDocumentationComment(checker));
          const param_type = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
          const param_name_with_index = `${fn_name}_arguments_${param_name}_${i}`;
          const param_type_validated = validate_type(param_name_with_index, param_type); // E.g. `bio_arguments_username_0`

          fn.arguments[param_name] = {
            description: param_desc,
            type: param_type_validated,
            position: i,
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

  return schema_response;

}

