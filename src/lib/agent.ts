import { readFile } from "node:fs/promises";
import { FIXTURE_AGENT_PATH, FIXTURES, hydrateFixture } from "./fixture";

export type Sample = number | null;

export type AgentHistory = {
    interval: number;
    cpu_usage?: Sample[];
    mem_used?: Sample[];
    cpu_temp_c?: Sample[];
    gpu_usage?: Sample[];
};

export type AgentTrend = {
    bucket: number;
    start: number;
    cpu_usage?: Sample[];
    mem_used?: Sample[];
    cpu_temp_c?: Sample[];
    gpu_usage?: Sample[];
};

export type CpuStats = {
    cores: number | null;
    load1: number | null;
    load5: number | null;
    load15: number | null;
    usage: number | null;
    temp_c: number | null;
};

export type MemoryStats = {
    total: number | null;
    available: number | null;
    used: number | null;
    swap_total: number | null;
    swap_used: number | null;
};

export type Filesystem = {
    mount: string;
    device: string;
    total: number | null;
    used_bytes: number | null;
    used: number | null;
};

export type Disk = {
    name: string;
    model: string;
    temp_c: number | null;
    health: string;
    power_on_hours: number | null;
    written_bytes: number | null;
};

export type Gpu = {
    name: string;
    model: string;
    usage: number | null;
    vram_total: number | null;
    vram_used: number | null;
    temp_c: number | null;
    power_w: number | null;
};

export type AgentStats = {
    host: string;
    at: number | null;
    uptime: number | null;
    cpu?: CpuStats;
    memory?: MemoryStats;
    filesystems?: Filesystem[];
    disks?: Disk[];
    gpus?: Gpu[];
    history?: AgentHistory;
    trend?: AgentTrend;
    errors?: Record<string, string>;
};

export type AgentResult = {
    fixture: boolean;
    host: string;
    stats: AgentStats | null;
    error: string | null;
};

const TIMEOUT_MS = 3000;

const describe = (error: unknown): string => {
    if (error instanceof Error) {
        return error.name === "TimeoutError" ? "timed out" : error.message;
    }
    return "unreachable";
};

const fetchOne = async (
    host: string,
    url: string,
    token: string | undefined,
): Promise<AgentResult> => {
    try {
        const response = await fetch(url.replace(/\/+$/, "") + "/stats", {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers:
                token === undefined || token === ""
                    ? undefined
                    : { Authorization: "Bearer " + token },
        });

        if (response.status === 401 || response.status === 403) {
            return {
                host,
                stats: null,
                error: "agent rejected the token",
                fixture: false,
            };
        }

        if (!response.ok) {
            return {
                host,
                stats: null,
                error: "agent returned " + response.status,
                fixture: false,
            };
        }

        return {
            host,
            stats: (await response.json()) as AgentStats,
            error: null,
            fixture: false,
        };
    } catch (error) {
        return { host, stats: null, error: describe(error), fixture: false };
    }
};

const hostFixture = async (host: string): Promise<AgentResult> => {
    try {
        const body = await readFile(FIXTURE_AGENT_PATH(host), "utf8");
        return {
            host,
            stats: hydrateFixture(JSON.parse(body)) as unknown as AgentStats,
            error: null,
            fixture: true,
        };
    } catch {
        return { host, stats: null, error: "no fixture for " + host, fixture: false };
    }
};

export const fetchAgents = async (
    targets: readonly { host: string; url: string }[],
): Promise<AgentResult[]> => {
    const token = process.env.AGENT_TOKEN;

    const results = await Promise.all(
        targets.map(async (target) => {
            const result = await fetchOne(target.host, target.url, token);
            return result.stats === null && FIXTURES ? hostFixture(target.host) : result;
        }),
    );

    return results.sort((a, b) => a.host.localeCompare(b.host));
};

export const fraction = (value: number | null | undefined): number | null => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return null;
    }
    return Math.min(1, Math.max(0, value));
};

export const percent = (value: number | null | undefined): string => {
    const clamped = fraction(value);
    return clamped === null ? "--" : Math.round(clamped * 100) + "%";
};

export const celsius = (value: number | null | undefined): string =>
    value === null || value === undefined || !Number.isFinite(value)
        ? "--"
        : Math.round(value) + "°";

export const uptimeLabel = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
        return "--";
    }
    const days = Math.floor(seconds / 86400);
    if (days > 0) {
        return days + "d";
    }
    const hours = Math.floor(seconds / 3600);
    return hours > 0 ? hours + "h" : Math.floor(seconds / 60) + "m";
};

export const diskStatus = (health: string): "good" | "critical" | "unknown" => {
    if (health === "") {
        return "unknown";
    }
    return health.toUpperCase() === "PASSED" ? "good" : "critical";
};
