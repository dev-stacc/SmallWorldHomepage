import type { Status } from "@/theme/status";

export type SnapshotGroup = {
    id: string;
    host: string;
    paths: string[];
    age_hours: number | null;
    short_id: string;
    expected?: boolean;
};

export type RepoStats = {
    snapshots: number | null;
    size: number | null;
    ratio: number | null;
};

export type ResticUnit = {
    host: string;
    unit: string;
    lines: number;
    fails: number;
    ok: boolean;
};

export type BackupsState = {
    groups?: SnapshotGroup[];
    repo?: RepoStats;
    units?: ResticUnit[];
    display?: { age_hours: number | null; host: string };
};

export type DiskState = Record<string, { fails: number; ok: boolean }>;

export const snapshotStatus = (
    ageHours: number | null | undefined,
    staleHours: number,
    expected: boolean = true,
): { status: Status; label: string } => {
    if (!expected) {
        return { status: "neutral", label: "retired" };
    }
    if (ageHours === null || ageHours === undefined) {
        return { status: "unknown", label: "?" };
    }
    if (ageHours > staleHours * 2) {
        return { status: "critical", label: "old" };
    }
    if (ageHours > staleHours) {
        return { status: "attention", label: "late" };
    }
    return { status: "good", label: "ok" };
};

export const shortPaths = (paths: readonly string[]): string =>
    paths
        .map((path) => {
            const trimmed = path.replace(/\/+$/, "");
            const tail = trimmed.split("/").pop();
            return tail === undefined || tail === "" ? "/" : tail;
        })
        .join("+");

const UNITS = ["B", "K", "M", "G", "T", "P"] as const;

export const humanSize = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
        return "--";
    }

    let value = bytes;
    let index = 0;

    while (value >= 1024 && index < UNITS.length - 1) {
        value = value / 1024;
        index = index + 1;
    }

    return (index === 0 ? Math.round(value) : value.toFixed(1)) + (UNITS[index] ?? "");
};

export const hoursAgo = (ageHours: number | null | undefined): string =>
    ageHours === null || ageHours === undefined ? "--" : ageHours.toFixed(1) + "h";
