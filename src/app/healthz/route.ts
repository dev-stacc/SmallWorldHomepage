export const dynamic = "force-dynamic";

export const GET = () =>
    Response.json({ ok: true, at: new Date().toISOString() }, { status: 200 });
