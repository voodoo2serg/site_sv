import {NextResponse} from 'next/server';
import {editorOidcStatus} from '@/lib/editor-oidc';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(editorOidcStatus(), {
    headers: {'Cache-Control': 'no-store'},
  });
}
