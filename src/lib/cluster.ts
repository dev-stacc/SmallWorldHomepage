import type { Status } from "@/theme/status";

export type NodeEntry = {
    name: string;
    ready: boolean;
    pressure: string[];
    cordoned: boolean;
    kubelet: string;
};

export type ProblemPod = {
    namespace: string;
    name: string;
    phase: string;
    reason: string;
    restarts: number;
    node: string;
};

export type RestartingPod = {
    namespace: string;
    name: string;
    restarts: number;
    node: string;
};

export type ClusterState = {
    nodes?: NodeEntry[];
    pods?: ProblemPod[];
    restarting?: RestartingPod[];
    pod_count?: number;
};

export type DegradedWorkload = {
    kind: string;
    namespace: string;
    name: string;
    ready: number;
    desired: number;
};

export type WarningEvent = {
    namespace: string;
    object: string;
    reason: string;
    message: string;
    stamp: string;
    count: number;
};

export type WorkloadState = {
    degraded?: DegradedWorkload[];
    counts?: Record<string, { ready: number; total: number }>;
    events?: WarningEvent[];
};

export type ActiveAlert = {
    alertname: string;
    severity: string;
    state: string;
    namespace: string;
    target: string;
};

export type AlertState = {
    active?: ActiveAlert[];
    suppressed?: number;
};

export const nodeFlags = (node: NodeEntry): string[] => {
    const flags = [...(node.pressure ?? [])];
    if (node.cordoned) {
        flags.unshift("cordoned");
    }
    return flags;
};

export const nodeStatus = (node: NodeEntry): Status => {
    if (!node.ready) {
        return "critical";
    }
    return nodeFlags(node).length > 0 ? "attention" : "good";
};

export const workloadStatus = (entry: DegradedWorkload): Status =>
    entry.ready === 0 && entry.desired > 0 ? "critical" : "attention";

const FATAL_PHASES = new Set(["Failed", "CrashLoopBackOff"]);

export const podStatus = (pod: ProblemPod): Status =>
    FATAL_PHASES.has(pod.phase) || FATAL_PHASES.has(pod.reason)
        ? "critical"
        : "attention";

export const alertStatus = (alert: ActiveAlert): Status => {
    if (alert.severity === "critical") {
        return "critical";
    }
    if (alert.severity === "warning") {
        return "attention";
    }
    return "neutral";
};

export const WORKLOAD_KINDS = ["Deployment", "StatefulSet", "DaemonSet"] as const;
