
/**
 * TODO: 
 * 
 * [x] Create PR: https://github.com/hasura/ndc-typescript-deno/pull/12
 * [ ] Share SDK issues with Benoit
 * [ ] Resolve import errors for Deno (via import map?) for github.com/hasura/ndc-sdk-typescript
 * [ ] Convert server.ts to connector protocol
 * [ ] Remove rust harness
 * [ ] Update docker to leverage deno implementation
 * [ ] Do start-time inference on functions
 * [ ] Have schema cache respecting flag --schema: /schema.json - Creates if missing, uses if present
 * [ ] Manage src locations better
 * [ ] CMD parsing library
 * [ ] Subprocess library
 * [ ] File-reading library
 * [ ] Have local dev supported by `deno --watch`
 * [x] Seperate infer command for convenience
 * [x] --vendor flag for explicit vendor location
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

import * as index from './index.ts';

function errors(inner: (req: Request) => Response): (req: Request) => Response {
  return (req: Request) => {
    try {
      return inner(req);
    } catch(e) {
      return new Response(e, {status: 500});
    }
  };
}

type IK = keyof typeof index;

function server(req: Request): Response {
  console.log(req);
  const { pathname: path, searchParams: query } = new URL(req.url);
  if(!['','/','/call'].includes(path)) {
    throw new Error(`Invalid path [${path}]. Please use POST /call.`);
  }
  const ident = query.get('function');
  if(typeof ident != 'string') {
    throw new Error(`Please provide a "function" parameter.`);
  }
  const func = index[ident as IK] as any;
  const result = func();
  return new Response(result);
}

program
  .command('serve')
  .option('-p, --port <INT>', 'Port to listen on.')
  .option('--hostname <host>', 'Port to listen on.')
  .action(function (cmdObj) {
    console.error("Running server");
    Deno.serve(
      {port: cmdObj.port, hostname: cmdObj.hostname},
      errors(server)
    );
  });

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
