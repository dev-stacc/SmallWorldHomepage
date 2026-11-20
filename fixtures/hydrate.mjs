const SECTIONS = [
    "apps",
    "hosts",
    "nodes",
    "cluster",
    "workloads",
    "flux",
    "backups",
    "disks",
    "alerts",
];

const token = (value, now) => {
    const epoch = /^@now(?:-([0-9]+))?$/.exec(value);
    if (epoch !== null) {
        return now - Number(epoch[1] ?? 0);
    }

    const iso = /^@iso(?:-([0-9]+))?$/.exec(value);
    if (iso !== null) {
        return new Date((now - Number(iso[1] ?? 0)) * 1000).toISOString();
    }

    return value;
};

const walk = (value, now) => {
    if (typeof value === "string") {
        return token(value, now);
    }
    if (Array.isArray(value)) {
        return value.map((item) => walk(item, now));
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, walk(item, now)]),
        );
    }
    return value;
};

export const hydrate = (state) => {
    const now = Math.floor(Date.now() / 1000);
    const resolved = walk(state, now);
    const updated = {};

    for (const section of SECTIONS) {
        if (resolved[section] !== undefined) {
            updated[section] = now;
        }
    }

    return { ...resolved, updated_at: updated, generated_at: now };
};
