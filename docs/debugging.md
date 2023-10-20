# Debugging

Errors may arise from any of the following:

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