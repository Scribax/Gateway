FROM alpine/git:2.49.1 AS source

ARG NEW_API_VERSION=v1.0.0-rc.24
RUN git clone --depth 1 --branch "${NEW_API_VERSION}" https://github.com/Calcium-Ion/new-api.git /source
COPY deploy/new-api/email-template.patch /tmp/email-template.patch
RUN cd /source && git apply --check /tmp/email-template.patch && git apply /tmp/email-template.patch

FROM oven/bun:1@sha256:0733e50325078969732ebe3b15ce4c4be5082f18c4ac1a0f0ca4839c2e4e42a7 AS web-builder

WORKDIR /build/web
COPY --from=source /source/web/package.json /source/web/bun.lock ./
RUN bun install --frozen-lockfile
COPY --from=source /source/web ./
COPY --from=source /source/VERSION /build/VERSION
RUN DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION=$(cat /build/VERSION) bun run build

FROM golang:1.26.1-alpine@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039 AS api-builder

ENV GO111MODULE=on CGO_ENABLED=0 GOWORK=off
ARG TARGETOS
ARG TARGETARCH
ENV GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64}
ENV GOEXPERIMENT=greenteagc

WORKDIR /build
COPY --from=source /source/go.mod /source/go.sum ./
COPY --from=source /source/relaykit/go.mod ./relaykit/go.mod
RUN go mod download
COPY --from=source /source ./
COPY --from=web-builder /build/web/dist ./web/dist
RUN go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o new-api

FROM debian:bookworm-slim@sha256:f06537653ac770703bc45b4b113475bd402f451e85223f0f2837acbf89ab020a

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata libasan8 wget \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY --from=api-builder /build/new-api /
COPY --from=source /source/LICENSE /source/NOTICE /source/THIRD-PARTY-LICENSES.md /licenses/
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/new-api"]
