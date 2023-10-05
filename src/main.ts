

/**
 * Deno watcher:
 * TODO: Put this into the readme
 * https://medium.com/deno-the-complete-reference/denos-built-in-watcher-1d91cb976349
 * 
 * Example:
 * > deno run --allow-read=/var/tmp/testdata --allow-net=:8080 --watch app.ts
 * > deno run --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check main.ts serve
 * > deno run --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check main.ts serve --schema-mode INFER --schema-location scratch/schema.json --vendor scratch/vendor
 */

/**
 * TODO: 
 * 
 * [x] Create PR: https://github.com/hasura/ndc-typescript-deno/pull/12
 * [x] Share SDK issues with Benoit
 * [x] Resolve import errors for Deno (via import map?) for github.com/hasura/ndc-sdk-typescript
 * [ ] Convert server.ts to connector protocol
 * [x] Remove rust harness
 * [x] Update docker to leverage deno implementation
 * [x] Do start-time inference on functions
 * [x] Have schema cache respecting flag --schema: /schema.json - Creates if missing, uses if present
 * [x] Manage src locations better
 * [x] CMD parsing library
 * [!] Subprocess library (Not required)
 * [x] File-reading library (Builtin)
 * [x] Have local dev supported by `deno --watch`
 * [x] Dynamic invocation of functions from index module
 * [x] Seperate infer command for convenience
 * [x] --vendor flag for explicit vendor location
 * [x] Reimplement async dispatch
 * [x] Reimplement position derivation from schema
 * [x] Reimplement arg position schmea correlation
 * [ ] Provide additional exception detail for anticipated failures
 * [x] Depend on TS SDK
 * [x] Remove any
 * [x] Split up entrypoint sources
 * [x] Support optional parameters
 * [ ] Deno run from deno.land...
 * [x] Put imports up the top
 * [ ] Maybe reference a url version of deno.d.ts by default and have a flag for docker?
 * [ ] Output usage information when running locally such as connector create command
 */

import { Command } from 'https://deno.land/x/cmd@v1.2.0/mod.ts'
import { FunctionPositions, ProgramInfo, programInfo } from './infer.ts'

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
  args: Record<string, X>
}

function reposition<X>(functions: FunctionPositions, payload: Payload<X>): Array<X> {
  const keys = Object.keys(payload.args);

  // Can return early if there are less then 2 args
  // Might be good to find issues with schema alignment earlier though.
  if(keys.length < 2) {
    return Object.values(payload.args);
  }

  const positions = functions[payload.function];

  if(!positions) {
    throw new Error(`Couldn't find function ${payload.function} in schema.`);
  }

  const sorted = positions.map(k => payload.args[k]);
  return sorted;
}

async function respond(functions: any, positions: FunctionPositions, schema: string, req: Request): Promise<Response> {

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

  const jsonResponse = { headers: { 'content-type': 'application/json' }};

  // TODO: Use the NDC TS SDK to dictate the routes, etc.
  switch(path) {
    case '/call': {
      const result = await invoke(functions, positions, body);
      return new Response(JSON.stringify(result), jsonResponse);
    }
    case '/schema':
      return new Response(schema, jsonResponse);
    default:
      throw new Error(`Invalid path [${path}]. Requests should be: GET /schema, or POST /call {function, args}.`);
  }
}

function getInfo(cmdObj: ServeOptions): ProgramInfo {
  const schemaMode = cmdObj.schemaMode || 'INFER';
  switch(schemaMode) {
    /**
     * The READ option is available in case the user wants to pre-cache their schema during development.
     */
    case 'READ': {
      if(!cmdObj.schemaLocation) {
        throw new Error('--schema-location is require if using --schema-mode READ');
      }
      console.error(`Reading existing schema: ${cmdObj.schemaLocation}`);
      const bytes = Deno.readFileSync(cmdObj.schemaLocation);
      const decoder = new TextDecoder("utf-8");
      const decoded = decoder.decode(bytes);
      return JSON.parse(decoded);
    }
    case 'INFER': {
      console.error(`Inferring schema: ${cmdObj.schemaLocation}, with map ${cmdObj.vendor}`);
      const info = programInfo(cmdObj.functions, cmdObj.vendor); // TODO: entrypoint param
      const schemaLocation = cmdObj.schemaLocation;
      if(schemaLocation) {
        const infoString = JSON.stringify(info);
        // NOTE: Using sync functions should be ok since they're run on startup.
        Deno.writeTextFileSync(schemaLocation, infoString);
      }
      return info;
    }
    default:
      throw new Error('Invalid --schema-mode');
  }
}

async function startServer(cmdObj: ServeOptions) {
  const functionsArg = cmdObj.functions || './functions/index.ts';
  const functions = await import(functionsArg)
  const info = getInfo(cmdObj);
  const schemaString = JSON.stringify(info.schema);
  const positions = info.positions;
  console.error("Running server");
  Deno.serve(
    cmdObj,
    async (req: Request) => {
      try {
        return await respond(functions, positions, schemaString, req);
      } catch(e) {
        return new Response(e, {status: 500});
      }
    }
  );
}

/**
 * The CLI entrypoint into this program.
 * Uses the 'cmd' Deno package.
 */

const program = new Command("typescript-connector");

program
  .command('infer <entrypoint>')
  .option('-v, --vendor <path>', 'Vendor location (optional)')
  .action(function (entrypoint, cmdObj) {
    const output = programInfo(entrypoint, cmdObj.vendor);
    console.log(JSON.stringify(output));
  });

type ServeOptions = {
  functions: string,
  port?: number,
  hostname?: string,
  schemaMode: 'READ' | 'INFER',
  schemaLocation?: string,
  vendor?: string
}

// Note: There seems to be a bug in the CMD library where defaults and regexes don't typecheck.
//       https://github.com/acathur/cmd/issues/6
program
  .command('serve')
  .option('-f, --functions <string>', 'Path to your typescript functions entrypoint file.')
  .option('-p, --port <INT>', 'Port to listen on.')
  .option('--hostname <host>', 'Port to listen on.')
  .option('--schema-mode <mode>', 'READ|INFER (default). INFER will write the schema if --schema-location is also set.')
  .option('--schema-location <path>', 'Where to read or write the schema from or to depending on mode.')
  .option('--vendor <path>', 'Where to find the associated vendor files and import map.')
  .action(startServer);

await program.parseAsync(Deno.args);
