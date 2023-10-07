

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
 * [x] Convert server.ts to connector protocol in `connector.ts`
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
 * [ ] Handle exceptions
 * [ ] Mutations
 * [ ] Provide additional exception detail for anticipated failures
 * [x] Depend on TS SDK
 * [x] Remove any
 * [x] Split up entrypoint sources
 * [x] Support optional parameters
 * [ ] Deno run from deno.land...
 * [x] Put imports up the top
 * [ ] Maybe reference a url version of deno.d.ts by default and have a flag for docker?
 * [ ] Output usage information when running locally such as connector create command
 * [ ] Make sure that you can create a derivative custom connector from the base docker image
 * [ ] Update SDK
 * [ ] Deno Deploy
 * [ ] Check if response should be __value
 */

import { Command } from 'https://deno.land/x/cmd@v1.2.0/mod.ts'
import { programInfo } from './infer.ts'
import { connector } from './connector.ts'
import { start } from 'npm:@hasura/ndc-sdk-typescript@1.0.0';


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

// This is a passthrough for the TS SDK start method
// The command name 'serve' has to match the command defined in the SDK since Deno.args is immutable.
program
  .command('serve')
  .option('--configuration <path>')
  .option('--port <port>')
  .option('--service-token-secret <secret>')
  .option('--otlp_endpoint <endpoint>')
  .option('--service-name <name>')
  .option('-h, --help')
  .action((_args, _cmdObj) => {
    console.error(`Running Connector.start`);
    start(connector);
  });

await program.parseAsync(Deno.args);
