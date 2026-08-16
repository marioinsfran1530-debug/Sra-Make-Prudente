import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Permissão insuficiente." },
      { status: 403 }
    );
  }

  const users = await prisma.adminProfile.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Somente ADMIN pode criar usuários." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const name = String(body.name ?? "").trim();

    const role =
      body.role === "ADMIN"
        ? "ADMIN"
        : "EDITOR";

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Usuário não foi criado." },
        { status: 500 }
      );
    }

    const profile = await prisma.adminProfile.create({
      data: {
        id: data.user.id,
        email,
        name: name || null,
        role,
        active: true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR USUÁRIO:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o usuário." },
      { status: 500 }
    );
  }
}
