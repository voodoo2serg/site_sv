import {isEditor} from '@/lib/auth';
import {editorOidcEnabled} from '@/lib/editor-oidc';
import {readContent} from '@/lib/content';
import Login from '@/components/Login';
import Editor from '@/components/Editor';
export const dynamic='force-dynamic';
export const metadata={title:'Редактор — Сергей Водопетов',robots:{index:false,follow:false}};
export default async function Edit(){if(!await isEditor(true))return <Login ssoEnabled={editorOidcEnabled()}/>;return <Editor initial={await readContent()}/>}
