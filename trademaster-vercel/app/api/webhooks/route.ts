import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await query(
      "SELECT id, name, url, platform, is_active, last_fired_at, last_status_code, created_at FROM trademaster_webhooks ORDER BY created_at DESC"
    );
    return NextResponse.json({ ok: true, webhooks: rows });
  } catch (err) {
    console.error("[GET /api/webhooks]", err);
    return NextResponse.json({ ok: false, error: "Failed to list webhooks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  if (adminToken) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${adminToken}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    await ensureSchema();
    const body = await req.json();
    const { name, url, platform = "generic", secret } = body;
    if (!name || !url) {
      return NextResponse.json({ ok: false, error: "name and url required" }, { status: 400 });
    }
    const [row] = await query<{ id: number }>(
      "INSERT INTO trademaster_webhooks (name, url, platform, secret) VALUES ($1,$2,$3,$4) RETURNING id",
      [name, url, platform, secret ?? null]
    );
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/webhooks]", err);
    return NextResponse.json({ ok: false, error: "Failed to create webhook" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  if (adminToken) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${adminToken}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await query("DELETE FROM trademaster_webhooks WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/webhooks]", err);
    return NextResponse.json({ ok: false, error: "Failed to delete webhook" }, { status: 500 });
  }
}
