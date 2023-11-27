

/**
 * Typescript entrypoint for running the connector.
 */

// NOTE: Ensure that sdk matches version in connector.ts
import * as commander  from 'npm:commander@11.0.0';
import { programInfo } from './infer.ts'
import { connector } from './connector.ts'
import sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.4';

const inferCommand = new commander.Command("infer")
  .argument('<path>', 'Typescript source entrypoint')
  .option('-v, --vendor <path>', 'Vendor location (optional)')
  .action((entrypoint, cmdObj, _command) => {
    const output = programInfo(entrypoint, cmdObj.vendor, cmdObj.preVendor);
    console.log(JSON.stringify(output));
  });

const program = new commander.Command('typescript-connector');

program.addCommand(sdk.get_serve_command(connector));
program.addCommand(sdk.get_serve_configuration_command(connector));
program.addCommand(inferCommand);

// The commander library expects node style arguments that have
// 'node' and the entrypoint as the first two arguments.
// The node_style_args array makes Deno.args compatible.
// The import.meta.url is used instead of a file, since it may be invoked from deno.land
const node_style_args = [Deno.execPath(), import.meta.url, ...Deno.args];

program.parseAsync(node_style_args).catch(console.error);
