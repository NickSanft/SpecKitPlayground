# Welcome to Spec Kit Playground

A browser-based editor for drafting **GitHub Spec Kit** artifacts. No CLI, no backend, no telemetry — your work stays in your browser.

## What you can do here

- Draft a `constitution.md` for your project
- Outline features as `spec.md` → `plan.md` → `tasks.md`
- Preview the rendered markdown side-by-side as you type
- Export the whole thing as a `.specify/` zip when you're ready

This is the **Phase 1** scaffold — the editor on the left and the preview on the right are wired up, but the document tree, persistence, and export are still landing in subsequent phases.

## Try it now

Edit this text. The preview updates within ~100 ms. Try things like:

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

Or a list:

1. Write a constitution
2. Draft a spec
3. Plan the implementation
4. Decompose into tasks
5. Build it

> Spec-Driven Development is about treating specifications as the durable artifact and code as the renderable output. This tool gets out of the way so you can focus on the spec.

Learn more about Spec Kit at <https://github.com/github/spec-kit>.
