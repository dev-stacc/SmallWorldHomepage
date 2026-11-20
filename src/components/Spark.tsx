import type { Sample } from "@/lib/agent";
import type { Status } from "@/theme/status";

const WIDTH = 120;
const HEIGHT = 24;
const MAX_POINTS = 60;

const downsample = (values: readonly Sample[]): Sample[] => {
    if (values.length <= MAX_POINTS) {
        return [...values];
    }

    const span = values.length / MAX_POINTS;
    const out: Sample[] = [];

    for (let index = 0; index < MAX_POINTS; index += 1) {
        const start = Math.floor(index * span);
        const stop = Math.max(Math.floor((index + 1) * span), start + 1);
        let total = 0;
        let count = 0;

        for (let cursor = start; cursor < stop && cursor < values.length; cursor += 1) {
            const value = values[cursor];

            if (typeof value === "number" && Number.isFinite(value)) {
                total += value;
                count += 1;
            }
        }

        out.push(count === 0 ? null : total / count);
    }

    return out;
};

const segments = (
    values: readonly Sample[],
    domain: readonly [number, number] | undefined,
): string[] => {
    const points = downsample(values);
    const finite = points.filter(
        (value): value is number => value !== null && Number.isFinite(value),
    );

    if (finite.length < 2) {
        return [];
    }

    const low = domain ? domain[0] : Math.min(...finite);
    const high = domain ? domain[1] : Math.max(...finite);
    const span = high - low || 1;
    const step = points.length > 1 ? WIDTH / (points.length - 1) : WIDTH;

    const paths: string[] = [];
    let current: string[] = [];

    points.forEach((value, index) => {
        if (value === null || !Number.isFinite(value)) {
            if (current.length > 1) {
                paths.push(current.join(" "));
            }
            current = [];
            return;
        }

        const ratio = Math.min(Math.max((value - low) / span, 0), 1);
        const x = (index * step).toFixed(2);
        const y = (HEIGHT - ratio * (HEIGHT - 2) - 1).toFixed(2);
        current.push(x + "," + y);
    });

    if (current.length > 1) {
        paths.push(current.join(" "));
    }

    return paths;
};

export const Spark = ({
    values,
    status = "neutral",
    label,
    domain,
}: {
    values: readonly Sample[] | undefined;
    status?: Status;
    label?: string;
    domain?: readonly [number, number];
}) => {
    const paths = segments(values ?? [], domain);

    if (paths.length === 0) {
        return <span className="spark spark--empty nodata">no history</span>;
    }

    return (
        <svg
            className={"spark is-" + status}
            viewBox={"0 0 " + WIDTH + " " + HEIGHT}
            preserveAspectRatio="none"
            role="img"
            aria-label={label ?? "history"}
        >
            {paths.map((points, index) => (
                <polyline key={index} points={points} />
            ))}
        </svg>
    );
};
