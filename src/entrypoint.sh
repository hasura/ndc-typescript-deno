#!/usr/bin/env sh

####
# This script serves as the entrypoint for the Dockerfile
####

set -e

mkdir -p /functions/src && cd /functions

if [ ! -f ./src/index.ts ]
then
  if [ -n "$FUNCTIONS_TAR_URL" ]
  then
    curl -o /tmp/functions.tar.gz "$FUNCTIONS_TAR_URL" 
    tar -xvzf /tmp/functions.tar.gz
    mv /tmp/functions/* /functions/src/
    rm -r /tmp/functions
    rm /tmp/functions.tar.gz
  else
    echo -e "No /functions/src/index.ts found\nPlease mount your functions onto /functions/src or provide FUNCTIONS_TAR_URL"
    exit 0
  fi
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
