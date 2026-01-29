import { NextResponse } from 'next/server';
import { deleteCustomer } from '@/lib/leads';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function DELETE(request: Request, context: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await context.params;

        if (!session || session.user?.role !== 'ADMIN' || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await deleteCustomer(id, session.user.email);

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete failed', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

import { getLead, updateLead } from '@/lib/leads';

export async function PATCH(request: Request, context: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // 1. Fetch existing
        const existing = await getLead(id);
        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // 2. Merge changes
        const updatedCustomer = { ...existing, ...body };

        // 3. Save
        const result = await updateLead(updatedCustomer, session.user.email);

        return NextResponse.json({ success: true, customer: result });

    } catch (error) {
        console.error('Update failed', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
