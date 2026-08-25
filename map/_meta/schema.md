# Schema

The map is a small System Map. It uses object cards for durable nouns, process cards for real movements, and one effects index for change-impact routing.

## Node Types

| `type:` | Lives at | Carries |
|---|---|---|
| `object` | `../objects/<cluster>/<slug>.md` | Responsibility, source citations, connected objects, first-order change impact |
| `process` | `../processes/<slug>.md` | Input -> movement -> output, cited steps, consumed and produced object links |
| `index` | `../objects/_index.md`, `../effects/CONTEXT.md` | Routing only, not payload |

## Frontmatter

- `type`: `object` or `process`.
- `cluster`: one of `contracts`, `globe`, `modes`, `surfaces`.
- `universe`: `live`, `leftover`, or `ghost`.
- `status`: `verified`, `stub`, or `stale`.
- `verified`: ISO date when source citations were checked.
- `entity`: repository-relative owning path or glob.
- `consumes` / `produces`: relative links from process cards to object cards.

## Naming

- Card filenames use kebab-case.
- One fact has one home. Cards link to source files and do not copy full implementation.
- Future cards must start from `../_templates/object.md` or `../_templates/process.md`.
