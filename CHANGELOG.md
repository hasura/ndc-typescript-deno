# Typescript (Deno) Connector Changelog

This changelog documents the changes between release versions.

`main` serves as a place to stash upcoming changes before they have been released under a version tag.


## main

Changes to be included in the next upcoming releaase.

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
