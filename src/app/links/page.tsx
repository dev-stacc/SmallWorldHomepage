import { Shell } from "@/components/Shell";
import { Section } from "@/components/Section";
import { Grid, Panel } from "@/components/Panel";
import { Unavailable } from "@/components/Unavailable";
import { Refresher } from "@/components/Refresher";
import { GROUPS, type LinkEntry } from "@/lib/links";
import { loadConfig } from "@/lib/config";
import { appStates, fetchCollector } from "@/lib/collector";
import { staleBy } from "@/lib/format";
import type { Status } from "@/theme/status";

export const dynamic = "force-dynamic";

const REFRESH_SECONDS = 30;
const STALE_AFTER_SECONDS = 180;

type Resolved = LinkEntry & { status: Status };

const Flat = ({ entries }: { entries: Resolved[] }) => (
    <Grid>
        {entries.map((entry) => (
            <Panel
                key={entry.name}
                status={entry.status}
                name={entry.name}
                role={entry.role === "" ? undefined : entry.role}
                sub={entry.label}
                href={entry.url}
            />
        ))}
    </Grid>
);

const Group = ({ label, entries }: { label: string; entries: Resolved[] }) => (
    <>
        <div className="group display">{label}</div>
        {entries.length === 0 ? (
            <div className="nodata">none</div>
        ) : (
            <Grid>
                {entries.map((entry) => (
                    <Panel
                        key={entry.name}
                        status={entry.status}
                        name={entry.name}
                        role={entry.role === "" ? undefined : entry.role}
                        sub={entry.label}
                        href={entry.url}
                    />
                ))}
            </Grid>
        )}
    </>
);

export default async function Links() {
    const [catalog, collector] = await Promise.all([loadConfig(), fetchCollector()]);

    const states = appStates(collector.state);

    const fallback: LinkEntry[] = [...states.values()]
        .filter((app) => app.nav === true && typeof app.url === "string")
        .map((app) => ({
            name: app.name,
            url: app.url ?? "",
            label: app.label ?? app.url ?? "",
            role: app.role ?? "",
            group: app.group ?? "",
            auth: app.auth === true,
            nav: true,
        }));

    const entries = catalog.config.links.length > 0 ? catalog.config.links : fallback;

    const resolved: Resolved[] = entries
        .filter((entry) => entry.nav)
        .map((entry) => {
            const state = states.get(entry.name);
            return {
                ...entry,
                status: state === undefined ? "unknown" : state.up ? "good" : "attention",
            };
        });

    const up = resolved.filter((entry) => entry.status === "good");
    const down = resolved.filter((entry) => entry.status === "attention");
    const unknown = resolved.filter((entry) => entry.status === "unknown");
    const known = new Set(GROUPS.map((group) => group.key));
    const spare = up.filter((entry) => !known.has(entry.group));

    const updatedAt = collector.state?.updated_at?.apps;
    const stale = staleBy(updatedAt, STALE_AFTER_SECONDS);

    const source =
        catalog.error !== null
            ? "config: " + catalog.error
            : collector.error !== null
              ? collector.error
              : stale
                ? "collector is stale"
                : null;

    return (
        <Shell active="/links">
            <Refresher seconds={REFRESH_SECONDS} />
            {source === null ? null : <Unavailable source={source} />}

            <Section label="up" count={up.length} />
            {GROUPS.map((group) => {
                const members = up.filter((entry) => entry.group === group.key);
                return members.length === 0 ? null : (
                    <Group key={group.key} label={group.label} entries={members} />
                );
            })}
            {spare.length === 0 ? null : <Group label="other" entries={spare} />}
            {up.length === 0 ? <div className="nodata">none</div> : null}

            <Section label="down" count={down.length} />
            {down.length === 0 ? (
                <div className="nodata">none</div>
            ) : (
                <Flat entries={down} />
            )}

            {unknown.length === 0 ? null : (
                <>
                    <Section label="unknown" count={unknown.length} />
                    <Flat entries={unknown} />
                </>
            )}
        </Shell>
    );
}
