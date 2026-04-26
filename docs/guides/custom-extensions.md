# Custom Extensions

Generated projects ship with a registry pattern for storage, auth, event-store, and codec backends. The set of registered backends matches what you declared in `schema.morph` under `extensions { ... }`. Sometimes you want a backend Morph doesn't ship — say a Postgres storage backend, or a custom auth scheme tied to your company SSO. This page walks through adding one *inside a generated project*, without forking Morph.

For adding a backend *to Morph itself* (so it's available to all users), see [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## The shape

Each extension category has the same architecture in your generated project:

- An interface in `contexts/<context>/core/src/services/<category>/index.ts` (e.g. `Storage`).
- A registry that maps a string identifier (`"memory"`, `"sqlite"`, ...) to a `Layer` providing that interface.
- An env-var resolver — `<APP>_STORAGE=sqlite` selects the backend at runtime.

To add a custom backend you write a new `Layer`, register it under a new identifier, and select it via env var.

## Example: Postgres storage

1. **Install your driver** (`bun add postgres` or whichever).

2. **Implement the storage interface.** Add a file alongside the existing impls:

   ```ts
   // contexts/pastes/core/src/services/storage/postgres.ts
   import { Layer, Effect } from "effect";
   import postgres from "postgres";
   import { PasteRepository } from "./index";

   export const PasteRepositoryPostgres = Layer.effect(
     PasteRepository,
     Effect.gen(function* () {
       const url = process.env["PASTEBIN_POSTGRES_URL"];
       if (!url) return yield* Effect.die("PASTEBIN_POSTGRES_URL not set");
       const sql = postgres(url);
       return {
         save: (paste) => Effect.tryPromise(() =>
           sql`INSERT INTO pastes ${sql(paste)}`),
         findById: (id) => Effect.tryPromise(() =>
           sql`SELECT * FROM pastes WHERE id = ${id}`).pipe(/* ... */),
         // ...
       };
     }),
   );
   ```

3. **Register the layer.** Find the registry (e.g. `contexts/pastes/core/src/services/storage/registry.ts`) and add your identifier:

   ```ts
   import { PasteRepositoryPostgres } from "./postgres";

   export const STORAGE_REGISTRY = {
     memory: PasteRepositoryInMemory,
     sqlite: PasteRepositorySqlite,
     postgres: PasteRepositoryPostgres,  // <-- add this
   } as const;
   ```

4. **Run with the new backend:**

   ```sh
   PASTEBIN_STORAGE=postgres PASTEBIN_POSTGRES_URL=postgres://... \
     bun run --filter '@pastebin/api' start
   ```

The same pattern applies to auth (`AuthService` Layer), event store (`EventStore` Layer), and codecs.

## Caveat: regeneration may overwrite

The registry file is generated. If you add a new backend identifier directly into `registry.ts`, a future `bunx @morphdsl/cli generation:generate` will revert it.

Two options:

- **Wrap rather than edit.** Re-export the generated registry from a wrapper file you own, merging in your custom backend. Reference the wrapper from your app's entry point.
- **Vendor the schema and add the extension.** Declare your custom backend in `schema.morph` (`extensions { storage [memory, sqlite, postgres] default memory }`) and let the generator pick it up. This works for *categories* Morph already knows about. For genuinely new categories (a brand new "cache" extension say), you're back to the wrapper approach until that category is added to Morph itself.

## When you should fork instead

If you find yourself maintaining several custom backends across multiple projects, that's a signal to add the backend to Morph proper (it'll then be available via `extensions { storage [..., yours] }`) — see the contributing guide. Local wrappers are fine for one-off needs but add maintenance burden long-term.
