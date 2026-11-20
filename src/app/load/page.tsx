import { Shell } from "@/components/Shell";
import { Line, Summary } from "@/components/Line";
import { Unavailable } from "@/components/Unavailable";
import { Refresher } from "@/components/Refresher";
import { Spark } from "@/components/Spark";
import { Donut, usageStatus } from "@/components/Donut";
import { Dot } from "@/components/Dot";
import { loadConfig } from "@/lib/config";
import {
    celsius,
    diskStatus,
    fetchAgents,
    fraction,
    percent,
    uptimeLabel,
} from "@/lib/agent";
import { buildHosts, type HostView } from "@/lib/load";
import { humanSize } from "@/lib/backups";

export const dynamic = "force-dynamic";

const REFRESH_SECONDS = 15;

const USAGE_DOMAIN = [0, 1] as const;
const TEMP_DOMAIN = [20, 90] as const;

const series = (
    trend: readonly (number | null)[] | undefined,
    history: readonly (number | null)[] | undefined,
) => (trend?.some((value) => value !== null) ? trend : history);

const Trend = ({
    label,
    values,
    status,
    domain,
}: {
    label: string;
    values: readonly (number | null)[] | undefined;
    status: ReturnType<typeof usageStatus>;
    domain?: readonly [number, number];
}) => (
    <div className="trend">
        <span className="trend__label display">{label}</span>
        <Spark values={values} status={status} label={label} domain={domain} />
    </div>
);

const Sub = ({ label, count }: { label: string; count: number }) => (
    <div className="hostcard__sub display">
        {label}
        <span className="hostcard__subcount">{count}</span>
    </div>
);

const HostCard = ({ view }: { view: HostView }) => {
    const stats = view.stats;
    const cpu = stats?.cpu;
    const memory = stats?.memory;
    const root = stats?.filesystems?.find((entry) => entry.mount === "/");
    const cpuUsage = fraction(cpu?.usage);
    const memUsage = fraction(memory?.used);
    const rootUsage = fraction(root?.used);

    const gpus = stats?.gpus ?? [];
    const filesystems = stats?.filesystems ?? [];
    const disks = stats?.disks ?? [];

    return (
        <div className={"hostcard hostcard--" + view.priority}>
            <div className="hostcard__head">
                <span className="hostcard__name display">
                    <Dot status={view.status} />
                    {view.host}
                    <span className={"hostcard__tier is-" + view.status}>
                        {view.priority}
                    </span>
                </span>
                <span className="hostcard__meta">
                    {view.error !== null ? (
                        <span className={"is-" + view.status}>{view.error}</span>
                    ) : (
                        <>
                            up {uptimeLabel(stats?.uptime)} · load{" "}
                            {cpu?.load1 === null || cpu?.load1 === undefined
                                ? "--"
                                : cpu.load1.toFixed(2)}{" "}
                            · {celsius(cpu?.temp_c)}
                        </>
                    )}
                </span>
            </div>

            <div className="gauges">
                <Donut
                    value={cpuUsage}
                    label="cpu"
                    caption={
                        cpu?.cores === null || cpu?.cores === undefined
                            ? undefined
                            : cpu.cores + " cores"
                    }
                />
                <Donut
                    value={memUsage}
                    label="memory"
                    caption={humanSize(memory?.total)}
                />
                <Donut value={rootUsage} label="root" caption={humanSize(root?.total)} />
            </div>

            <Trend
                label="cpu"
                values={series(stats?.trend?.cpu_usage, stats?.history?.cpu_usage)}
                status={usageStatus(cpuUsage)}
                domain={USAGE_DOMAIN}
            />
            <Trend
                label="memory"
                values={series(stats?.trend?.mem_used, stats?.history?.mem_used)}
                status={usageStatus(memUsage)}
                domain={USAGE_DOMAIN}
            />
            <Trend
                label="temp"
                values={series(stats?.trend?.cpu_temp_c, stats?.history?.cpu_temp_c)}
                status="neutral"
                domain={TEMP_DOMAIN}
            />
            {gpus.length === 0 ? null : (
                <Trend
                    label="gpu"
                    values={series(stats?.trend?.gpu_usage, stats?.history?.gpu_usage)}
                    status={usageStatus(fraction(gpus[0]?.usage))}
                    domain={USAGE_DOMAIN}
                />
            )}

            {gpus.length === 0 ? null : (
                <>
                    <Sub label="gpu" count={gpus.length} />
                    {gpus.map((gpu, index) => (
                        <Line
                            key={index}
                            status={usageStatus(fraction(gpu.usage))}
                            name={gpu.name}
                            note={percent(gpu.usage)}
                            state={celsius(gpu.temp_c)}
                            cells={[
                                {
                                    value:
                                        gpu.vram_total === null
                                            ? "--"
                                            : "vram " + percent(gpu.vram_used),
                                    hide: "xs",
                                },
                                { value: gpu.model, hide: "sm" },
                            ]}
                        />
                    ))}
                </>
            )}

            {filesystems.length === 0 ? null : (
                <>
                    <Sub label="filesystems" count={filesystems.length} />
                    {filesystems.map((entry, index) => (
                        <Line
                            key={index}
                            status={usageStatus(fraction(entry.used))}
                            name={entry.mount}
                            note={percent(entry.used)}
                            state={humanSize(entry.total)}
                            cells={[
                                { value: humanSize(entry.used_bytes), hide: "xs" },
                                { value: entry.device, hide: "sm" },
                            ]}
                        />
                    ))}
                </>
            )}

            {disks.length === 0 ? null : (
                <>
                    <Sub label="disks" count={disks.length} />
                    {disks.map((disk, index) => (
                        <Line
                            key={index}
                            status={diskStatus(disk.health)}
                            name={disk.name}
                            note={
                                disk.health === "" ? "unknown" : disk.health.toLowerCase()
                            }
                            state={celsius(disk.temp_c)}
                            cells={[
                                {
                                    value:
                                        disk.power_on_hours === null
                                            ? "--"
                                            : Math.round(disk.power_on_hours / 24) +
                                              "d on",
                                    hide: "xs",
                                },
                                { value: disk.model, hide: "sm" },
                            ]}
                        />
                    ))}
                </>
            )}
        </div>
    );
};

