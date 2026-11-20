import type { ReactNode } from "react";
import type { Status } from "@/theme/status";
import { Dot } from "./Dot";

export const Row = ({
    status,
    label,
    children,
}: {
    status?: Status;
    label: ReactNode;
    children?: ReactNode;
}) => (
    <div className="row">
        <span className="row__label">
            {status === undefined ? null : <Dot status={status} />}
            {label}
        </span>
        <span className="row__value">{children}</span>
    </div>
);

export const Rows = ({ children }: { children: ReactNode }) => (
    <div className="rows">{children}</div>
);
