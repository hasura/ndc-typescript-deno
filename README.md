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