export default async function Load() {
    const settings = await loadConfig();
    const results = await fetchAgents(settings.config.agents);
    const hosts = buildHosts(settings.config.agents, results);

    const live = hosts.filter((host) => host.stats !== null);

    const source =
        settings.error !== null
            ? "config: " + settings.error
            : settings.config.agents.length === 0
              ? "no stat agents configured"
              : live.length === 0
                ? "no stat agents reachable"
                : null;

    const gpuCount = live.reduce(
        (total, host) => total + (host.stats?.gpus ?? []).length,
        0,
    );
    const diskCount = live.reduce(
        (total, host) => total + (host.stats?.disks ?? []).length,
        0,
    );

    const temps = live.flatMap((host) => [
        ...(host.stats?.disks ?? []).map((disk) => disk.temp_c),
        ...(host.stats?.gpus ?? []).map((gpu) => gpu.temp_c),
    ]);
    const hottest = temps.filter(
        (value): value is number => value !== null && Number.isFinite(value),
    );

    const attention = hosts.filter(
        (host) => host.status === "critical" || host.status === "attention",
    ).length;

    return (
        <Shell active="/load">
            <Refresher seconds={REFRESH_SECONDS} />
            {source === null ? null : <Unavailable source={source} />}

            <Summary
                items={[
                    { label: "agents", value: live.length + "/" + hosts.length },
                    { label: "needs eyes", value: attention },
                    { label: "gpus", value: gpuCount },
                    { label: "disks", value: diskCount },
                    {
                        label: "hottest",
                        value:
                            hottest.length === 0 ? "--" : celsius(Math.max(...hottest)),
                    },
                ]}
            />

            {hosts.length === 0 ? (
                <div className="nodata">no stat agents configured</div>
            ) : (
                hosts.map((view) => <HostCard key={view.host} view={view} />)
            )}
        </Shell>
    );
}
