import { STATUS_GLYPH, type Status } from "@/theme/status";

export const Dot = ({ status }: { status: Status }) => (
    <span className={"dot is-" + status} aria-label={status} role="img">
        {STATUS_GLYPH[status]}
    </span>
);
