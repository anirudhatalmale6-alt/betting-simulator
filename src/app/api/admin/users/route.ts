import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, username: true, balance: true, role: true, createdAt: true,
        _count: { select: { bets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: message.includes('Admin') ? 403 : 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const { userId, balance, role } = await request.json();
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (balance !== undefined) data.balance = Number(balance);
    if (role) data.role = role;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true, balance: true, role: true },
    });

    if (balance !== undefined) {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'admin_adjustment',
          amount: Number(balance) - (user.balance || 0),
          balance: Number(balance),
          description: 'Balance adjusted by admin',
        },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
