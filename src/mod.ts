

/**
 * Typescript entrypoint for running the connector.
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
