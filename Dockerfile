FROM denoland/deno:alpine-1.37.1

RUN mkdir /etc/connector
COPY ./src /app
COPY ./functions /functions/src
WORKDIR /functions/src

# Pre-cache inference results and dependencies
RUN EARLY_ENTRYPOINT_EXIT=true /app/entrypoint.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD [ ]
