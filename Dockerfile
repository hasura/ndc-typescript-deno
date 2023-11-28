FROM denoland/deno:alpine-1.38.3

RUN mkdir /etc/connector
COPY ./src /app
COPY ./functions /functions/src
WORKDIR /functions/src

# Pre-cache inference results and dependencies
RUN PRECACHE_ONLY=true /app/entrypoint.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD [ ]
