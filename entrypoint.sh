#!/bin/bash

echo "$@"

typescript_source=$(jq -r .typescript_source < /etc/connector/config.json)
typescript_directory=$(dirname "$typescript_source")

# TODO: Use filenames that are less likely to conflict
cp src/server.ts "$typescript_directory"
cp src/infer.ts "$typescript_directory"
cp src/deno.d.ts "$typescript_directory"
cp "$typescript_source" "$typescript_directory"/funcs.ts

if ! pushd "$typescript_directory"
then
  echo "Couldn't change dir to $typescript_directory"
  exit 1
fi

/root/.deno/bin/deno vendor funcs.ts
/root/.deno/bin/deno run --allow-env --allow-sys --allow-read --allow-net infer.ts funcs.ts 2>/inference_errors.txt > /schema.json
if [ $? -eq 0 ]
then
  echo "Inference Successful"
else
  echo "Inference Failed"
  cat /inference_errors.txt
  exit 1
fi

/root/.deno/bin/deno run --allow-env --allow-net --allow-env server.ts > /deno_run.log 2>&1 & # Server

if ! popd
then
  echo "Couldn't pop from $typescript_directory"
  exit 1
fi

sleep 30 # TODO: Remove me
cat /deno_run.log

"$@"
