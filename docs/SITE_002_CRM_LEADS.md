# SITE-002 — UTM, заявки и Voronka CRM

Публичный сайт `site_sv` передаёт обращения в Voronka **только** через подписанный HTTPS webhook. Прямого подключения к базе CRM нет.

## Env

| Переменная | Назначение |
|------------|------------|
| `VORONKA_WEBHOOK_URL` | `POST` endpoint (обычно `/api/crm/integrations/solo_pr/leads` на Voronka) |
| `VORONKA_WEBHOOK_SECRET` | Shared secret для HMAC |
| `VORONKA_PROJECT_ID` | Необязательно: `project_id` в envelope, если `DEFAULT_PROJECT_ID` на CRM уже задан |
| `VORONKA_ENABLED` | `false` — форма принимает заявку, но webhook не вызывается (локальная разработка) |

См. также [ANALYTICS.md](./ANALYTICS.md) про UTM в промо-ссылках.

## UTM и сессия

1. Посетитель переходит по ссылке с `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
2. Клиентский компонент `AttributionCapture` отправляет метки в `POST /api/attribution/`.
3. Сервер сохраняет первое касание в HttpOnly cookie `sv_utm` (90 дней, `SameSite=Lax`): только UTM и `landing_path`, без PII.
4. При отправке формы `POST /api/leads/` сервер читает cookie и добавляет в payload:
   - поля `utm_*`, `source_id` (= `utm_source`), `campaign_id` (= `utm_campaign`);
   - блок `[site_sv attribution]` в конце текста сообщения (чтобы оператор видел источник до расширения CRM-004).

Повторный визит с другими UTM обновляет только изменившиеся метки; пустые значения не затирают сохранённые.

## Форма и согласия

В подвале (`#contacts`):

- обязательное согласие на обработку ПДн для ответа (ссылка на `/privacy/`);
- необязательное согласие на рекламные/новостные письма (`ads_consent`);
- альтернатива — mailto на email из контента.

## Outbound `lead.created`

Контракт совпадает с [solo_pr INTEGRATIONS](https://github.com/voodoo2serg/solo_pr/blob/main/docs/INTEGRATIONS.md):

```
signature = HMAC-SHA256(secret, "{timestamp}.{canonical_json_body}")
Headers: content-type, x-solo-timestamp, x-solo-signature: sha256=<hex>,
         x-solo-event, x-voronka-timestamp, x-voronka-signature (aliases),
         idempotency-key (= lead UUID)
```

`source` в envelope: `site_sv`. В `data.service`: `site_sv`. Идемпотентность: UUID заявки.

Пример `data` (сокращённо):

```json
{
  "email": "visitor@example.com",
  "name": "Имя",
  "service": "site_sv",
  "consent": true,
  "ads_consent": false,
  "source_id": "telegram",
  "campaign_id": "solo_pr_launch",
  "utm_source": "telegram",
  "utm_campaign": "solo_pr_launch"
}
```

## Маршруты

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` / `POST` | `/api/attribution/` | Записать/прочитать UTM cookie |
| `POST` | `/api/leads/` | Принять форму, подписать и отправить webhook |

Оба защищены same-origin (кроме `GET` attribution без побочных эффектов без query).

## Приёмка

1. Открыть сайт с UTM, например `/?utm_source=telegram&utm_campaign=test_site_002`.
2. Отправить форму в подвале с согласием.
3. В Voronka: один `IntegrationInbox` / профиль по `event_id`, в теле Activity — сообщение с блоком attribution и `source_id` / `campaign_id`.

## Ошибки

- Нет env → ответ `ok` с `voronka: misconfigured` (форма не падает; на проде env обязателен).
- HTTP ≠ 2xx от CRM → `502` посетителю, повторная отправка создаёт **новый** UUID (идемпотентность на стороне пользователя — не двойной клик).