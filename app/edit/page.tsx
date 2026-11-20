import {editorLogoutLink,isEditor} from '@/lib/auth';
import {
  editorOidcBreakGlass,
  editorOidcCutover,
  editorOidcEnabled,
} from '@/lib/editor-oidc';
import {readContent} from '@/lib/content';
import Login from '@/components/Login';
import Editor from '@/components/Editor';
export const dynamic='force-dynamic';
export const metadata={title:'Редактор — Сергей Водопетов',robots:{index:false,follow:false}};

type Props = {searchParams?: Promise<Record<string, string | string[] | undefined>>};

export default async function Edit({searchParams}: Props){
  if(!await isEditor(true)){
    const params = searchParams ? await searchParams : {};
    const raw = params.error;
    const ssoError = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
    return (
      <Login
        ssoEnabled={editorOidcEnabled()}
        cutover={editorOidcCutover()}
        breakGlass={editorOidcBreakGlass()}
        ssoError={ssoError}
      />
    );
  }
  return <Editor initial={await readContent()} logout={await editorLogoutLink()}/>;
}
