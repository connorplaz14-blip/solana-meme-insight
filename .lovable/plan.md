**Do I know what the issue is?**
Yes: the strongest build-breaking signal in the current code is `src/lib/data/providers/narrative.server.ts` importing packages that are not declared in `package.json`:

```text
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
```

That typically surfaces as a Rolldown/Vite build failure with a long stack trace like the one shown, where the useful unresolved-import message is above the truncated section.

**Plan**

1. **Add the missing runtime dependencies**
   - Install and persist the AI SDK packages used by the narrative provider:
     - `ai`
     - `@ai-sdk/openai-compatible`

2. **Verify imports stay server-only**
   - Keep AI Gateway code inside `.server.ts` files.
   - Keep client-facing code importing only `live.functions.ts`, never the provider modules directly.

3. **Remove build fragility from generated files**
   - Do not hand-edit `src/routeTree.gen.ts`; let TanStack generate it during build/dev.
   - If the generated route tree has stale content, regenerate via the normal build/dev process rather than editing it manually.

4. **Harden the narrative path for deploy/runtime**
   - Keep `process.env.LOVABLE_API_KEY` reads inside the server function execution path.
   - If the key is absent at runtime, return a graceful fallback narrative instead of crashing the whole route.

5. **Validate the real failing signal**
   - Run the dev build once after the dependency fix.
   - If it still fails, inspect the full first Rolldown error line and address the next unresolved import or SSR boundary violation.

**Files likely touched**

- `package.json` / lockfile: add missing dependencies.
- `src/lib/data/providers/narrative.server.ts`: optional graceful fallback if the AI key is unavailable.
- No direct edits to `src/routeTree.gen.ts`.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>