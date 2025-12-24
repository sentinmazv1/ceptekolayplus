import { NextResponse } from 'next/server';
import { deleteCustomer } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
    params: {
        id: string;
    };
}

export async function DELETE(request: Request, context: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = context.params;

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
