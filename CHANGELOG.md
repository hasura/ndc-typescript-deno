# Typescript (Deno) Connector Changelog

This changelog documents the changes between release versions.

`main` serves as a place to stash upcoming changes before they have been released under a version tag.


## main

Changes to be included in the next upcoming releaase.

## v0.11

PR: https://github.com/hasura/ndc-typescript-deno/pull/59

* Bugfix: Issue with unused argument being parsed as a file - Prevented invoking on deno.land

## v0.10

PR: https://github.com/hasura/ndc-typescript-deno/pull/57

* Types names are now preserved when possible
* Depends on the latest version of the TS SDK which no longer needs multiregion functions
* Defines arraybuffer and blob scalars
* Sets MAX_INFERENCE_RECURSION = 20 to break any potential infinite recursion loops
* New tests have been created for refactored inference cases

## v0.9

Full-Stack Typescript!

* Ported main server from Rust to pure Deno
* Support exposing optional function parameters

## v0.8

Required entrypoint: /functions/index.ts;

* Entrypoint: /functions/index.ts
* Moving work from entrypoint.sh into Dockerfile to improve hibernation wakeup speed

## v0.7

Startup optimisation.

* Reusing vendor from inference when running server.ts to avoid downloading dependencies twice

## v0.6

Logging bug fix.

* Improved entrypoint.sh to have better logging behaviour

## v0.5

Support selecting fields.

* Query with field selections are now respected
* Errors during function execution are logged from Deno server

## v0.4

Integrated V2 Proxy.

* Includes a V2 compatibility proxy that can be activated by setting: `ENABLE_V2_COMPATIBILITY=true`
* Fixes bug in `infer.ts` that would throw an error function definitions had no imports: https://github.com/hasura/ndc-typescript-deno/pull/7

## v0.3

Error improvements.

* Updating SDK
* Correct error reporting from exceptions thrown from user functions

## v0.2

Update to SDK.

* Starting use of a `CHANGELOG.md` file
* `Deno` is now defined. Users no longer need to defined this value in their functions.
* Inference errors now exit and print in `entrypoint.sh`
* Supports `SERVICE_TOKEN_SECRET`


## v0.1

Initial release of the connector.

This connector allows for quick deployment of Typescript functions to Hasura V3 Projects.

See `README.md` for details.

Limitations:

* Server Auth Token support (`SERVICE_TOKEN_SECRET`) is not yet available
* User needs to define `Deno` value in their functions
* Startup inference errors are hidden
