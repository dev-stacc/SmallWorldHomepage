import type { ReactNode } from "react";
import type { Status } from "@/theme/status";
import { Dot } from "./Dot";

type PanelProps = {
    status?: Status;
    name: ReactNode;
    role?: ReactNode;
    sub?: ReactNode;
    href?: string;
};

export const Panel = ({ status, name, role, sub, href }: PanelProps) => {
    const body = (
        <>
            <div className="panel__top">
                <span className="panel__lead">
                    {status === undefined ? null : <Dot status={status} />}
                    {name}
                </span>
                {role === undefined ? null : <span className="panel__role">{role}</span>}
            </div>
            {sub === undefined ? null : <div className="panel__sub">{sub}</div>}
        </>
    );

    if (href === undefined) {
        return <div className="panel">{body}</div>;
    }

    return (
        <a className="panel panel--link" href={href}>
            {body}
        </a>
    );
};

export const Grid = ({ children }: { children: ReactNode }) => (
    <div className="grid">{children}</div>
);
