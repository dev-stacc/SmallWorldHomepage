import type { NextConfig } from "next";

const config: NextConfig = {
    output: "standalone",
    poweredByHeader: false,
    reactStrictMode: true,
    // The dummy data is this mirror's only data source, so unlike the private
    // original it has to survive into the standalone bundle. Both paths are
    // read with process.cwd(), which server.js chdir's to its own directory.
    outputFileTracingIncludes: {
        "*": ["./fixtures/**", "./config.example.json"],
    },
    outputFileTracingExcludes: {
        "*": ["./src/**"],
    },
};

export default config;
