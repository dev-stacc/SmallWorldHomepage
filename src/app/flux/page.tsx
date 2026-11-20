import { Shell } from "@/components/Shell";
import { Section } from "@/components/Section";
import { Line, Summary } from "@/components/Line";
import { Unavailable } from "@/components/Unavailable";
import { Refresher } from "@/components/Refresher";
import { fetchCollector } from "@/lib/collector";
import { ago, staleBy } from "@/lib/format";
import {
    prettyDuration,
    resourceNote,
    resourceStatus,
    shortRevision,
    type FluxResource,
} from "@/lib/flux";
import type { Status } from "@/theme/status";

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

const Resource = ({ entry }: { entry: FluxResource }) => {
    const status = resourceStatus(entry);
    const recent = entry.history[0];

    return (
        <Line
            status={status}
            name={
                entry.kind === "HelmRelease"
                    ? entry.namespace + "/" + entry.name
                    : entry.name
            }
            note={resourceNote(entry)}
            state={shortRevision(entry.version ?? entry.applied)}
            message={entry.ready === "True" ? undefined : entry.message}
            cells={[
                { value: sinceStamp(recent?.at) ?? "--", hide: "xs" },
                {
                    value: entry.chart ?? prettyDuration(null),
                    hide: "sm",
                },
            ]}
        />
    );
};

export default async function Flux() {
    const collector = await fetchCollector();
    const flux = collector.state?.flux ?? null;

    const updatedAt = collector.state?.updated_at?.flux;
    const stale = staleBy(updatedAt, STALE_AFTER_SECONDS);

    const sectionError = collector.state?.errors?.flux;
    const source =
        collector.error !== null
            ? collector.error
            : sectionError !== undefined
              ? "flux: " + sectionError
              : flux === null
                ? "cluster"
                : stale
                  ? "flux data is stale"
                  : null;

    const sources = Object.values(flux?.sources ?? {});
    const git = sources[0];
    const drift = flux?.drift;
    const kustomizations = flux?.kustomizations ?? [];
    const helmreleases = flux?.helmreleases ?? [];
    const timeline = flux?.timeline ?? [];
    const counts = flux?.counts;

    const sourceStatus: Status =
        git === undefined
            ? "unknown"
            : drift?.stuck === true
              ? "critical"
              : drift?.in_sync === true
                ? "good"
                : "attention";

    return (
        <Shell active="/flux">
            <Refresher seconds={REFRESH_SECONDS} />
            {source === null ? null : <Unavailable source={source} />}

            {counts === undefined ? null : (
                <Summary
                    items={[
                        { label: "total", value: counts.total },
                        { label: "failing", value: counts.failing },
                        { label: "drifted", value: counts.drifted },
                        { label: "suspended", value: counts.suspended },
                    ]}
                />
            )}

            <Section label="source" />
            {git === undefined ? (
                <div className="nodata">no gitrepository found</div>
            ) : (
                <Line
                    status={sourceStatus}
                    name={git.namespace + "/" + git.name}
                    note={
                        drift?.stuck === true
                            ? "stuck"
                            : drift?.in_sync === true
                              ? "in sync"
                              : (drift?.pending.length ?? 0) + " pending"
                    }
                    state={git.short === "" ? "--" : git.short}
                    message={
                        drift !== undefined && drift.pending.length > 0
                            ? "waiting: " + drift.pending.join(", ")
                            : undefined
                    }
                    cells={[
                        { value: ago(git.artifact_at) ?? "--", hide: "xs" },
                        { value: "every " + git.interval, hide: "sm" },
                    ]}
                />
            )}

            <Section label="kustomizations" count={kustomizations.length} />
            {kustomizations.length === 0 ? (
                <div className="nodata">none</div>
            ) : (
                kustomizations.map((entry) => (
                    <Resource key={entry.namespace + "/" + entry.name} entry={entry} />
                ))
            )}

            <Section label="helmreleases" count={helmreleases.length} />
            {helmreleases.length === 0 ? (
                <div className="nodata">none</div>
            ) : (
                helmreleases.map((entry) => (
                    <Resource key={entry.namespace + "/" + entry.name} entry={entry} />
                ))
            )}

            <Section label="timeline" count={timeline.length} />
            {timeline.length === 0 ? (
                <div className="nodata">no history</div>
            ) : (
                timeline.map((slot) => (
                    <Line
                        key={slot.revision}
                        status={
                            slot.status === "ReconciliationSucceeded"
                                ? "good"
                                : "critical"
                        }
                        name={shortRevision(slot.revision)}
                        note={slot.status === "ReconciliationSucceeded" ? "ok" : "fail"}
                        state={prettyDuration(slot.duration)}
                        cells={[
                            { value: sinceStamp(slot.at) ?? "--", hide: "xs" },
                            { value: slot.resources.join(", "), hide: "sm" },
                        ]}
                    />
                ))
            )}
        </Shell>
    );
}
