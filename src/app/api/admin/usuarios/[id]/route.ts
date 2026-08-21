import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Somente ADMIN pode gerenciar usuários." },
        { status: 403 }
      ),
    };
  }

  return { session, response: null };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdminSession();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const current = await prisma.adminProfile.findUnique({ where: { id } });

    if (!current) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const name = body.name !== undefined ? String(body.name ?? "").trim() : current.name;
    const email = body.email !== undefined
      ? String(body.email ?? "").trim().toLowerCase()
      : current.email;
    const role = body.role === "ADMIN"
      ? "ADMIN"
      : body.role === "EDITOR"
        ? "EDITOR"
        : current.role;
    const active = body.active !== undefined ? Boolean(body.active) : current.active;

    if (!email) {
      return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
    }

    if (id === auth.session!.id && active === false) {
      return NextResponse.json(
        { error: "Você não pode desativar o próprio usuário." },
        { status: 400 }
      );
    }

    if (current.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.adminProfile.count({
        where: { role: "ADMIN", active: true },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Não é possível remover o último ADMIN." },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = createSupabaseAdminClient();

    if (email !== current.email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const user = await prisma.adminProfile.update({
      where: { id },
      data: { name: name || null, email, role, active },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("ERRO AO EDITAR USUÁRIO:", error);
    return NextResponse.json(
      { error: "Não foi possível editar o usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdminSession();
  if (auth.response) return auth.response;

  try {
    if (id === auth.session!.id) {
      return NextResponse.json(
        { error: "Você não pode excluir o próprio usuário." },
        { status: 400 }
      );
    }

    const user = await prisma.adminProfile.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (user.role === "ADMIN" && user.active) {
      const adminCount = await prisma.adminProfile.count({
        where: { role: "ADMIN", active: true },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Não é possível excluir o último ADMIN." },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await prisma.adminProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ERRO AO EXCLUIR USUÁRIO:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o usuário." },
      { status: 500 }
    );
  }
}
