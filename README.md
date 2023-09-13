# ndc-typescript-deno

The Typescript (Deno) Connector allows a running connector to be inferred from a Typescript file (optionally with dependencies).

* Hub Link TODO
* Docs Link TODO

TODO: Screenshot of TS file and GQL API side by side.

## Overview

The connector runs in the following manner:

* The typescript sources are assembled
* Dependencies are fetched into a vendor directory
* Inference is performed and output to schema.json
* The functions are served via HTTP locally in the background
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


## Deployment for Hasura Users

You will need:

* [V3 CLI](https://github.com/hasura/v3-cli) (With Logged in Session)
* [Connector Plugin](https://hasura.io/docs/latest/hasura-cli/connector-plugin/)
* Secret service token

Create the connector:

> hasura3 connector create my-cool-connector:v1 \\
> --github-repo-url https://github.com/hasura/ndc-typescript-deno/tree/main \\
> --volume ./my-config.json:/config.json \\
> --volume ./functions:/functions \\
> --env SERVICE_TOKEN_SECRET=MY-SERVICE-TOKEN

Monitor the deployment status by name:

> hasura connector status my-cool-connector:v1

List your connector with its deployed URL:

> hasura connector list

```
my-cool-connector:v1 https://connector-9XXX7-hyc5v23h6a-ue.a.run.app active
```

## Usage

## Development
