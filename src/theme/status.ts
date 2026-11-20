export type Status = "good" | "attention" | "critical" | "neutral" | "unknown";

export const STATUS_GLYPH: Record<Status, string> = {
    good: "●",
    attention: "●",
    critical: "●",
    neutral: "●",
    unknown: "○",
};

export const worst = (values: readonly Status[]): Status => {
    if (values.includes("critical")) {
        return "critical";
    }
    if (values.includes("attention")) {
        return "attention";
    }
    if (values.includes("unknown")) {
        return "unknown";
    }
    if (values.includes("good")) {
        return "good";
    }
    return "neutral";
};
