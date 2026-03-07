# List available commands
help:
    @just --list

install:
    bun install

dev:
    bun dev

build:
    bun run build

preview:
    bun preview

test:
    bun run test

test-ui:
    bun test:ui

test-coverage:
    bun test:coverage

lint:
    bun lint

format:
    bun format

check:
    bun check

type-check:
    bun tsc --noEmit

clean:
    rm -rf dist node_modules
