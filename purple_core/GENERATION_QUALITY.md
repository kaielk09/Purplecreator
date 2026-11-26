# Code generation quality pipeline

Purple Creator must not treat one raw model response as finished code.

1. **Understand the task:** convert the request into a CodingSpec: target, context, requirements, constraints, files, acceptance checks.
2. **Resolve ambiguity:** ask about important missing information; don't guess project-specific names or behavior.
3. **Plan files:** map requirements to a short file plan before generating.
4. **Generate complete code:** no pseudo-code, ellipses, TODO placeholders, or silently omitted logic.
5. **Review:** check delimiters, placeholders, required APIs, execution context, security boundaries, and task requirements.
6. **Test:** when an actual runtime/compiler/test harness exists, run tests and use the exact error output for repair. Static checks alone cannot prove code correctness.
7. **Repair loop:** make targeted fixes, rerun checks, and stop after a configurable limit; if unresolved, report it honestly.
8. **Report confidence honestly:** label checks as static review, compiler-verified, or runtime-tested. Never claim tests ran when they did not.

## Current implementation
- Structured CodingSpec and prompt builder
- Basic Luau source preflight (delimiter/string and placeholder checks)

## Not implemented yet
- A trained language model
- Compiler/runtime integration for Luau
- Automatic web retrieval grounding
- Semantic code review or automatic repair model loop
- Roblox Studio project test integration
