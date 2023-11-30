# Hasura NDC TypeScript (Deno) Connector

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/9f139964-d0ed-4c92-b01f-9fda255717d4)

The TypeScript (Deno) Connector allows a running connector to be inferred from a TypeScript file (optionally with dependencies).

![image](https://github.com/hasura/ndc-typescript-deno/assets/92299/fb7f4afd-0302-432b-b7ce-3cc7d1f3546b)

## [Github Repository](https://github.com/hasura/ndc-typescript-deno)

See the [Github Repo](https://github.com/hasura/ndc-typescript-deno) for additional details.

## Quickstart

Once your project is set up, run locally with:

```
> cat config.json
{
  "functions": "./functions/index.ts",
  "vendor": "./vendor",
  "schemaMode": "INFER"
}

> deno run -A --watch=./functions --check https://deno.land/x/hasura_typescript_connector/mod.ts serve --configuration ./config.json
```

## TypeScript Functions Format

Your functions should be organised into a directory with one file acting as the entrypoint.

An example Typescript entrypoint:

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
