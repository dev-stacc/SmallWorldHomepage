import type { ReactNode } from "react";
import { FIXTURES } from "@/lib/fixture";

export const TABS = [
    { href: "/links", label: "links" },
    { href: "/load", label: "load" },
    { href: "/k8s", label: "k8s" },
    { href: "/flux", label: "flux" },
    { href: "/backups", label: "backups" },
] as const;

export const Shell = ({ active, children }: { active: string; children: ReactNode }) => (
    <div className="frame">
        <i className="cnr tl" />
        <i className="cnr tr" />
        <i className="cnr bl" />
        <i className="cnr br" />
        <div className="results">{children}</div>
        <nav className="tabs">
            {TABS.map((tab) => (
                <a
                    key={tab.href}
                    href={tab.href}
                    className={
                        "tab display" + (tab.href === active ? " tab--active" : "")
                    }
                >
                    {tab.label}
                </a>
            ))}
            {/* Nothing here is a real host, and the mirror should say so on
                every page rather than leaving it to the README. */}
            {FIXTURES ? <span className="fixtures display">fixtures</span> : null}
        </nav>
    </div>
);
