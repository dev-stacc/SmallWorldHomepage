import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hydrate } from "./hydrate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "state.example.json");
const port = Number(process.env.MOCK_PORT ?? 9847);

createServer(async (request, response) => {
    const path = (request.url ?? "").split("?")[0];

    if (path === "/state.json") {
        try {
            const body = JSON.stringify(
                hydrate(JSON.parse(await readFile(fixture, "utf8"))),
            );
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
        return;
    }

    if (path === "/healthz") {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("ok\n");
        return;
    }

    response.writeHead(404);
    response.end();
}).listen(port, "127.0.0.1", () => {
    process.stdout.write("mock collector on http://127.0.0.1:" + port + "\n");
});
