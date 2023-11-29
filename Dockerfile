FROM denoland/deno:alpine-1.38.3

COPY ./src /app
RUN deno cache /app/mod.ts

COPY ./functions /functions/src

# Pre-cache inference results and dependencies
RUN PRECACHE_ONLY=true /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD [ ]
