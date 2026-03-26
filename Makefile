.PHONY: install
install:
	bun install

.PHONY: install_ci
install_ci:
	bun install --frozen-lockfile

.PHONY: dev
dev:
	bun run dev

.PHONY: build
build:
	bun run build

.PHONY: test
test:
	bun run test

.PHONY: test_coverage
test_coverage:
	bun run test:coverage

.PHONY: test_watch
test_watch:
	bun run test:watch

.PHONY: lint
lint:
	bun run lint

.PHONY: lint_text
lint_text:
	bun run lint:text

.PHONY: typecheck
typecheck:
	bun run typecheck

.PHONY: format
format:
	bun run format

.PHONY: format_check
format_check:
	bun run format:check

.PHONY: before-commit
before-commit: lint_text format_check typecheck test build

.PHONY: db_generate
db_generate:
	bun run db:generate

.PHONY: db_migrate
db_migrate:
	bun run db:migrate

.PHONY: db_push
db_push:
	bun run db:push

.PHONY: db_studio
db_studio:
	bun run db:studio
