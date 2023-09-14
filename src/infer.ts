import ts from "npm:typescript@5.1.6";
import { resolve } from "https://deno.land/std@0.201.0/path/posix.ts";

// TODO: Resolve deno check type errors.

type ValidateTypeResult = { type: 'named', name: string } | { type: 'array', element_type: ValidateTypeResult };

type Type = any;

declare global {
  var Deno: any;
}

function is_struct(ty: Type): Boolean {
  return (ty?.members?.size || 0) > 0;
}

function mapObject(obj, fn) {
  return Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => fn(k,v)
    )
  );
}

function programInfo(filename: string) {

  const importString = Deno.readTextFileSync('./vendor/import_map.json');
  const vendorMap = JSON.parse(importString);
  const pathsMap = mapObject(vendorMap.imports, (k, v) => {
    if(/\.ts$/.test(k)) {
      return [k, [ v.replace(/./, './vendor') ]];
    } else {
      return [k.replace(/$/,'*'), [ v.replace(/./, './vendor').replace(/$/, '*') ]];
    }
  });

  let program = ts.createProgram([filename], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    noImplicitAny: true,
    // lib: ['lib.d.ts', 'lib.es2015.d.ts'],
    lib: ['lib.d.ts', 'lib.es2017.d.ts'],
    allowJs: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    baseUrl: '.',
    // '@/*': ['vendor/*'],
    paths: pathsMap
  });

  let diagnostics = ts.getPreEmitDiagnostics(program);

  // console.debug(diagnostics);

  // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
  if (diagnostics.length) {
    let fail = false;
    console.error(`There were ${diagnostics.length} diagnostic errors.`);
    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        if (! /^vendor\//.test(diagnostic.file.fileName)) {
          fail = true;
        }
        let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        fail = true;
      }
    });

    if(fail) {
      Deno.exit(1);
    }
  }

  let checker = program.getTypeChecker();

  let no_ops = {
    aggregate_functions: {},
    comparison_operators: {},
    update_operators: {},
  };

  let schema_response = {
    scalar_types: {},
    object_types: {},
    collections: [],
    functions: [] as any[],
    procedures: [] as any[],
  };

  const scalar_mappings = {
    "string": "String",
    "bool": "Boolean",
    "boolean": "Boolean",
    "number": "Float",
  };

  let validate_type = (name: string, ty: Type): ValidateTypeResult => {
    const type_str = checker.typeToString(ty);
    const type_name = ty.symbol?.escapedName || ty.intrinsicName;
    const type_name_lower = type_name.toLowerCase();

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

    // UNHANDLED -- TODO: Make above cases more generic to reduce unhandled errors.
    else {
      // console.debug(ty);
      console.error(`Unable to validate type of ${name}: ${type_str}.`);
      Deno.exit(1); // Proceed
    }

    return { type: 'named', name: 'IMPOSSIBLE'}; // Satisfy TS Checker.
  }

  for (let src of program.getSourceFiles()) {
    if (src.isDeclarationFile) continue;
    if (resolve(src.fileName) != resolve(filename)) continue;

    ts.forEachChild(src, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        const fn_sym = checker.getSymbolAtLocation(node.name!)!;
        const fn_name = fn_sym.escapedName;
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

// TODO: Should we package this up in an array?
// TODO: Should we have error information returned in-band?
// E.g. output = `{ errors: [], programs: [{ name: "input.ts", errors: []}]}`
Deno.args.forEach((arg) => {
  const output = programInfo(arg);
  console.log(JSON.stringify(output));
})

if(Deno.args.length < 1) {
  console.error(`Usage: deno run --allow-env --allow-sys --allow-read --allow-net infer.ts SOURCE.ts*`);
  Deno.exit(1);
}
