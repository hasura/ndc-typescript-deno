# ndc-typescript-deno

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/9f139964-d0ed-4c92-b01f-9fda255717d4)

The Typescript (Deno) Connector allows a running connector to be inferred from a Typescript file (optionally with dependencies).

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/fb7f4afd-0302-432b-b7ce-3cc7d1f3546b)

Useful Links:

* [Typescript Deno Connector on the NDC Hub](https://hasura.io/connectors/typescript-deno)
* [Hasura V3 Documentation](https://hasura.io/docs/3.0)
* [Hasura CLI](https://github.com/hasura/v3-cli#hasura-v3-cli)
* [CLI Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* [Hasura VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura)
* [Deno](https://deno.com)
* [Native Data Connector Specification](https://hasura.github.io/ndc-spec/)
* [Typescript NDC SDK](https://github.com/hasura/ndc-sdk-typescript/)


## Overview

The connector runs in the following manner:

* Typescript sources are assembled (with `index.ts` acting as your interface definition)
* Dependencies are fetched
* Inference is performed and made available via the `/schema` endpoint
* Functions are served via the connector protocol

Note: The Deno runtime is used and this connector assumes that dependencies are specified in accordance with [Deno](https://deno.com) conventions.


## Before you get Started

It is recommended that you:

* Install the [Hasura3 CLI](https://github.com/hasura/v3-cli#hasura-v3-cli)
* Log in via the CLI
* Install the [connector plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* Install [VSCode](https://code.visualstudio.com)
* Install the [Hasura VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura)
* Optionally install [Deno](https://deno.com)
* Optionally install the [VSCode Deno Extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)


## Typescript Functions Format

Your functions should be organised into a directory with one file acting as the entrypoint.

<details>
<summary> An example Typescript entrypoint: </summary>

```typescript

// functions/index.ts

import { Hash, encode } from "https://deno.land/x/checksum@1.2.0/mod.ts";

export function make_password_hash(pw: string): string {
  return new Hash("md5").digest(encode(pw)).hex();
}

/**
 * Returns the github bio for the userid provided
 *
 * @param username - Username of the user who's bio will be fetched.
 * @returns The github bio for the requested user.
 * @pure This function should only query data without making modifications
 */
export async function get_github_profile_description(username: string): Promise<string> {
  const foo = await fetch(`https://api.github.com/users/${username}`);
  const response = await foo.json();
  return response.bio;
}

export function make_array(): Array<string> {
  return ['this', 'is', 'an', 'array']
}

type MyObjectType = {'foo': string, 'baz': Boolean}

export function make_object(): MyObjectType {
  return { 'foo': 'bar', 'baz': true}
}

export function make_object_array(): Array<MyObjectType> {
  return [make_object(), make_object()]
}

/**
 * @pure
 */
export function has_optional_args(a: string, b?: string) {
  if(b) {
    return `Two args: ${a} ${b}`;
  } else {
    return `One arg: ${a}`;
  }
}
```

</details>

Top level exported function definitions with `pure` tag will be made available as functions,
and others as procedures, which will become queries and mutations respectively.

* Return types are inferred
* Parameters are inferred and named after their input parameter names.
* Simple scalar, array, and object types should be supported
* Exceptions can be thrown
* Optional parameters will become optional arguments

Limitations:

* The `deno vendor` step must be run by hand for local development
* Functions can be sync, or async, but `Promise`'s can't be nested
* All numbers are exported as `Float`s
* Unrecognised types will become opaque scalars, for example: union types.
* Optional object fields are not currently supported
* Complex input types are supported by the connector, but are not supported in "commands" in Hasura3 projects
* Functions can be executed via both the `/query` and `/mutation` endpoints

Please [file an issue](https://github.com/hasura/ndc-typescript-deno/issues/new) for any problems you encounter during usage of this connector.


## Local Development of your Functions

While you can deploy your functions and have errors returned in the `hasura3 connector` logs,
local development will reward you with much more rapid feedback.

In order to develop your functions locally the following is the recommended practice:

* Have a `./functions/` directory in your project
* Create a development config for your connector in `./config.json`:
```json
{
  "functions": "./functions/index.ts",
  "vendor": "./vendor",
  "schemaMode": "INFER"
}
```
* Vendor your dependencies with:
* `deno vendor -f ./functions/index.ts --output ./vendor`
* (Optionally) If you want your development vendor and inference resources to be used to speed up deployment, add the following to your `./config.json`:
  ```json
  {
    "functions": "./functions/index.ts",
    "vendor": "./functions/vendor",
    "schemaLocation": "./functions/schema.json",
    "schemaMode": "INFER"
  }
  ```
  * Make sure to .gitignore your computed `vendor` and `schema.json` files.
  * Vendor the server's dependencies and yours inside the functions directory:
  * `deno vendor -f ./functions/index.ts --output ./functions/vendor`
  * `deno vendor -f https://deno.land/x/hasura_typescript_connector/mod.ts --output ./functions/vendor`
  * This will put runtime dependencies into your `./functions` volume when deployed so that they do not need to be computed during deployment
* Start the connector
```sh
deno run --allow-sys --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check https://deno.land/x/hasura_typescript_connector/mod.ts serve --configuration ./config.json
```
* (Optionally) Add a test-suite to your functions. See [Deno Testing Basics](https://docs.deno.com/runtime/manual/basics/testing).


## Deployment for Hasura Users

You will need:

* [V3 CLI](https://github.com/hasura/v3-cli) (With Logged in Session)
* [Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* (Optionally) A value to use with `SERVICE_TOKEN_SECRET`
* a typescript sources directory. E.g. `--volume ./my_functions_directory:/functions`
* A configuration file containing:

```json
{
  "functions": "/functions/index.ts",
  "vendor": "/functions/vendor",
  "schemaMode": "READ",
  "schemaLocation": "/functions/schema.json"
}
```

Create the connector:

```
hasura3 connector create my-cool-connector:v1 \
  --github-repo-url https://github.com/hasura/ndc-typescript-deno/tree/main \
  --config-file ./config.json \
  --volume ./functions:/functions \
  --env SERVICE_TOKEN_SECRET=MY-SERVICE-TOKEN # (optional)
```

*Note: Even though you can use the "main" branch to deploy the latest connector features, see the [Hasura Connector Hub](https://hasura.io/connectors/typescript-deno) for verified release tags*

Monitor the deployment status by name - This will indicate in-progress, complete, or failed status:

> hasura connector status my-cool-connector:v1

List all your connectors with their deployed URLs:

> hasura connector list
 
View logs from your running connector:

> hasura connector logs my-cool-connector:v1

## Usage

This connector is intended to be used with Hasura v3 projects.

Find the URL of your connector once deployed:

> hasura connector list

```
my-cool-connector:v1 https://connector-9XXX7-hyc5v23h6a-ue.a.run.app active
```

In order to use the connector once deployed you will first want to reference the connector in your project metadata:

```yaml
kind: "AuthConfig"
allowRoleEmulationFor: "admin"
webhook:
  mode: "POST"
  webhookUrl: "https://auth.pro.hasura.io/webhook/ddn?role=admin"
---
kind: DataSource
name: my_connector
dataConnectorUrl:
  url: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
```

If you have the [Hasura VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura) installed
you can run the following code actions:

* `Hasura: Refresh data source`
* `Hasura: Track all collections / functions ...`

This will integrate your connector into your Hasura project which can then be deployed or updated using the Hasura3 CLI:

```
hasura3 cloud build create --project-id my-project-id --metadata-file metadata.hml
```

## Service Authentication

If you don't wish to have your connector publically accessible then you must set a service token by specifying the  `SERVICE_TOKEN_SECRET` environment variable when creating your connector:

* `--env SERVICE_TOKEN_SECRET=SUPER_SECRET_TOKEN_XXX123`

Your Hasura project metadata must then set a matching bearer token:

```yaml
kind: DataSource
name: sendgrid
dataConnectorUrl:
  url: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
auth:
  type: Bearer
  token: "SUPER_SECRET_TOKEN_XXX123"
```

While you can specify the token inline as above, it is recommended to use the Hasura secrets functionality for this purpose:

```yaml
kind: DataSource
name: sendgrid
dataConnectorUrl:
  url: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
auth:
  type: Bearer
  token:
    valueFromSecret: CONNECTOR_TOKEN
```

## Debugging Issues

Errors may arrise from any of the following:

* Dependency errors in your functions
* Type errors in your functions
* Implementation errors in your functions
* Invalid connector configuration
* Invalid project metadata
* Connector Deployment Failure
* Misconfigured project authentication
* Misconfigured service authentication
* Insufficient query permissions
* Invalid queries
* Unanticipated bug in connector implementation

For a botton-up debugging approach:

* First check your functions:
    * Run `deno check` on your functions to determine if there are any obvious errors
    * Write a `deno test` harness to ensure that your functions are correctly implemented
* Then check your connector:
    * Check that the connctor deployed successfully with `hasura3 connector status my-cool-connector:v1`
    * Check the build/runtime logs of your connector with `hasura3 connector logs my-cool-connector:v1`
* Then check your project:
    * Ensure that your metadata and project build were successful
* Then check end-to-end integration:
    * Run test queries and view the connector logs to ensure that your queries are propagating correctly


## Development

For contribution to this connector you will want to have the following dependencies:

* [Deno](https://deno.com)
* (Optionally) [Docker](https://www.docker.com)

In order to perform local development on this codebase:

* Check out the repository: `git clone https://github.com/hasura/ndc-typescript-deno.git`
* This assumes that you will be testing against function in `./functions`
* Vendor the dependencies with `cd ./function && deno vendor -f index.ts`
* Serve yor functions with `deno run --allow-sys --allow-run --allow-net --allow-read --allow-write --allow-env --watch --check ./src/mod.ts serve --configuration <(echo '{"functions": "./functions/index.ts", "vendor": "./functions/vendor", "schemaMode": "INFER"}')`
* The connector should now be running on localhost:8100 and respond to any changes to the your functions and the connector source
* Use the `hasura3` tunnel commands to reference this connector from a Hasura Cloud project

Please [file an issue](https://github.com/hasura/ndc-typescript-deno/issues/new) for any problems you encounter during usage and development of this connector.


## TODO

* [x] Create PR: https://github.com/hasura/ndc-typescript-deno/pull/12
* [x] Share SDK issues
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
* [x] Deno run from deno.land...
* [x] Put imports up the top
* [x] Make sure deno.d.ts works with docker. Not required for local dev since they wil have Deno dev environment.
* [ ] Output usage information when running locally such as connector create command
* [ ] Make sure that you can create a derivative custom connector from the base docker image
* [x] Update SDK to 1.1.0
* [x] Check if response should be __value - Yes
* [x] Test running from user scenario
* [x] Test Docker
* [x] Test Connector Create
* [x] Dynamic inference
  > hasura3 connector create lyndon:dogecoin:2 --github-repo-url https://github.com/hasura/ndc-typescript-deno/tree/lyndon/ts-sdk --config-file (echo '{"functions": "/functions/index.ts", "vendor": "/functions/vendor", "schemaMode": "INFER"}' | psub) --volume ./scratch/lyndon_pre-entry_1:/functions
  > curl https://connector-4fa108cf-ae0b-4bf7-b252-a5d76c84926e-hyc5v23h6a-ue.a.run.app/schema
  > curl https://connector-4fa108cf-ae0b-4bf7-b252-a5d76c84926e-hyc5v23h6a-ue.a.run.app/mutation -H 'content-type: application/json' -d '{"insert_schema":[],"operations":[{"type":"procedure","name":"transaction_count","arguments":{"address": "AC8Q9Z4i4sXcbW7TV1jqrjG1JEWMdLyzcy"}}],"collection_relationships":{}}' -vvv
* [x] Pre-cached inference
* [ ] Test Deno Deploy
* [x] Precaching
* [x] Test imports
* [x] Test async
* [x] Trim whitespace from descriptions and only include if there is content.
* [x] Test from console - Issues with Latest engine and MD format...
* [x] Update README.md
* [x] Update README.md - Limitation: Even though the schema separates on purity, procedures can enter as either mutations or queries
* [ ] Test suite
* [ ] Move this TODO list into issues
* [ ] Should --watch also update vendor?
* [x] CI: Deno Hosting - Webhook added - Package: hasura_typescript_connector: https://deno.land/x/hasura_typescript_connector
* [x] CI: Docker build
* [x] CI: Tagging
* [ ] Good error reporting for missing options and config - Test
* [x] Rename `main.ts` to `mod.ts` or `index.ts` to avoid having to explicitly mention it in `deno run`
