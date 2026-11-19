'use client';
import {useState} from 'react';

type Props = {
  ssoEnabled?: boolean;
  cutover?: boolean;
  breakGlass?: boolean;
};

export default function Login({ssoEnabled=false, cutover=false, breakGlass=false}: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordAllowed = !ssoEnabled || !cutover || breakGlass;
  const showPasswordPrimary = !ssoEnabled;

  return (
    <main id="main" className="login-panel">
      <span className="eyebrow">Сергей Водопетов</span>
      <h1>Редактор сайта</h1>
      {ssoEnabled ? (
        <>
          <p>Вход через единый аккаунт SIGNAL (Keycloak). Публичный сайт остаётся без логина.</p>
          <p>
            <a className="ui-button primary" href="/api/editor-oidc/start">
              Войти через SIGNAL
            </a>
          </p>
          {cutover && !breakGlass && (
            <p>Локальный пароль редактора отключён после перехода на SSO.</p>
          )}
        </>
      ) : (
        <>
          <p>В закрытой версии сайта редактор открывается владельцу после входа через ChatGPT.</p>
          <a className="ui-button primary" href="/signin-with-chatgpt?return_to=%2Fedit" target="_top">
            Войти через ChatGPT ↗
          </a>
          <p>На отдельном сервере используйте пароль редактора.</p>
        </>
      )}
      {passwordAllowed && (
        showPasswordPrimary ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const r = await fetch('/api/login', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({password}),
                });
                const data = await r.json();
                if (r.ok) location.reload();
                else setError(data.error);
              } catch {
                setError('Не удалось соединиться с сервером');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field-label">
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="ui-button primary" disabled={busy}>
              {busy ? 'Входим…' : 'Войти'}
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        ) : (
          <details>
            <summary>Аварийный вход по паролю (break-glass)</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  const r = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({password}),
                  });
                  const data = await r.json();
                  if (r.ok) location.reload();
                  else setError(data.error);
                } catch {
                  setError('Не удалось соединиться с сервером');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field-label">
                Пароль
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="ui-button" disabled={busy}>
                {busy ? 'Входим…' : 'Аварийный вход'}
              </button>
              {error && <p role="alert">{error}</p>}
            </form>
          </details>
        )
      )}
      <a href="/">← На сайт</a>
    </main>
  );
}
