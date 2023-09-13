#!/bin/bash

echo "$@"

typescript_source=$(jq -r .typescript_source </config.json)
typescript_directory=$(dirname "$typescript_source")

cp src/server.ts "$typescript_directory"
cp infer.ts "$typescript_directory"
cp "$typescript_source" "$typescript_directory"/funcs.ts

(
  cd "$typescript_directory"
  $HOME/.deno/bin/deno vendor funcs.ts
  $HOME/.deno/bin/deno run --allow-env --allow-sys --allow-read --allow-net infer.ts funcs.ts > /schema.json
  $HOME/.deno/bin/deno run --allow-env --allow-net server.ts & # Server
)

# Is the config available to the entrypoint?
# Is that passed in with --ENV

"$@"

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