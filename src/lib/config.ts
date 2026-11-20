import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { FIXTURE_CONFIG_PATH, FIXTURES } from "./fixture";
import { parseLinks, type LinkEntry } from "./links";

export type ExpectedBackup = {
    host: string;
    paths: string[];
};

export type Priority = "critical" | "watch" | "ignore";

export const PRIORITY_RANK: Record<Priority, number> = {
    critical: 0,
    watch: 1,
    ignore: 2,
};

export type AgentTarget = {
    host: string;
    url: string;
    priority: Priority;
};

export type Config = {
    links: LinkEntry[];
    expectedBackups: ExpectedBackup[];
    backupStaleHours: number;
    resticRepo: string;
    agents: AgentTarget[];
};

export const EMPTY: Config = {
    links: [],
    expectedBackups: [],
    backupStaleHours: 36,
    resticRepo: "repository",
    agents: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? value : fallback;

const parseExpected = (raw: unknown): ExpectedBackup[] => {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.flatMap((item) => {
        if (!isRecord(item)) {
            return [];
        }

        const host = text(item.host);
        const paths = Array.isArray(item.paths)
            ? item.paths.filter((path): path is string => typeof path === "string")
            : [];

        return host === "" || paths.length === 0 ? [] : [{ host, paths }];
    });
};

const parseAgents = (raw: unknown): AgentTarget[] => {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.flatMap((item) => {
        if (!isRecord(item)) {
            return [];
        }

        const host = text(item.host);
        const url = text(item.url);
        const declared = text(item.priority, "watch");
        const priority: Priority =
            declared === "critical" || declared === "ignore" || declared === "watch"
                ? declared
                : "watch";

        return host === "" || url === "" ? [] : [{ host, url, priority }];
    });
};

const parse = (raw: unknown): Config => {
    if (!isRecord(raw)) {
        return EMPTY;
    }

    const hours = Number(raw.backupStaleHours);

    return {
        links: parseLinks(raw.links),
        expectedBackups: parseExpected(raw.expectedBackups),
        backupStaleHours:
            Number.isFinite(hours) && hours > 0 ? hours : EMPTY.backupStaleHours,
        agents: parseAgents(raw.agents),
        resticRepo: text(raw.resticRepo, EMPTY.resticRepo),
    };
};

const resolvePath = (): { path: string | null; error: string | null } => {
    const configured = process.env.CONFIG_PATH;

    if (configured !== undefined && configured !== "") {
        return isAbsolute(configured)
            ? { path: configured, error: null }
            : { path: null, error: "CONFIG_PATH must be absolute" };
    }

    if (FIXTURES) {
        return { path: FIXTURE_CONFIG_PATH(), error: null };
    }

    return { path: null, error: "CONFIG_PATH is not set" };
};

const describe = (failure: unknown, path: string): string =>
    (failure instanceof Error ? failure.message : "unreadable") + " (" + path + ")";

export const loadConfig = async (): Promise<{
    config: Config;
    error: string | null;
}> => {
    const { path, error } = resolvePath();

    if (path === null) {
        return { config: EMPTY, error };
    }

    try {
        const body = await readFile(path, "utf8");
        return { config: parse(JSON.parse(body)), error: null };
    } catch (failure) {
        return { config: EMPTY, error: describe(failure, path) };
    }
};

export const groupKey = (host: string, paths: readonly string[]): string =>
    host.toLowerCase() + "|" + [...paths].sort().join(",");
