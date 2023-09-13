#!/bin/bash

echo "$@"

typescript_source=$(jq -r .typescript_source < /etc/connector/config.json)
typescript_directory=$(dirname "$typescript_source")

cp src/server.ts "$typescript_directory"
cp src/infer.ts "$typescript_directory"
cp "$typescript_source" "$typescript_directory"/funcs.ts

(
  cd "$typescript_directory"
  /root/.deno/bin/deno vendor funcs.ts
  /root/.deno/bin/deno run --allow-env --allow-sys --allow-read --allow-net infer.ts funcs.ts > /schema.json
  /root/.deno/bin/deno run --allow-env --allow-net server.ts & # Server
)

"$@"
