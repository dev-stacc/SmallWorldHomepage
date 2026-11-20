import { Shell } from "@/components/Shell";
import { Section } from "@/components/Section";
import { Line, Summary } from "@/components/Line";
import { Unavailable } from "@/components/Unavailable";
import { Refresher } from "@/components/Refresher";
import { fetchCollector } from "@/lib/collector";
import { groupKey, loadConfig } from "@/lib/config";
import { staleBy } from "@/lib/format";
import { hoursAgo, humanSize, shortPaths, snapshotStatus } from "@/lib/backups";

export const dynamic = "force-dynamic";

const REFRESH_SECONDS = 120;
const STALE_AFTER_SECONDS = 2700;

export default async function Backups() {
    const [settings, collector] = await Promise.all([loadConfig(), fetchCollector()]);

    const backups = collector.state?.backups ?? null;
    const disks = collector.state?.disks ?? {};
    const staleHours = settings.config.backupStaleHours;

    const updatedAt = collector.state?.updated_at?.backups;
    const stale = staleBy(updatedAt, STALE_AFTER_SECONDS);

    const errors = collector.state?.errors ?? {};
    const resticError = Object.entries(errors).find(
        ([key]) => key.startsWith("restic-") || key === "smart",
    );

    const source =
        collector.error !== null
            ? collector.error
            : settings.error !== null
              ? "config: " + settings.error
              : resticError !== undefined
                ? resticError[0] + ": " + resticError[1]
                : backups === null
                  ? "collector"
                  : stale
                    ? "backup data is stale"
                    : null;

    const groups = backups?.groups ?? [];
    const repo = backups?.repo;
    const units = backups?.units ?? [];
    const seen = new Set(groups.map((group) => group.id));
    const missing = settings.config.expectedBackups.filter(
        (entry) => !seen.has(groupKey(entry.host, entry.paths)),
    );
    const diskNames = Object.keys(disks).sort();

    const tracked = groups.filter((group) => group.expected ?? true);
    const retired = groups.length - tracked.length;

    const newest = tracked.reduce<number | null>((best, group) => {
        if (group.age_hours === null) {
            return best;
        }
        return best === null || group.age_hours < best ? group.age_hours : best;
    }, null);

    return (
        <Shell active="/backups">
            <Refresher seconds={REFRESH_SECONDS} />
            {source === null ? null : <Unavailable source={source} />}

            {backups === null ? null : (
                <Summary
                    items={[
                        { label: "size", value: humanSize(repo?.size) },
                        { label: "snapshots", value: repo?.snapshots ?? "--" },
                        { label: "groups", value: tracked.length },
                        { label: "missing", value: missing.length },
                        { label: "retired", value: retired },
                        { label: "newest", value: hoursAgo(newest) },
                    ]}
                />
            )}

            <Section label="repository" />
            {repo === undefined ? (
                <div className="nodata">no repository stats</div>
            ) : (
                <Line
                    status="good"
                    name={settings.config.resticRepo}
                    note={(repo.ratio ?? 1).toFixed(2) + "x"}
                    state={humanSize(repo.size)}
                    cells={[{ value: (repo.snapshots ?? 0) + " snaps", hide: "xs" }]}
                />
            )}

            <Section label="snapshots" count={groups.length + missing.length} />
            {groups.length === 0 && missing.length === 0 ? (
                <div className="is-attention">no snapshots in repository</div>
            ) : null}
            {groups.map((group) => {
                const mark = snapshotStatus(
                    group.age_hours,
                    staleHours,
                    group.expected ?? true,
                );
                return (
                    <Line
                        key={group.id}
                        status={mark.status}
                        name={group.host + " " + shortPaths(group.paths)}
                        note={mark.label}
                        state={hoursAgo(group.age_hours)}
                        cells={[
                            {
                                value: group.short_id === "" ? "--" : group.short_id,
                                hide: "xs",
                            },
                        ]}
                    />
                );
            })}
            {missing.map((entry) => (
                <Line
                    key={groupKey(entry.host, entry.paths)}
                    status="critical"
                    name={entry.host + " " + shortPaths(entry.paths)}
                    note="gone"
                    state="never"
                />
            ))}

            <Section label="units" count={units.length} />
            {units.length === 0 ? (
                <div className="is-attention">no restic units in journal</div>
            ) : (
                units.map((unit) => (
                    <Line
                        key={unit.host + "/" + unit.unit}
                        status={unit.ok ? "good" : "critical"}
                        name={unit.host + " " + unit.unit.replace(/\.service$/, "")}
                        note={unit.fails + " errors"}
                        state={unit.ok ? "ok" : "fail"}
                        cells={[{ value: unit.lines + " lines", hide: "xs" }]}
                    />
                ))
            )}

            <Section label="disks" count={diskNames.length} />
            {diskNames.length === 0 ? (
                <div className="is-attention">no smartd data</div>
            ) : (
                diskNames.map((name) => {
                    const disk = disks[name];
                    const ok = disk?.ok !== false;
                    return (
                        <Line
                            key={name}
                            status={ok ? "good" : "critical"}
                            name={name}
                            note={ok ? "ok" : "smart errors"}
                            state={(disk?.fails ?? 0) + " in 24h"}
                        />
                    );
                })
            )}
        </Shell>
    );
}
