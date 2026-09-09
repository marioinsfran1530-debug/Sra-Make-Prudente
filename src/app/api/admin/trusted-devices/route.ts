import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  TRUSTED_ADMIN_DEVICE_COOKIE,
  TRUSTED_ADMIN_DEVICE_DAYS,
  createTrustedAdminDevice,
  getTrustedAdminDeviceFromCookie,
  listTrustedAdminDevices,
  revokeTrustedAdminDevice,
} from "@/lib/trusted-admin-device";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [devices, currentDevice] = await Promise.all([
    listTrustedAdminDevices(auth.session.id),
    getTrustedAdminDeviceFromCookie(auth.session.id),
  ]);

  return NextResponse.json({
    devices: devices.map((device) => ({
      id: device.id,
      label: device.label,
      userAgent: device.userAgent,
      createdAt: device.createdAt,
      lastUsedAt: device.lastUsedAt,
      expiresAt: device.expiresAt,
      current: device.id === currentDevice?.id,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || aal?.currentLevel !== "aal2") {
    return NextResponse.json(
      { error: "Confirme o código da autenticação em duas etapas antes de confiar neste aparelho." },
      { status: 403 }
    );
  }

  let label: string | null = null;
  try {
    const body = (await request.json()) as { label?: unknown };
    if (typeof body.label === "string") label = body.label;
  } catch {
    // Corpo opcional.
  }

  const trusted = await createTrustedAdminDevice({
    adminId: auth.session.id,
    label,
    userAgent: request.headers.get("user-agent"),
  });

  const response = NextResponse.json({
    ok: true,
    device: {
      id: trusted.id,
      label: trusted.label,
      expiresAt: trusted.expiresAt,
    },
  });

  response.cookies.set(TRUSTED_ADMIN_DEVICE_COOKIE, trusted.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_ADMIN_DEVICE_DAYS * 24 * 60 * 60,
  });

  return response;
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let deviceId = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id === "string") deviceId = body.id.trim();
  } catch {
    // Validado abaixo.
  }

  if (!deviceId) {
    return NextResponse.json({ error: "Dispositivo inválido." }, { status: 400 });
  }

  const currentDevice = await getTrustedAdminDeviceFromCookie(auth.session.id);
  await revokeTrustedAdminDevice(auth.session.id, deviceId);

  const response = NextResponse.json({ ok: true });

  if (currentDevice?.id === deviceId) {
    const cookieStore = await cookies();
    cookieStore.delete(TRUSTED_ADMIN_DEVICE_COOKIE);
    response.cookies.set(TRUSTED_ADMIN_DEVICE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
