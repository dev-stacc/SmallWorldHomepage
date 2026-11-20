import { fraction } from "@/lib/agent";
import type { Status } from "@/theme/status";

const SIZE = 42;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const usageStatus = (value: number | null): Status => {
    if (value === null) {
        return "unknown";
    }
    if (value >= 0.9) {
        return "critical";
    }
    if (value >= 0.75) {
        return "attention";
    }
    return "good";
};

export const Donut = ({
    value,
    label,
    caption,
}: {
    value: number | null | undefined;
    label: string;
    caption?: string;
}) => {
    const amount = fraction(value);
    const status = usageStatus(amount);
    const filled = amount === null ? 0 : amount * CIRCUMFERENCE;

    return (
        <div className="donut">
            <svg
                className={"donut__ring is-" + status}
                viewBox={"0 0 " + SIZE + " " + SIZE}
                role="img"
                aria-label={
                    label +
                    " " +
                    (amount === null ? "unknown" : Math.round(amount * 100) + "%")
                }
            >
                <circle
                    className="donut__track"
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    strokeWidth={STROKE}
                />
                {amount === null ? null : (
                    <circle
                        className="donut__value"
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        strokeWidth={STROKE}
                        strokeDasharray={filled + " " + CIRCUMFERENCE}
                        transform={"rotate(-90 " + SIZE / 2 + " " + SIZE / 2 + ")"}
                    />
                )}
            </svg>
            <div className="donut__meta">
                <span className={"donut__amount num is-" + status}>
                    {amount === null ? "--" : Math.round(amount * 100) + "%"}
                </span>
                <span className="donut__label display">{label}</span>
                {caption === undefined ? null : (
                    <span className="donut__caption">{caption}</span>
                )}
            </div>
        </div>
    );
};
