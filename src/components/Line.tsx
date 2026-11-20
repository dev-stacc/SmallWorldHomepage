import type { ReactNode } from "react";
import type { Status } from "@/theme/status";
import { Dot } from "./Dot";

export const Line = ({
    status,
    name,
    state,
    note,
    cells,
    message,
}: {
    status: Status;
    name: ReactNode;
    state?: ReactNode;
    note?: ReactNode;
    cells?: readonly { value: ReactNode; hide?: "sm" | "xs" }[];
    message?: string;
}) => (
    <>
        <div className="line">
            <span className="line__key">
                <Dot status={status} />
                {name}
            </span>
            {note === undefined ? null : (
                <span className={"line__note is-" + status}>{note}</span>
            )}
            {(cells ?? []).map((cell, index) => (
                <span
                    key={index}
                    className={
                        "line__cell" +
                        (cell.hide === undefined ? "" : " hide-" + cell.hide)
                    }
                >
                    {cell.value}
                </span>
            ))}
            {state === undefined ? null : (
                <span className={"line__state is-" + status}>{state}</span>
            )}
        </div>
        {message === undefined || message === "" ? null : (
            <div className="line__msg">{message}</div>
        )}
    </>
);

export const Summary = ({
    items,
}: {
    items: readonly { label: string; value: ReactNode }[];
}) => (
    <div className="summary">
        {items.map((item) => (
            <span className="summary__item" key={item.label}>
                <span className="summary__label display">{item.label}</span>
                <span className="num">{item.value}</span>
            </span>
        ))}
    </div>
);
