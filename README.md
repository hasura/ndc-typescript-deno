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
```

</details>

Top level exported function definitions with `pure` tag will be made available as functions,
and others as procedures, which will become queries and mutations respectively.

* Return types are inferred
* Parameters are inferred and named after their input parameter names.
* Simple scalar, array, and object types should be supported
* Exceptions can be thrown

Limitations:

* Functions can be sync, or async, but `Promise`'s can't be nested
* All numbers are exported as `Float`s
* Union types are not supported


## Deployment for Hasura Users

You will need:

* [V3 CLI](https://github.com/hasura/v3-cli) (With Logged in Session)
* [Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* (Optionally) A value to use with `SERVICE_TOKEN_SECRET`
* A configuration file containing `{}`
* a typescript sources directory. E.g. `--volume ./my_functions_directory:/functions`

Create the connector:

```
hasura3 connector create my-cool-connector:v1 \
  --github-repo-url https://github.com/hasura/ndc-typescript-deno/tree/main \
  --config-file <(echo '{}') \
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


## Limitations

The following limitations exist with the Typescript connector. These limitations are all being tracked for future development.

* Union types are not supported
* Complex input types are supported by the connector, but are not supported in "commands" in Hasura3 projects


## Development

For contribution to this connector you will want to have the following dependencies:

* Rust (via [rustup](https://rustup.rs))
* [Deno](https://deno.com)
* (Optionally) [Docker](https://www.docker.com)

In order to perform local development, first serve your functions:

* Copy `src/server.ts` into your test `functions/` directory
* Switch to your functions directory: `cd functions/`
* Serve yor functions with `deno run --allow-net --allow-sys --allow-env server.ts`
  - `server.ts` loads `index.ts` to find your function definitions

In a second shell session perform inference:

* Vendor your dependencies with `deno vendor functions/index.ts`
* Perform inference with `deno --allow-net --allow-sys src/infer.ts functions/index.ts > schema.json`

Then start the connector:

* With the command: `cargo run serve --configuration <(echo '{"schema_location": "./schema.json"}') --port 8100`
* You can then test in a Husura project by referencing the connector on `http://localhost:8100`
* Or using the `hasura3` tunnel commands to reference in a Hasura Cloud project
