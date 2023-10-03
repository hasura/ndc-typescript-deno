
/**
 * TODO: 
 * 
 * [x] Create PR
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

program.parse(Deno.args);

/**
 * Deno watcher:
 * https://medium.com/deno-the-complete-reference/denos-built-in-watcher-1d91cb976349
 * 
 * Example:
 * > deno run --allow-read=/var/tmp/testdata --allow-net=:8080 --watch app.ts
 */

/**
 * NPM imports:
 * https://docs.deno.com/runtime/manual/node/npm_specifiers
 */
