import { readFile } from "node:fs/promises";
import type { FluxState } from "./flux";
import type { AlertState, ClusterState, WorkloadState } from "./cluster";
import type { BackupsState, DiskState } from "./backups";
import { FIXTURE_STATE_PATH, FIXTURES, hydrateFixture } from "./fixture";

export type AppState = {
    name: string;
    up: boolean;
    code: number | null;
    ms: number | null;
    error?: string;
    nav?: boolean;
    group?: string;
    role?: string;
    url?: string;
    label?: string;
    auth?: boolean;
    alert?: boolean;
};

export type HostState = {
    up: boolean;
    ms: number | null;
    error?: string;
    class?: string;
};

export type CollectorState = {
    apps?: AppState[];
    hosts?: Record<string, HostState>;
    nodes?: Record<string, Record<string, number | null>>;
    flux?: FluxState;
    cluster?: ClusterState;
    workloads?: WorkloadState;
    alerts?: AlertState;
    backups?: BackupsState;
    disks?: DiskState;
    errors?: Record<string, string>;
    updated_at?: Record<string, number>;
    tier_ms?: Record<string, number>;
    generated_at?: number;
    ready?: boolean;
};

export type CollectorResult = {
    state: CollectorState | null;
    error: string | null;
    fixture: boolean;
};

const TIMEOUT_MS = 4000;

const loadFixture = async (): Promise<CollectorResult> => {
    try {
        const body = await readFile(FIXTURE_STATE_PATH(), "utf8");
        return {
            state: hydrateFixture(JSON.parse(body)) as CollectorState,
            error: null,
            fixture: true,
        };
    } catch (failure) {
        return {
            state: null,
            error: failure instanceof Error ? failure.message : "fixture unreadable",
            fixture: false,
        };
    }
};

const describe = (error: unknown): string => {
    if (error instanceof Error) {
        return error.name === "TimeoutError" ? "collector timed out" : error.message;
    }
    return "collector unreachable";
};

export const fetchCollector = async (): Promise<CollectorResult> => {
    const configured = process.env.COLLECTOR_URL;

    // No collector configured means the bundled snapshot is all there is, and
    // reaching for the network first would only buy a timeout per request.
    if (configured === undefined || configured === "") {
        return FIXTURES
            ? loadFixture()
            : { state: null, error: "COLLECTOR_URL is not set", fixture: false };
    }

    try {
        const response = await fetch(configured.replace(/\/+$/, "") + "/state.json", {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
            throw new Error("collector returned " + response.status);
        }

        return {
            state: (await response.json()) as CollectorState,
            error: null,
            fixture: false,
        };
    } catch (error) {
        if (FIXTURES) {
            return loadFixture();
        }
        return { state: null, error: describe(error), fixture: false };
    }
};

export const appStates = (state: CollectorState | null): Map<string, AppState> => {
    const index = new Map<string, AppState>();

    for (const app of state?.apps ?? []) {
        if (app !== null && typeof app.name === "string") {
            index.set(app.name, app);
        }
    }

    return index;
};
