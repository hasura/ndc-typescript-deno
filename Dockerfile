FROM denoland/deno:alpine-1.37.1

COPY ./src /app
COPY ./functions /functions 
WORKDIR /functions

RUN ls /app

# Pre-cache inference results and dependencies
# RUN echo ' {"functions": "/functions/index.ts", "vendor": "/functions/vendor"} ' > /etc/connector/config.json
RUN EARLY_ENTRYPOINT_EXIT=true sh /app/entrypoint.sh

ENTRYPOINT [ "sh", "/app/entrypoint.sh", "deno"]

CMD [ \
  "run", \
  "--allow-run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-sys", \
  "--import-map", "vendor/import_map.json", \
  "/app/main.ts", "serve", \
  "--port", "8080", \
  "--configuration", "/etc/connector/config.json" \
  ]
