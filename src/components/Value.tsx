export const PLACEHOLDER = "--";

const join = (...parts: readonly (string | undefined)[]) =>
    parts.filter((part) => part !== undefined && part !== "").join(" ");

export const Value = ({
    value,
    unit,
    className,
}: {
    value: string | number | null | undefined;
    unit?: string;
    className?: string;
}) => {
    if (value === null || value === undefined || value === "") {
        return <span className={join("nodata", className)}>{PLACEHOLDER}</span>;
    }

    return (
        <span className={className}>
            {value}
            {unit === undefined ? null : unit}
        </span>
    );
};

export const Num = ({
    value,
    unit,
    className,
}: {
    value: string | number | null | undefined;
    unit?: string;
    className?: string;
}) => <Value value={value} unit={unit} className={join("num", className)} />;
