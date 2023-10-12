

/**
 * Typescript entrypoint for running the connector.
 */

// NOTE: Ensure that sdk matches version in connector.ts
import * as sdk        from 'npm:@hasura/ndc-sdk-typescript@1.1.0';
import * as commander  from 'npm:commander@11.0.0';
import * as path       from "https://deno.land/std@0.203.0/path/mod.ts";
import { programInfo } from './infer.ts'
import { connector   } from './connector.ts'

const inferCommand = new commander.Command("infer")
  .addArgument(new commander.Argument('<path>', 'Typescript source entrypoint'))
  .addOption(new commander.Option('-v, --vendor <path>', 'Vendor location (optional)'))
  .action((entrypoint, cmdObj, _command) => {
    const output = programInfo(entrypoint, cmdObj.vendor, cmdObj.preVendor);
    console.log(JSON.stringify(output));
  });

const program = new commander.Command('typescript-connector');

program.addCommand(sdk.get_serve_command(connector));
program.addCommand(sdk.get_serve_configuration_command(connector));
program.addCommand(inferCommand);

const node_style_args = [Deno.execPath(), path.fromFileUrl(import.meta.url), ...Deno.args];

program.parseAsync(node_style_args).catch(console.error);
