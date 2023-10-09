#!/bin/sh

####
# This script serves as the entrypoint for the Dockerfile
# It is used both during the build phase (with EARLY_ENTRYPOINT_EXIT=true), and during the run phase.
# This could be split into two scripts easily enough if that is required.
####

set -e

echo "$@"

cd /functions

if [ -d vendor ]
then
  echo "found existing vendor results"
else
  deno vendor -f index.ts
  deno vendor -f /app/mod.ts
fi

if [ -f schema.json ]
then
  echo "found existing inference results"
else
  deno run \
    --allow-env --allow-sys --allow-read --allow-net --allow-write \
    --import-map vendor/import_map.json \
    /app/mod.ts infer \
      --vendor /functions/vendor \
      index.ts >schema.json
fi

if [ "$EARLY_ENTRYPOINT_EXIT" ]
then
  echo "Thanks for running pre-caching - Please come again soon!"
  exit 0
fi

# The config is always the same for `connector create`
echo '{"functions": "/functions/index.ts", "vendor": "/functions/vendor", "schemaMode": "READ", "schemaLocation": "/functions/schema.json"}' \
  > /config.json

deno run \
  --allow-run --allow-net --allow-read --allow-write --allow-env --allow-sys \
  --import-map vendor/import_map.json \
  /app/mod.ts serve \
  --port 8080 \
  --configuration /config.json
