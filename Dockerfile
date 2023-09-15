FROM rust:1.72-slim-buster AS build

WORKDIR /app

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive \
  apt-get install --no-install-recommends --assume-yes \
  lld libssl-dev ssh git pkg-config

ENV RUSTFLAGS="-C link-arg=-fuse-ld=lld"

COPY . .

RUN cargo build --release --all-targets

FROM debian:buster-slim as ndc-deno
WORKDIR /app
COPY --from=build /app/target/release/ndc-typescript-deno ./ndc-typescript-deno
COPY ./entrypoint.sh ./entrypoint.sh
COPY ./functions /functions 
COPY ./src ./src
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive \
  apt-get install --no-install-recommends --assume-yes \
  unzip curl libssl-dev ca-certificates jq parallel
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

ENTRYPOINT [ "./entrypoint.sh", "./ndc-typescript-deno"]
CMD ["serve", "--configuration", "/etc/connector/config.json", "--port", "8080"]
