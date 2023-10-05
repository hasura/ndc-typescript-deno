#!/bin/sh

echo "$@"

typescript_directory=/functions

cp /app/deno.d.ts "$typescript_directory" # TODO: Find out if there's a better way to put this in scope

cd "$typescript_directory"

if [ -d vendor ]
then
  echo "found existing vendor results"
else
  deno vendor -f index.ts
  if [ $? -ne 0 ]
  then
    echo "Vendor failed for user functions"
    exit 1
  fi

  deno vendor -f /app/main.ts
  if [ $? -ne 0 ]
  then
    echo "Vendor failed for server"
    exit 1
  fi
fi

if [ -f schema.json ]
then
  echo "found existing inference results"
else
  deno run --allow-env --allow-sys --allow-read --allow-net /app/main.ts infer --vendor /functions/vendor index.ts >schema.json
  if [ $? -ne 0 ]
  then
    echo "Inference Failed"
    exit 1
  fi
fi

if [ "$EARLY_ENTRYPOINT_EXIT" ]
then
  echo "Thanks for running pre-caching - Please come again soon!"
  exit 0
fi

$*
