import { fraction, diskStatus, type AgentResult } from "./agent";
import { PRIORITY_RANK, type AgentTarget, type Priority } from "./config";
import { usageStatus } from "@/components/Donut";
import { worst, type Status } from "@/theme/status";

export type HostView = AgentResult & {
    priority: Priority;
    status: Status;
};

const SEVERITY: Record<Status, number> = {
    critical: 0,
    attention: 1,
    unknown: 2,
    neutral: 3,
    good: 4,
};

const hostStatus = (result: AgentResult, priority: Priority): Status => {
    if (result.stats === null) {
        return priority === "critical" ? "critical" : "attention";
    }

    const stats = result.stats;

    const parts: Status[] = [
        usageStatus(fraction(stats.cpu?.usage)),
        usageStatus(fraction(stats.memory?.used)),
        ...(stats.filesystems ?? []).map((entry) => usageStatus(fraction(entry.used))),
        ...(stats.disks ?? []).map((entry) => diskStatus(entry.health)),
        ...(stats.gpus ?? []).map((entry) => usageStatus(fraction(entry.usage))),
    ];

    return parts.length === 0 ? "unknown" : worst(parts);
};

export const buildHosts = (
    targets: readonly AgentTarget[],
    results: readonly AgentResult[],
): HostView[] => {
    const priorities = new Map(targets.map((target) => [target.host, target.priority]));

    return results
        .map((result) => {
            const priority = priorities.get(result.host) ?? "watch";
            return { ...result, priority, status: hostStatus(result, priority) };
        })
        .sort(
            (a, b) =>
                PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
                SEVERITY[a.status] - SEVERITY[b.status] ||
                a.host.localeCompare(b.host),
        );
};
