#!/bin/bash

echo "$@"

typescript_source=/functions/main.ts
typescript_directory=/functions

cp src/server.ts "$typescript_directory"
cp src/infer.ts "$typescript_directory"
cp src/deno.d.ts "$typescript_directory"

cd "$typescript_directory"

if [ -d vendor ] && [ -f /schema.json ]
then
  echo "already found vendor and inference results"
else
  /root/.deno/bin/deno vendor -f server.ts
  /root/.deno/bin/deno run --allow-env --allow-sys --allow-read --allow-net infer.ts funcs.ts 2>/inference_errors.txt > /schema.json
  if [ $? -eq 0 ]
  then
    echo "Inference Successful"
  else
    echo "Inference Failed"
    cat /inference_errors.txt
    exit 1
  fi
fi

if [ "$EARLY_ENTRYPOINT_EXIT" ]
then
  echo "Thanks for running pre-caching - Please come again soon!"
  exit 0
fi

echo '' | parallel --ungroup --halt-on-error 2 ::: "$*" '/root/.deno/bin/deno run --import-map=vendor/import_map.json --allow-env --allow-net server.ts'
