import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hydrate } from "./hydrate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "agents");
const basePort = Number(process.env.MOCK_AGENT_PORT ?? 9851);
const token = process.env.AGENT_TOKEN ?? "";

const hosts = (await readdir(dir))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();

hosts.forEach((host, index) => {
    const port = basePort + index;

    createServer(async (request, response) => {
        const path = (request.url ?? "").split("?")[0];

        if (path !== "/stats") {
            response.writeHead(404);
            response.end();
            return;
        }

        if (token !== "" && request.headers.authorization !== "Bearer " + token) {
            response.writeHead(401, { "Content-Type": "text/plain" });
            response.end("unauthorized\n");
            return;
        }

        try {
            const raw = JSON.parse(await readFile(join(dir, host + ".json"), "utf8"));
            const body = JSON.stringify(hydrate(raw));
            response.writeHead(200, {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "Content-Length": Buffer.byteLength(body),
            });
            response.end(body);
        } catch (error) {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end(String(error));
        }
    }).listen(port, "127.0.0.1", () => {
        process.stdout.write("mock agent " + host + " on 127.0.0.1:" + port + "\n");
    });
});
