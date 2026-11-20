export type Palette = {
    base00: string;
    base01: string;
    base02: string;
    base03: string;
    base04: string;
    base05: string;
    base06: string;
    base07: string;
    base08: string;
};

export type Theme = {
    palette: Palette;
    displayFont: string;
    monoFont: string;
    numericFont: string;
    fontSize: number;
    numericSize: number;
    slope: number;
};

const FALLBACK: Palette = {
    base00: "#0e0202",
    base01: "#000000",
    base02: "#ff4050",
    base03: "#5ef6ff",
    base04: "#ffe44d",
    base05: "#ffffff",
    base06: "#6abf24",
    base07: "#7a1f28",
    base08: "#8fdf4a",
};

const hex = (value: string | undefined, fallback: string): string => {
    if (value === undefined) {
        return fallback;
    }
    const normalised = value.startsWith("#") ? value : "#" + value;
    return /^#[0-9a-fA-F]{6}$/.test(normalised) ? normalised : fallback;
};

const number = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resolveTheme = (): Theme => ({
    palette: {
        base00: hex(process.env.THEME_BASE00, FALLBACK.base00),
        base01: hex(process.env.THEME_BASE01, FALLBACK.base01),
        base02: hex(process.env.THEME_BASE02, FALLBACK.base02),
        base03: hex(process.env.THEME_BASE03, FALLBACK.base03),
        base04: hex(process.env.THEME_BASE04, FALLBACK.base04),
        base05: hex(process.env.THEME_BASE05, FALLBACK.base05),
        base06: hex(process.env.THEME_BASE06, FALLBACK.base06),
        base07: hex(process.env.THEME_BASE07, FALLBACK.base07),
        base08: hex(process.env.THEME_BASE08, FALLBACK.base08),
    },
    displayFont: process.env.THEME_DISPLAY_FONT ?? "Neuromax",
    monoFont: process.env.THEME_MONO_FONT ?? "Departure Mono",
    numericFont: process.env.THEME_NUMERIC_FONT ?? "Departure Mono",
    fontSize: number(process.env.THEME_FONT_SIZE, 11),
    numericSize: Math.round(number(process.env.THEME_NUMERIC_SIZE, 15)),
    slope: number(process.env.THEME_TAB_SLOPE, 24),
});

export const themeVariables = (theme: Theme): string => {
    const p = theme.palette;
    return [
        "--bg: " + p.base00,
        "--black: " + p.base01,
        "--fg: " + p.base02,
        "--highlight: " + p.base03,
        "--attention: " + p.base04,
        "--boring: " + p.base05,
        "--good: " + p.base06,
        "--edge: " + p.base07,
        "--good-alt: " + p.base08,
        "--display-font: " + theme.displayFont,
        "--mono-font: " + theme.monoFont,
        "--numeric-font: " + theme.numericFont,
        "--font-size: " + theme.fontSize + "pt",
        "--numeric-size: " + theme.numericSize + "px",
        "--slope: " + theme.slope + "px",
    ].join(";\n        ");
};
