FROM denoland/deno:alpine-1.38.3

COPY ./src /app
RUN deno cache /app/mod.ts

EXPOSE 8080

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD [ ]
