# ndc-typescript-deno

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/9f139964-d0ed-4c92-b01f-9fda255717d4)

The Typescript (Deno) Connector allows a running connector to be inferred from a Typescript file (optionally with dependencies).

* https://hasura.io/connectors/typescript-deno
* Docs Link TODO

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/fb7f4afd-0302-432b-b7ce-3cc7d1f3546b)

## Overview

The connector runs in the following manner:

* The typescript sources are assembled
* Dependencies are fetched into a vendor directory
* Inference is performed and output to schema.json
* The functions are served via HTTP locally in the background with the Deno runtime
* The connector is started in the foreground responding to requests

It assumes that dependencies are specified in accordance with [Deno](https://deno.com) conventions.

## Typescript Functions Format

Your functions should be organised into a directory with one file acting as the entrypoint.

<details>
<summary> An example could be as follows - `functions/main.ts` </summary>

```
import { Hash, encode } from "https://deno.land/x/checksum@1.2.0/mod.ts";

export function make_password_hash(pw: string): string {
    return new Hash("md5").digest(encode(pw)).hex();
}

/**
 * Returns the github bio for the userid provided
 *
 * @remarks
 * This method is awesome.
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

Return types should be inferred.

Parameters should be inferred and named after their input parameter names.

Simple scalar, array, and object types should be supported.

Limitations:

* Functions can be sync, or async, but `Promise`'s can't be nested
* All numbers are exported as `Float`s
* Union types are not supported


## Deployment for Hasura Users

You will need:

* [V3 CLI](https://github.com/hasura/v3-cli) (With Logged in Session)
* [Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* Secret service token
* A configuration file

The configuration file format needs at a minimum
a `typescript_source` referenced which matches the main
typescript file as mounted with the `--volume` flag.

```
{"typescript_source": "/functions/main.ts"}
```

Create the connector:

> hasura3 connector create my-cool-connector:v1 \\
> --github-repo-url https://github.com/hasura/ndc-typescript-deno/tree/main \\
> --config-file config.json \\
> --volume ./functions:/functions \\
> --env SERVICE_TOKEN_SECRET=MY-SERVICE-TOKEN

*Note: Even though you can use the "main" branch to deploy the latest connector features, see the [Hasura Connector Hub](https://hasura.io/connectors/typescript-deno) for verified release tags*

Monitor the deployment status by name:

> hasura connector status my-cool-connector:v1

List your connector with its deployed URL:

> hasura connector list

```
my-cool-connector:v1 https://connector-9XXX7-hyc5v23h6a-ue.a.run.app active
```

## Usage

This connector is intended to be used with Hasura v3 projects.

Find the URL of your connector once deployed:

> hasura connector list

```
my-cool-connector:v1 https://connector-9XXX7-hyc5v23h6a-ue.a.run.app active
```

In order to use the connector once deployed you will first want to reference the connector in your project metadata:

```yaml
kind: DataSource
name: my_connector
dataConnectorUrl:
  url: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
```

If you have the [Hasura VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura) installed
you can run the following code actions:

* `Hasura: Refresh data source`
* `Hasura: Track all collections / functions ...`

This will integrate your connector into your Hasura project which can then be deployed or updated using the Hasura3 CLI.

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
  type: "Bearer",
  token: "SUPER_SECRET_TOKEN_XXX123"
```

While you can specify the token inline as above, it is recommended to use the Hasura secrets functionality for this purpose.


## Limitations

The following limitations exist with the Typescript connector. These limitations are all being tracked for future development.

* Union types are not supported
* Complex input types are supported by the connector, but are not supported in "commands" in Hasura3 projects


## Development

For contribution to this connector you will want to have the following dependencies:

* Rust (via [rustup](https://rustup.rs))
* [Deno](https://deno.com)
* (Optionally) [Docker](https://www.docker.com)

In order to perform local development, first server your functions:

* Copy `src/server.ts` into your test `functions/` directory
* Copy your main functions entrypoint (e.g. `functions/main.ts`) to `functions/funcs.ts`
* Switch to your functions directory: `cd functions/`
* Serve yor functions with `deno run --allow-net --allow-sys --allow-env server.ts`

In a second shell session perform inference:

* Vendor your dependencies with `deno vendor functions/funcs.ts`
* Perform inference with `deno --allow-net --allow-sys src/infer.ts functions/funcs.ts > schema.json`

Then start the connector:

* With the command: `cargo run serve --configuration <(echo '{"typescript_source": "functions/funcs.ts", "schema_location": "./schema.json"}') --port 8100`
* You can then test in a Husura project by referencing the connector on `http://localhost:8100`
* Or using the `hasura3` tunnel commands to reference in a Hasura Cloud project