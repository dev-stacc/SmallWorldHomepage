import type { Status } from "@/theme/status";

export type HistoryRecord = {
    revision: string;
    status: string;
    at: string;
    duration: string;
    count: number | null;
};

export type FluxSource = {
    namespace: string;
    name: string;
    interval: string;
    revision: string;
    short: string;
    artifact_at: number | null;
    ready: string;
};

export type FluxResource = {
    kind: string;
    namespace: string;
    name: string;
    ready: string;
    reason: string;
    message: string;
    changed_at: number | null;
    suspended: boolean;
    interval: string;
    applied: string;
    attempted: string;
    history: HistoryRecord[];
    path?: string;
    source?: string;
    source_revision?: string;
    partial?: boolean;
    drifted?: boolean;
    drift_age?: number | null;
    stuck?: boolean;
    chart?: string;
    wanted?: string;
    version?: string;
    release?: number | null;
    action?: string;
    failures?: number;
    upgrade_failures?: number;
};

export type TimelineSlot = {
    revision: string;
    at: string;
    status: string;
    resources: string[];
    duration: number;
};

export type FluxState = {
    sources?: Record<string, FluxSource>;
    kustomizations?: FluxResource[];
    helmreleases?: FluxResource[];
    timeline?: TimelineSlot[];
    drift?: {
        revision: string;
        pending: string[];
        stuck: boolean;
        in_sync: boolean;
    };
    counts?: {
        total: number;
        failing: number;
        suspended: number;
        drifted: number;
    };
};

export const resourceStatus = (entry: FluxResource): Status => {
    if (entry.stuck === true) {
        return "critical";
    }
    if (entry.suspended) {
        return "attention";
    }
    if (entry.ready === "True") {
        return entry.drifted === true ? "attention" : "good";
    }
    if (entry.ready === "Unknown") {
        return "attention";
    }
    return "critical";
};

export const resourceNote = (entry: FluxResource): string => {
    if (entry.drifted === true) {
        return "drifted";
    }
    if (entry.suspended) {
        return "suspended";
    }
    if (entry.ready !== "True") {
        const failures = (entry.upgrade_failures ?? 0) + (entry.failures ?? 0);
        return failures > 0 ? failures + " failures" : entry.reason || "not ready";
    }
    return "in sync";
};

export const shortRevision = (revision: string | undefined): string => {
    if (revision === undefined || revision === "") {
        return "-";
    }
    const tail = revision.includes(":") ? revision.split(":").pop() : revision;
    return (tail ?? revision).slice(0, 7);
};

export const prettyDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
        return "-";
    }
    if (seconds < 1) {
        return Math.round(seconds * 1000) + "ms";
    }
    return seconds.toFixed(1) + "s";
};

export const parseDuration = (text: string | undefined): number | null => {
    if (text === undefined || text === "") {
        return null;
    }
    const match = /^([0-9]*\.?[0-9]+)(ms|s|m|h)$/.exec(text.trim());
    if (match === null) {
        return null;
    }
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === "ms") {
        return value / 1000;
    }
    if (unit === "m") {
        return value * 60;
    }
    if (unit === "h") {
        return value * 3600;
    }
    return value;
};
