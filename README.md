# clawtomate

Have you ever been annoyed by AI agents ignoring your instructions?

Force them to do things step by step and not stop until a validation script finishes successfully.

Here's _clawtomate_!

Write markdown. Headings are just headings and delimit steps/sections.

Regular text is interpreted as a prompt.

Use `@` to switch models, e.G.
```
@claude write a sonnet about penguins
```

Use code blocks to create validation steps. They will be executed. If a script exits with an error (exit code != 0) the AI will be repeatedly asked
to fix the error until the script exits with 0.

That's about it.
