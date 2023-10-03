
/**
 * TODO: 
 * 
 * [x] Create PR: https://github.com/hasura/ndc-typescript-deno/pull/12
 * [x] Share SDK issues with Benoit
 * [ ] Resolve import errors for Deno (via import map?) for github.com/hasura/ndc-sdk-typescript
 * [ ] Convert server.ts to connector protocol
 * [ ] Remove rust harness
 * [ ] Update docker to leverage deno implementation
 * [ ] Do start-time inference on functions
 * [x] Have schema cache respecting flag --schema: /schema.json - Creates if missing, uses if present
 * [ ] Manage src locations better
 * [x] CMD parsing library
 * [!] Subprocess library (Not required)
 * [x] File-reading library (Builtin)
 * [x] Have local dev supported by `deno --watch`
 * [x] Dynamic invocation of functions from index module
 * [x] Seperate infer command for convenience
 * [x] --vendor flag for explicit vendor location
 * [ ] Reimplement async dispatch
 * [ ] Reimplement arg position schmea correlation
 */

/**
 * Importing TS SDK Dependency
 * https://github.com/hasura/ndc-sdk-typescript/tree/main
 * 
 * Currently not working (due to missing import map?)
 */

// import {start} from 'https://raw.githubusercontent.com/hasura/ndc-sdk-typescript/main/src/server.ts';
// import {Connector} from 'https://raw.githubusercontent.com/hasura/ndc-sdk-typescript/main/src/connector.ts';

/**
 * Subprocesses:
 * https://docs.deno.com/runtime/tutorials/subprocess
 */

const command = new Deno.Command(Deno.execPath(), {
  args: [
    "eval",
    "console.log('hello'); console.error('world')",
  ],
});

// create subprocess and collect output
const { code, stdout, stderr } = await command.output();

console.assert(code === 0);
console.assert("world\n" === new TextDecoder().decode(stderr));
console.assert("hello\n" === new TextDecoder().decode(stdout));

/**
 * Command line arguments:
 * https://examples.deno.land/command-line-arguments
 * 
 * Or via `cmd` library
 * https://deno.land/x/cmd@v1.2.0#action-handler-subcommands
 */

import { Command } from 'https://deno.land/x/cmd@v1.2.0/mod.ts'

const program = new Command("typescript-connector");

import { programInfo } from './src/infer.ts'

program
  .command('infer <entrypoint>')
  .option('-v, --vendor <path>', 'Vendor location (optional)')
  .action(function (entrypoint, cmdObj) {
    const output = programInfo(entrypoint, cmdObj.vendor);
    console.log(JSON.stringify(output));
  });

/**
 * NOTE: This could pose an issue when calling this program via Deno URL from CLI.
 *       Depending on how local references are resolved it may look relative to the URL.
 *       Having the user specify an explicit import map to capture this import may be a workaround.
 */
import * as index from './index.ts';

/**
 * @param payload such as {function: "concat", args: ["hello", " ", "world"]}
 * @returns 
 */
function invoke(positions: FunctionPositions, payload: any) {
  const ident = payload.function;
  type IK = keyof typeof index;
  const func = index[ident as IK] as any;
  const args = reposition(positions, payload);
  const result = func.apply(null, args);
  return new Response(result);
}

type Struct<X> = {
  [key: string]: X
}

type Payload = {
  function: string,
  args: Struct<any>
}

type FunctionPositions = Struct<Struct<number>>

function reposition(functions: FunctionPositions, payload: Payload): Array<any> {
  const keys = Object.keys(payload.args);

  // Can return early if there are less then 2 args
  // Might be good to find issues with schema alignment earlier though.
  if(keys.length < 2) {
    return Object.values(payload.args);
  }

  const positions = functions[payload.function];
  if(! positions) {
    throw new Error(`Couldn't find function ${payload.function} in schema.`);
  }
  const sortedKeys = keys.sort((k1, k2) => {
    const p1 = positions[k1]
    if(!p1) {
      throw new Error(`Couldn't find argument ${payload.function}.${k1} in schema.`);
    }
    const p2 = positions[k2]
    if(!p2) {
      throw new Error(`Couldn't find argument ${payload.function}.${k2} in schema.`);
    }
    return p1-p2;
  });
  const sorted = sortedKeys.map(k => payload.args[k]);
  return sorted;
}

async function serve(schema: string, req: Request): Promise<Response> {
  console.log(req); // TODO: Remove

  const { pathname: path } = new URL(req.url);
  const body = await (async () => {
    switch(req.method) {
      case 'POST':
        return await req.json();
      case 'GET':
        return {};
      default:
        throw new Error(`Invalid request method: ${req.method}`);
    }
  })();

  // TODO: Use the NDC TS SDK to dictate the routes, etc.
  switch(path) {
    case '/call':
      return invoke({}, body); // TODO: Provide position information here.
    case '/schema':
      return new Response(schema, {
        headers: {
            'content-type': 'application/json'
        }});
    default:
      throw new Error(`Invalid path [${path}]. Requests should be: GET /schema, or POST /call {function, args}.`);
  }
}

function getSchema(cmdObj: any): string {
  switch(cmdObj.schemaMode) {
    /**
     * The READ option is available in case the user wants to pre-cache their schema during development.
     */
    case 'READ': {
      console.error(`Reading existing schema: ${cmdObj.schemaLocation}`);
      const bytes = Deno.readFileSync(cmdObj.schemaLocation);
      const decoder = new TextDecoder("utf-8");
      const decoded = decoder.decode(bytes);
      const _ = JSON.parse(decoded); // Test that it is valid JSON
      return decoded;
    }
    case 'INFER': {
      console.error(`Inferring schema: ${cmdObj.schemaLocation}, with map ${cmdObj.vendor}`);
      const output = programInfo('./index.ts', cmdObj.vendor); // TODO: entrypoint param
      const schemaString = JSON.stringify(output);
      const schemaLocation = cmdObj.schemaLocation;
      if(schemaLocation) {
        // NOTE: Using sync functions should be ok since they're run on startup.
        Deno.writeTextFileSync(schemaLocation, schemaString);
      }
      return schemaString;
    }
    default:
      throw new Error('Invalid --schema-mode');
  }
}

function startServer(cmdObj: any) {
  const schema = getSchema(cmdObj);
  console.error("Running server");
  Deno.serve(
    cmdObj,
    async (req: Request) => {
      try {
        return await serve(schema, req);
      } catch(e) {
        return new Response(e, {status: 500});
      }
    }
  );
}

program
  .command('serve')
  .option('-p, --port <INT>', 'Port to listen on.')
  .option('--hostname <host>', 'Port to listen on.')
  .option('--schema-mode <mode>', 'READ|INFER (default). INFER will write the schema if --schema-location is also set.', undefined, 'INFER')
  .option('--schema-location <location>', 'Where to read or write the schema from or to depending on mode.')
  .option('--vendor <location>', 'Where to find the associated vendor files and import map.')
  .action(startServer);

program.parse(Deno.args);

/**
 * Deno watcher:
 * https://medium.com/deno-the-complete-reference/denos-built-in-watcher-1d91cb976349
 * 
 * Example:
 * > deno run --allow-read=/var/tmp/testdata --allow-net=:8080 --watch app.ts
 * > deno run --allow-run --allow-net --allow-read --allow-env --watch --check main.ts serve
 */

/**
 * NPM imports:
 * https://docs.deno.com/runtime/manual/node/npm_specifiers
 */
