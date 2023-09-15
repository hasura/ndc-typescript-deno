#!/bin/bash

echo "$@"

typescript_source=$(jq -r .typescript_source < /etc/connector/config.json)
typescript_directory=$(dirname "$typescript_source")

# TODO: Use filenames that are less likely to conflict
cp src/server.ts "$typescript_directory"
cp src/infer.ts "$typescript_directory"
cp src/deno.d.ts "$typescript_directory"
cp "$typescript_source" "$typescript_directory"/funcs.ts

pushd "$typescript_directory"

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

mkfifo /deno_run.log
/root/.deno/bin/deno run --allow-env --allow-net server.ts > /deno_run.log 2>&1 & # Server

popd

echo '' | parallel --ungroup --halt-on-error 2 ::: "$@" 'tail -f /deno_run.log'
