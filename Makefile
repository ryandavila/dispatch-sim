.PHONY: help install dev build preview test test-ui test-coverage clean lint format check type-check

# Default target
help:
	@echo "Available commands:"
	@echo "  make install         - Install dependencies"
	@echo "  make dev            - Start development server"
	@echo "  make build          - Build for production"
	@echo "  make preview        - Preview production build"
	@echo "  make test           - Run unit tests"
	@echo "  make test-ui        - Run tests with UI"
	@echo "  make test-coverage  - Run tests with coverage"
	@echo "  make lint           - Run Biome linter"
	@echo "  make format         - Format code with Biome"
	@echo "  make check          - Run Biome linter and formatter (with fixes)"
	@echo "  make type-check     - Run TypeScript type checking"
	@echo "  make clean          - Clean build artifacts"

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

preview:
	pnpm preview

test:
	pnpm test

test-ui:
	pnpm test:ui

test-coverage:
	pnpm test:coverage

lint:
	pnpm lint

format:
	pnpm format

check:
	pnpm check

type-check:
	pnpm tsc --noEmit

clean:
	rm -rf dist node_modules .pnpm-store
