import { Shell } from "@/components/Shell";
import { Section } from "@/components/Section";
import { Line, Summary } from "@/components/Line";
import { Unavailable } from "@/components/Unavailable";
import { Refresher } from "@/components/Refresher";
import { fetchCollector } from "@/lib/collector";
import { ago, staleBy } from "@/lib/format";
import {
    alertStatus,
    nodeFlags,
    nodeStatus,
    podStatus,
    workloadStatus,
    WORKLOAD_KINDS,
} from "@/lib/cluster";

export const dynamic = "force-dynamic";

const REFRESH_SECONDS = 20;
const STALE_AFTER_SECONDS = 240;

const sinceStamp = (value: string | undefined): string | null => {
    if (value === undefined || value === "") {
        return null;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : ago(parsed / 1000);
};

export default async function K8s() {
    const collector = await fetchCollector();
    const cluster = collector.state?.cluster ?? null;
    const workloads = collector.state?.workloads ?? null;
    const alerts = collector.state?.alerts ?? null;

    const updatedAt = collector.state?.updated_at?.cluster;
    const stale = staleBy(updatedAt, STALE_AFTER_SECONDS);

    const errors = collector.state?.errors ?? {};
    const sectionError = errors.cluster ?? errors.workloads ?? errors.alerts;

    const source =
        collector.error !== null
            ? collector.error
            : sectionError !== undefined
              ? "cluster: " + sectionError
              : cluster === null
                ? "cluster"
                : stale
                  ? "cluster data is stale"
                  : null;

    const nodes = cluster?.nodes ?? [];
    const pods = cluster?.pods ?? [];
    const restarting = cluster?.restarting ?? [];
    const degraded = workloads?.degraded ?? [];
    const events = workloads?.events ?? [];
    const active = alerts?.active ?? [];
    const counts = workloads?.counts ?? {};

    const readyNodes = nodes.filter((node) => node.ready).length;

    const summary = [
        { label: "nodes", value: readyNodes + "/" + nodes.length },
        ...WORKLOAD_KINDS.flatMap((kind) => {
            const bucket = counts[kind];
            return bucket === undefined
                ? []
                : [
                      {
                          label: kind.toLowerCase() + "s",
                          value: bucket.ready + "/" + bucket.total,
                      },
                  ];
        }),
        {
            label: "pods",
            value: (cluster?.pod_count ?? 0) + " / " + pods.length + " bad",
        },
        { label: "alerts", value: active.length },
    ];

    return (
        <Shell active="/k8s">
            <Refresher seconds={REFRESH_SECONDS} />
            {source === null ? null : <Unavailable source={source} />}

            {cluster === null ? null : <Summary items={summary} />}

            <Section label="nodes" count={nodes.length} />
            {nodes.length === 0 ? (
                <div className="nodata">no nodes reported</div>
            ) : (
                nodes.map((node) => {
                    const flags = nodeFlags(node);
                    const status = nodeStatus(node);
                    return (
                        <Line
                            key={node.name}
                            status={status}
                            name={node.name}
                            note={
                                status === "good"
                                    ? "ready"
                                    : status === "critical"
                                      ? "down"
                                      : flags.join(", ")
                            }
                            state={node.kubelet === "" ? "--" : node.kubelet}
                        />
                    );
                })
            )}

            <Section label="workloads" count={degraded.length} />
            {degraded.length === 0 ? (
                <div className="is-good">all workloads at desired replicas</div>
            ) : (
                degraded.map((entry) => (
                    <Line
                        key={entry.kind + entry.namespace + entry.name}
                        status={workloadStatus(entry)}
                        name={entry.namespace + "/" + entry.name}
                        note={entry.kind.toLowerCase()}
                        state={entry.ready + "/" + entry.desired}
                    />
                ))
            )}

            <Section label="pods" count={pods.length} />
            {pods.length === 0 ? (
                <div className="is-good">all pods running and ready</div>
            ) : (
                pods.map((pod) => (
                    <Line
                        key={pod.namespace + "/" + pod.name}
                        status={podStatus(pod)}
                        name={pod.namespace + "/" + pod.name}
                        note={pod.reason === "" ? pod.phase : pod.reason}
                        state={pod.restarts === 0 ? "--" : pod.restarts + "x"}
                        cells={[{ value: pod.node, hide: "sm" }]}
                    />
                ))
            )}

            <Section label="restarts" count={restarting.length} />
            {restarting.length === 0 ? (
                <div className="nodata">none above threshold</div>
            ) : (
                restarting.map((pod) => (
                    <Line
                        key={pod.namespace + "/" + pod.name}
                        status="attention"
                        name={pod.namespace + "/" + pod.name}
                        state={pod.restarts + "x"}
                        cells={[{ value: pod.node, hide: "sm" }]}
                    />
                ))
            )}

            <Section label="warning events" count={events.length} />
            {events.length === 0 ? (
                <div className="nodata">none</div>
            ) : (
                events.map((event, index) => (
                    <Line
                        key={index}
                        status="attention"
                        name={
                            (event.namespace === "" ? "" : event.namespace + "/") +
                            event.object
                        }
                        note={event.reason}
                        state={event.count > 1 ? event.count + "x" : undefined}
                        message={event.message}
                        cells={[{ value: sinceStamp(event.stamp) ?? "--", hide: "xs" }]}
                    />
                ))
            )}

            <Section label="alerts" count={active.length} />
            {active.length === 0 ? (
                <div className="is-good">no active alerts</div>
            ) : (
                active.map((alert, index) => (
                    <Line
                        key={index}
                        status={alertStatus(alert)}
                        name={alert.alertname}
                        note={alert.severity}
                        state={alert.state === "" ? undefined : alert.state}
                        cells={[
                            {
                                value:
                                    (alert.namespace === ""
                                        ? ""
                                        : alert.namespace + "/") + alert.target,
                                hide: "sm",
                            },
                        ]}
                    />
                ))
            )}
            {(alerts?.suppressed ?? 0) > 0 ? (
                <div className="line__msg">{alerts?.suppressed} suppressed</div>
            ) : null}
        </Shell>
    );
}
