# TypeScript (Deno) Connector Changelog

This changelog documents the changes between release versions.

`main` serves as a place to stash upcoming changes before they have been released under a version tag.


## main

Changes to be included in the next upcoming release.

Support for "nullable" types, for example `string | null`, `string | undefined`, `string | null | undefined`,
and optional object properties.

PR: https://github.com/hasura/ndc-typescript-deno/pull/82

## v0.20

Improved support for running the connector in Watch mode, where it will auto-restart when changes
to the functions are made.

* The Docker container is now compatible with watch mode and can be used for local development
* README documentation about watch mode updated to indicate the need to explicitly watch the functions
  folder (ie `--watch=./functions`)
* `functions` configuration property is now required
* Type inference is now only done at connector startup, not every time the `/schema` endpoint is called
* Updated TypeScript SDK to v1.2.5

PR: https://github.com/hasura/ndc-typescript-deno/pull/79

## v0.19

Updating the TS SDK to 1.2.4 and fixing incorrectly required insert_schema field in mutations.

PR: https://github.com/hasura/ndc-typescript-deno/pull/78

* Updates SDK

## v0.18

Broadening dependency support, better error logging, and fixing regressions.

PR: https://github.com/hasura/ndc-typescript-deno/pull/77

* Ignores TypeScript diagnostic error codes that Deno itself ignores.
* Fixes the target compilation language which got broken in PR #63
* Fatal errors occurring on a particular file are prefixed with FATAL too.

## v0.17

Fixing issue with preVendor default.

PR: https://github.com/hasura/ndc-typescript-deno/pull/76

* Was only applying the default during user-interactive config flows

Fixing NPM inference.

PR: https://github.com/hasura/ndc-typescript-deno/pull/75

* Creates node_modules and uses it for inference when vendoring npm dependencies

## v0.16

Prevendoring by default.

PR: https://github.com/hasura/ndc-typescript-deno/pull/74

* Using defaults of `{"preVendor": true}` to minimise setup required for development

## v0.15

Updating TypeScript target version from ES2017 to ES2022.

PR: https://github.com/hasura/ndc-typescript-deno/pull/73

* Resolves issues with some dependencies such as deno.land/x/postgres@v0.17.0

## v0.14.1

Diff: b1bdc55..17e85d5

Hotfix for infer bug.

* Fixes: Infer command logging informational output on stdout

## v0.14

PR: https://github.com/hasura/ndc-typescript-deno/pull/70

* Fixes: #61 - Use a better check for inline object type detection
* Fixes: #33 - Detect Object and Array scenarios using TS library functions
* Fixes: #45 - Infinite loop for certain function definitions
* Fixes: #51 - Inferring result for non-annotated functions.
* Fixes: #31 - Find a better implementation of is_struct that is type aware
* Fixes: #58 - Generic type parameters are not handled correctly

## v0.13

PR: https://github.com/hasura/ndc-typescript-deno/pull/62

* Helpful listing of functions/procedures when performing inference

## v0.12

PR: https://github.com/hasura/ndc-typescript-deno/pull/60

* Use positional names for inline types

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
