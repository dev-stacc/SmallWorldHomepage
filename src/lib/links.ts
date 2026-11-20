export type LinkEntry = {
    name: string;
    url: string;
    label: string;
    role: string;
    group: string;
    auth: boolean;
    nav: boolean;
};

export const GROUPS: readonly { key: string; label: string }[] = [
    { key: "comfort", label: "quality of life" },
    { key: "identity", label: "auth and storage" },
    { key: "monitoring", label: "monitoring" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? value : fallback;

export const parseLinks = (raw: unknown): LinkEntry[] => {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.flatMap((item) => {
        if (!isRecord(item)) {
            return [];
        }

        const name = text(item.name);
        const url = text(item.url);

        if (name === "" || url === "") {
            return [];
        }

        return [
            {
                name,
                url,
                label: text(item.label, url),
                role: text(item.role),
                group: text(item.group),
                auth: item.auth === true,
                nav: item.nav !== false,
            },
        ];
    });
};
