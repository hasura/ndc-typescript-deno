#!/usr/bin/env sh

####
# This script serves as the entrypoint for the Dockerfile
# It is used both during the build phase (with PRECACHE_ONLY=true), and during the run phase.
# This could be split into two scripts easily enough if that is required.
####

set -e

cd /functions

if [ ! -f ./src/index.ts ]
then
  echo "No /functions/src/index.ts found - Please place your functions in /functions/src"
  exit 0
fi

if [ -d vendor ]
then
  echo "found existing vendor results"
else
  deno vendor --node-modules-dir --vendor /functions/vendor -f ./src/index.ts
fi

if [ -f schema.json ]
then
  echo "found existing inference results"
else
  deno run \
    --allow-env --allow-sys --allow-read --allow-net --allow-write \
    /app/mod.ts infer \
      --vendor /functions/vendor \
      ./src/index.ts >schema.json
fi

if [ "$PRECACHE_ONLY" ]
then
  echo "Thanks for running pre-caching - Please come again soon!"
  exit 0
fi

if [[ "$WATCH" == "1" || "$WATCH" == "true" ]]
then
  DENO_PARAMS="--watch=/functions/src --no-clear-screen"
  echo '{"functions": "/functions/src/index.ts", "vendor": "/functions/vendor", "preVendor": true, "schemaMode": "INFER" }' \
    > /etc/connector-config.json

else
  DENO_PARAMS=""
  echo '{"functions": "/functions/src/index.ts", "vendor": "/functions/vendor", "preVendor": false, "schemaMode": "READ", "schemaLocation": "/functions/schema.json"}' \
    > /etc/connector-config.json
fi

deno run \
  --allow-run --allow-net --allow-read --allow-write --allow-env --allow-sys \
  $DENO_PARAMS \
  /app/mod.ts serve \
  --port 8080 \
  --configuration /etc/connector-config.json
