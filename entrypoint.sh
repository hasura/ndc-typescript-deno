#!/bin/bash

echo "$@"

# Is the config available to the entrypoint?
# Is that passed in with --ENV

$HOME/.deno/bin/deno vendor /resources/functions.ts
$HOME/.deno/bin/deno run --allow-env --allow-sys --allow-read --allow-net /resources/infer.ts /resources/functions.ts
$HOME/.deno/bin/deno run --allow-env --allow-net /resources/functions.ts & # Server

/bin/connector

# -- 1. Fix certifcates
# 2. Don't require volumes to be specified --- Linked to the connector create command
# 3. Fix entrypoint
#   3.a. Run inference on actual typescript sources
#     - Env var?
#     - Vendor deps
#   3.b. Run the deno server serving the functions in background
#     - Package functions with server shim
#   3.c. Run typescript connector binary in foreground
# 4. Remove sending things to deno
# 5. Test with localhost as deno host
# 6. Test with connector create