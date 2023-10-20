# Typescript (Deno) Connector

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/9f139964-d0ed-4c92-b01f-9fda255717d4)

The Typescript (Deno) Connector allows you to write your functions in Typescript and have them deployed as a Hasura DDN 
connector.

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/fb7f4afd-0302-432b-b7ce-3cc7d1f3546b)

* [Typescript Deno Connector on the NDC Hub](https://hasura.io/connectors/typescript-deno)
* [Typescript Deno Connector on deno.com](https://deno.land/x/hasura_typescript_connector)
* [Hasura V3 Documentation](https://hasura.io/docs/3.0)
* [Hasura CLI](https://github.com/hasura/v3-cli#hasura-v3-cli)
* [CLI Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* [Hasura VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura)
* [Deno](https://deno.com)
* [Native Data Connector Specification](https://hasura.github.io/ndc-spec/)
* [Typescript NDC SDK](https://github.com/hasura/ndc-sdk-typescript/)

The connector runs in the following order:

1. Typescript sources are assembled (with `index.ts` acting as your interface definition)
2. Dependencies are fetched
3. Inference is performed and made available via the `/schema` endpoint
4. Functions are served via the connector protocol

Note: The Deno runtime is used and this connector assumes that dependencies are specified in accordance with 
[Deno](https://deno.com) conventions.

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

export function make_bad_password_hash(pw: string): string {
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
  "preVendor": true,
  "schemaMode": "INFER"
}
```
* (Optionally) If you want your development vendor and inference resources to be used to speed up deployment, add the following to your `./config.json`:
  ```json
  {
    "functions": "./functions/index.ts",
    "vendor": "./functions/vendor",
    "preVendor": true,
    "schemaLocation": "./functions/schema.json",
    "schemaMode": "INFER"
  }
  ```
  * Make sure to .gitignore your computed `vendor` and `schema.json` files.
* Start the connector
```sh
deno run -A --watch --check https://deno.land/x/hasura_typescript_connector/mod.ts serve --configuration ./config.json
```
* (Optionally) Add a test-suite to your functions. See [Deno Testing Basics](https://docs.deno.com/runtime/manual/basics/testing).


## Config Format

The configuration object has the following properties:

```
  functions      (string): Location of your functions entrypoint (default: ./functions/index.ts)
  vendor         (string): Location of dependencies vendor folder (optional)
  preVendor     (boolean): Perform vendoring prior to inference in a sub-process (default: false)
  schemaMode     (string): INFER the schema from your functions, or READ it from a file.
  schemaLocation (string): Location of your schema file. schemaMode=READ reads the file, schemaMode=INFER writes the file (optional)
```

NOTE: When deploying the connector with the `connector create` command your config is currently replaced with:

```
{
  "functions": "/functions/index.ts",
  "vendor": "/functions/vendor",
  "schemaMode": "READ",
  "schemaLocation": "/functions/schema.json"
}
```

This means that your functions volume will have to be mounted to `/functions`.

## Deployment for Hasura Users

You will need:

* [V3 CLI](https://github.com/hasura/v3-cli) (With Logged in Session)
* [Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* (Optionally) A value to use with `SERVICE_TOKEN_SECRET`
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

This connector is intended to be used with Hasura DDN projects.

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
kind: DataConnector
version: v1
definition:
  name: my_connector
  url:
    singleUrl: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
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

Find more information on service authentication [here](./docs/authentication.md).

## Debugging Issues

For debugging issues with your connector, please see the [debugging guide](./docs/debugging.md).

## Contributing

Check out our [contributing guide](./docs/contributing.md) for more details.
