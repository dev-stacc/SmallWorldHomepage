const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export const ago = (epochSeconds: number | null | undefined): string | null => {
    if (epochSeconds === null || epochSeconds === undefined) {
        return null;
    }

    const delta = Date.now() / 1000 - epochSeconds;

    if (!Number.isFinite(delta) || delta < -MINUTE || delta > DAY * 365) {
        return null;
    }

    const seconds = Math.max(0, Math.round(delta));

    if (seconds < MINUTE) {
        return seconds + "s";
    }
    if (seconds < HOUR) {
        return Math.floor(seconds / MINUTE) + "m";
    }
    if (seconds < DAY) {
        return Math.floor(seconds / HOUR) + "h";
    }
    return Math.floor(seconds / DAY) + "d";
};

export const staleBy = (
    epochSeconds: number | null | undefined,
    limitSeconds: number,
): boolean => {
    if (epochSeconds === null || epochSeconds === undefined) {
        return true;
    }
    const delta = Date.now() / 1000 - epochSeconds;
    return !Number.isFinite(delta) || delta > limitSeconds;
};
