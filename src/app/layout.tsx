import type { Metadata, Viewport } from "next";
import { resolveTheme, themeVariables } from "@/theme/tokens";
import "./globals.css";

export const metadata: Metadata = {
    title: "home",
    description: "Fleet monitor running on dummy data",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#0e0202",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const theme = resolveTheme();

    return (
        <html lang="en">
            <head>
                <style>{`:root {\n        ${themeVariables(theme)};\n}`}</style>
            </head>
            <body>{children}</body>
        </html>
    );
}
