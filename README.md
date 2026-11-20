# SmallWorldHomepage

A dashboard for a small Kubernetes cluster and the hosts behind it: a service
catalog with liveness overlaid, per-host metrics, cluster and Flux state, and
backup snapshot tracking.

This repository talks to nothing. It ships a snapshot of dummy data instead:
every host, service, snapshot and alert you see is invented, and nothing here
resolves to a real machine.

Same code, same UI, no fleet.

## Running

```
nix develop
npm install
npm run dev
```

No collector to stand up, no config file to write. The app starts in fixture
mode on <http://127.0.0.1:3000> and every page renders populated.

## Fixture mode

`src/lib/fixture.ts` holds the gate. With `FIXTURES` left at its default:

- `loadConfig()` reads `config.example.json` instead of `CONFIG_PATH`
- `fetchCollector()` reads `fixtures/state.example.json` instead of calling a
  collector, and does not attempt the request at all when `COLLECTOR_URL` is
  unset
- `fetchAgents()` falls back to `fixtures/agents/<host>.json` per host

A `fixtures` marker sits in the tab bar whenever the gate is on, so a generated
page cannot be mistaken for a live one. `FIXTURES=0` turns the whole fallback
off, and each page then reports its missing source rather than inventing data.

The dummy data is part of the deployable artifact, not just a dev convenience:
`next.config.ts` traces `fixtures/` and `config.example.json` into the
standalone bundle, and the Dockerfile keeps them in the runtime image.

### Fixture time tokens

Absolute timestamps in a fixture go stale and trip the stale-data warnings, so
the fixtures use tokens that are resolved on read:

- `@now` / `@now-<seconds>` becomes an epoch-seconds number
- `@iso` / `@iso-<seconds>` becomes an ISO 8601 string

Both the in-process fallback and the mock servers resolve them, so a fixture
always reads as freshly collected.

### Exercising the live paths

The fixtures can also be served over HTTP, which is how the real data paths get
tested without a fleet:

```
npm run mock           # collector on 127.0.0.1:9847
npm run mock:agents    # one agent per fixture host, from 127.0.0.1:9851
COLLECTOR_URL=http://127.0.0.1:9847 npm run dev
```

The agent URLs in `config.example.json` already point at those mock ports. With
no mock running the connection is refused immediately and the per-host fixture
takes over, which is why the page is fast rather than waiting out five
timeouts.

## Pages

| Route      | Shows                                                   |
| ---------- | ------------------------------------------------------- |
| `/links`   | Service catalog with liveness overlaid                  |
| `/load`    | Per-host CPU, memory, disks, filesystems, GPUs          |
| `/k8s`     | Nodes, pods, restarts, degraded workloads, alerts       |
| `/flux`    | Sources, kustomizations, helm releases, drift, timeline |
| `/backups` | Restic snapshot groups, units, repository stats         |
| `/healthz` | Liveness probe                                          |

`/` redirects to `/links`.

## Configuration

`CONFIG_PATH` points at a single JSON object; `config.example.json` is both the
fixture-mode default and the documented shape, holding `links`,
`expectedBackups`, `backupStaleHours`, `agents` and `resticRepo`.

`expectedBackups` is what makes a _missing_ backup visible. A collector only
reports snapshots that exist, so a backup group that has stopped running
entirely would otherwise just vanish from the page instead of being flagged
`gone`.

The catalog is deliberately separate from the collector. Liveness is overlaid
from `/state.json`, but the links themselves render from the catalog alone, so
navigation still works when the collector is down. Services the collector has
not probed show as `unknown` rather than `down`.

`CONFIG_PATH` must be absolute. Next's standalone `server.js` calls
`process.chdir(__dirname)`, so a relative path silently resolves inside
`.next/standalone`; the loader rejects relative paths rather than guessing.

| Variable        | Default                                  |
| --------------- | ---------------------------------------- |
| `FIXTURES`      | on — set `0` to require real sources     |
| `CONFIG_PATH`   | `config.example.json` in fixture mode    |
| `COLLECTOR_URL` | unset — fixture snapshot in fixture mode |
| `AGENT_TOKEN`   | unset — sent as a bearer token when set  |
| `THEME_*`       | see `.env.example`                       |

## Stat agents

`/load` reads host metrics from one read-only agent per host rather than from
the cluster, so the charts survive a cluster outage. Each entry in `agents`
carries a `priority`, and `GET <url>/stats` returns:

```
host, at, uptime
cpu        { cores, load1, load5, load15, usage, temp_c }
memory     { total, available, used, swap_total, swap_used }
filesystems[] { mount, device, total, used_bytes, used }
disks[]       { name, model, temp_c, health, power_on_hours, written_bytes }
gpus[]        { name, model, usage, vram_total, vram_used, temp_c, power_w }
history    { interval, cpu_usage[], mem_used[], cpu_temp_c[], gpu_usage[] }
errors     { <subsystem>: message }
```

Everything is an array or nullable on purpose, so disk, GPU and filesystem
counts are never assumed. `usage` and `used` are fractions from 0 to 1.
`history` is a rolling window, newest sample last. A subsystem the agent cannot
read reports in `errors` and still returns everything else. `401` or `403` is
reported as a rejected token rather than an unreachable host, since those fail
for opposite reasons.

Charts are hand-rolled inline SVG with no chart library: `Spark` for history
(splitting the line on null samples rather than interpolating over gaps) and
`Donut` for usage fractions, coloured `good` under 75%, `attention` under 90%,
`critical` above.

### Host prioritisation

Each agent declares a `priority` of `critical`, `watch` or `ignore`. It does two
things:

- **Ordering.** Hosts sort by priority tier first, then by current severity
  within the tier, then by name. A failing `critical` host is always above a
  healthy one, and a hot `watch` box never outranks a quiet `critical` one.
- **Severity of absence.** An unreachable `critical` host reads `critical`; an
  unreachable `watch` host reads `attention`. The same silence means different
  things depending on the host.

`ignore` hosts render last and dimmed. The tier also shows as a left border on
the card: solid for `critical`, faint for `watch`, none for `ignore`. GPU,
filesystem and disk detail lives inside each host's card rather than in flat
page-wide sections, so one host is one place to look.

## Theme

The palette is injected at runtime as `THEME_BASE00` through `THEME_BASE08`. It
is a custom remap, not a standard base16 scheme: `base02` is the main red
foreground, `base07` is the border colour, and `base09` through `base0F` are
unused and must never be referenced. Status colours are green for good, yellow
for needs-attention, cyan for highlight or selected, red as the ordinary
foreground.

Both fonts are bundled as woff2 and served from `public/fonts`, because neither
is installed on a phone and the aesthetic silently degrades to a system font
without them. **Neuromax** carries display text and headings; it is
proportional despite the name. **Departure Mono** carries numeric columns via
`--numeric-font`, and since it is pixel-grid designed, `THEME_NUMERIC_SIZE` is
an integer px value rounded on read, kept separate from the pt-based body size.

## Stack

Next.js 16 App Router, React 19, TypeScript in strict mode, no client-side data
fetching and no CSS framework — the whole interface is a hand-written grid in
`src/app/globals.css`. `npm run lint`, `npm run typecheck`, `npm run
format:check` and `npm run build` all run in CI and must pass.
