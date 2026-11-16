# SIGNAL platform v5.2 — задачи репозитория site_sv

**Каноническая архитектура:** https://github.com/voodoo2serg/solo_pr/blob/main/docs/signal/PLATFORM_ACTUAL_ARCHITECTURE_v5_2.md

**Единый backlog / зависимости и приёмка:** https://github.com/voodoo2serg/solo_pr/blob/main/docs/signal/CONNECTIVITY_TICKETS_v5_2.md

**Статус:** задано к разработке; НЕ означает, что все пункты не реализованы — сначала провести source+CI сверку. Успешный commit/merge != DEPLOYED/E2E_PASS. Платформенный backlog имеет приоритет при противоречиях; этот файл — рабочий локальный срез.

## Роль сервиса

Персональный публичный сайт, источники заявок; никаких копий CRM или коммерческой бухгалтерии.

## Тикеты

| ID | Приоритет | Работа | Приёмка |
|---|---|---|---|
| SITE-102 | P0 | PR #1 подписанный UTM lead.created | No duplicate lead |
| ANALYTICS-101 | P1 | Umami anonymous page events | No PII and consent-aware |

## Исполнительский протокол

1. До реализации сверить с PR/commit/миграциями в main. Статус каждого тикета вести как `NOT_STARTED`, `CODE_READY`, `MERGED`, `DEPLOYED`, `E2E_PASS` со ссылкой на проверку.
2. Согласовать OpenAPI/event contract и migration plan; новых прямых SQL связей с соседними сервисами не создавать.
3. Не писать чувствительные данные в RAGA/Umami; asset-originals в Media Registry; consent and financial truth только в Voronka.
4. Сохранить независимое исполнение сервисов при временной недоступности Signal. Перед опасными миграциями backup+restore и rollback.
5. Обновить канонический status registry в `solo_pr/docs/signal/` вместе с изменением, а не через месяцы после деплоя.
