
.PHONY: help
help:
	@echo Targets:
	@cat Makefile | grep '^[a-zA-Z]' | sed 's/^/  * /; s/://'

test:
	deno test -A src/test

test-and-watch:
	deno test -A --watch src/test

serve:
	@echo Note, this requires a config argument - Run the command directly.
	deno run -A --watch --check src/mod.ts serve