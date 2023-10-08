

/**
 * Deno watcher:
 * TODO: Put this into the readme
 * https://medium.com/deno-the-complete-reference/denos-built-in-watcher-1d91cb976349
 * 
 * Notes:
 * - Dependencies have to be vendored prior to inference.
 * 
 * Example:
 * > deno run --allow-read=/var/tmp/testdata --allow-net=:8080 --watch app.ts
 * > deno run --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check main.ts serve
 * > deno run --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check main.ts serve --schema-mode INFER --schema-location scratch/schema.json --vendor scratch/vendor
 * > deno run --allow-sys --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check ./src/main.ts serve --configuration (echo '{"functions": "./scratch/index.ts", "vendor": "./scratch/vendor", "schemaLocation": "./scratch/schema.json", "schemaMode": "READ"}' | psub)
 * > docker build -t ndc-typescript-deno:deno1 --progress plain . && docker run -v (pwd)/scratch/config.json:/etc/connector/config.json -it ndc-typescript-deno:deno1
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
 * [x] Handle exceptions
 * [x] Mutations
 * [ ] Provide additional exception detail for anticipated failures
 * [x] Depend on TS SDK
 * [x] Remove any
 * [x] Split up entrypoint sources
 * [x] Support optional parameters
 * [ ] Deno run from deno.land...
 * [x] Put imports up the top
 * [ ] Make sure deno.d.ts works with docker. Not required for local dev since they wil have Deno dev environment.
 * [ ] Output usage information when running locally such as connector create command
 * [ ] Make sure that you can create a derivative custom connector from the base docker image
 * [x] Update SDK to 1.1.0
 * [x] Check if response should be __value - Yes
 * [ ] Test running from user scenario
 * [x] Test Docker
 * [ ] Test Connector Create
 * [ ] Test Deno Deploy
 * [x] Precaching
 * [x] Test imports
 * [x] Test async
 * [x] Trim whitespace from descriptions and only include if there is content.
 * [x] Test from console - Issues with Latest engine and MD format...
 * [ ] Update README.md
 * [ ] Update README.md - Limitation: Even though the schema separates on purity, procedures can enter as either mutations or queries
 * [ ] Should --watch also update vendor?
 * [ ] CI: Deno Hosting
 * [ ] CI: Docker build
 * [ ] CI: Tagging
 */

import { Command } from 'https://deno.land/x/cmd@v1.2.0/mod.ts'
import { programInfo } from './infer.ts'
import { start, connector } from './connector.ts'


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
