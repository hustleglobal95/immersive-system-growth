export async function GET() {
  return Response.json({ ok: true, service: "immersive-site-forge", timestamp: new Date().toISOString() });
}
