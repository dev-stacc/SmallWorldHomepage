import { join } from "node:path";

// The bundled dummy data is not a development-only convenience: with nothing
// configured it is the only data source, and that holds in a production build
// too. Set FIXTURES=0 to demand real sources and let the pages report whatever
// is missing instead.
export const FIXTURES = process.env.FIXTURES !== "0";

export const FIXTURE_CONFIG_PATH = (): string =>
    join(process.cwd(), "config.example.json");

export const FIXTURE_STATE_PATH = (): string =>
    join(process.cwd(), "fixtures", "state.example.json");

export const FIXTURE_AGENT_PATH = (host: string): string =>
    join(process.cwd(), "fixtures", "agents", host + ".json");

const SECTIONS = [
    "apps",
    "hosts",
    "nodes",
    "cluster",
    "workloads",
    "flux",
    "backups",
    "disks",
    "alerts",
];

const token = (value: string, now: number): string | number => {
    const epoch = /^@now(?:-([0-9]+))?$/.exec(value);
    if (epoch !== null) {
        return now - Number(epoch[1] ?? 0);
    }

    const iso = /^@iso(?:-([0-9]+))?$/.exec(value);
    if (iso !== null) {
        return new Date((now - Number(iso[1] ?? 0)) * 1000).toISOString();
    }

    return value;
};

const walk = (value: unknown, now: number): unknown => {
    if (typeof value === "string") {
        return token(value, now);
    }
    if (Array.isArray(value)) {
        return value.map((item) => walk(item, now));
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, walk(item, now)]),
        );
    }
    return value;
};

export const hydrateFixture = (raw: unknown): Record<string, unknown> => {
    const now = Math.floor(Date.now() / 1000);
    const resolved = walk(raw, now) as Record<string, unknown>;
    const updated: Record<string, number> = {};

    for (const section of SECTIONS) {
        if (resolved[section] !== undefined) {
            updated[section] = now;
        }
    }

    return { ...resolved, updated_at: updated, generated_at: now };
};
