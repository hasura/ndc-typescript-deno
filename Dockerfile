FROM denoland/deno:alpine-1.37.1

COPY ./src /app
COPY ./functions /functions 
WORKDIR /functions

RUN ls /app

# Pre-cache inference results and dependencies
RUN EARLY_ENTRYPOINT_EXIT=true sh /app/entrypoint.sh

ENTRYPOINT [ "sh", "/app/entrypoint.sh" ]

CMD [ ]
