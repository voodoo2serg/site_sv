# Развёртывание на VPS

Это инструкция для одного сервера и одного процесса Next.js. Отдельная БД, R2, аккаунт Cloudflare и ChatGPT для такого размещения не требуются. Сам VPS в рамках переноса в GitHub не настраивался: ниже воспроизводимые шаги и конфигурация.

## 1. Подготовить сервер

Пример рассчитан на Ubuntu 24.04 / Debian с systemd и Nginx. Нужны SSH-доступ с sudo, домен и доступные порты 80/443. DNS-запись A (и AAAA при использовании IPv6) должна указывать на VPS. Порт 3000 наружу не открывайте.

Установите Node.js 24 LTS с npm из официального источника или через принятый на сервере менеджер пакетов. Проверьте `node --version`, `npm --version`, `command -v node`. В шаблоне systemd указан `/usr/bin/node`: если путь другой, исправьте `ExecStart`.

```bash
sudo apt update
sudo apt install git nginx certbot python3-certbot-nginx openssl
sudo useradd --system --user-group --home-dir /srv/site_sv --shell /usr/sbin/nologin site-sv
sudo install -d -o site-sv -g site-sv -m 750 /srv/site_sv
sudo install -d -o site-sv -g site-sv -m 700 /var/lib/site-sv
sudo -u site-sv git clone https://github.com/voodoo2serg/site_sv.git /srv/site_sv
```

## 2. Настроить окружение

Создайте `/etc/site-sv.env`:

```dotenv
NEXT_PUBLIC_SITE_URL=https://example.com
CONTENT_DIRECTORY=/var/lib/site-sv
EDITOR_PASSWORD=ЗАМЕНИТЕ_НА_СЛУЧАЙНУЮ_СТРОКУ
```

Замените домен. Сгенерируйте пароль, например, `openssl rand -hex 32`, и вставьте результат в файл. Не используйте буквальный пример. Пароль нужен только для редактора; посетители VPS-сайта видят публичные страницы без входа.

```bash
sudo chown root:site-sv /etc/site-sv.env
sudo chmod 640 /etc/site-sv.env
```

На VPS не задавайте `OWNER_PRIVATE_EDITOR` и `EDITOR_PREVIEW`. Identity-заголовки ChatGPT здесь не являются способом входа.

## 3. Установить зависимости и собрать

```bash
sudo -u site-sv sh -c 'cd /srv/site_sv && npm ci'
sudo -u site-sv sh -c 'cd /srv/site_sv && npm run check && npm test'
sudo -u site-sv sh -c 'cd /srv/site_sv && NEXT_PUBLIC_SITE_URL=https://example.com npm run build:vps'
sudo -u site-sv mkdir -p /srv/site_sv/.next/cache
```

Адрес `NEXT_PUBLIC_SITE_URL` обязательно передайте при сборке: он используется для canonical, sitemap и метаданных. Одного изменения переменной во время запуска недостаточно. Секретный пароль при сборке не нужен.

## 4. Запустить systemd

```bash
sudo cp /srv/site_sv/deploy/site-sv.service /etc/systemd/system/site-sv.service
sudo systemctl daemon-reload
sudo systemctl enable --now site-sv
sudo systemctl status site-sv
curl -I http://127.0.0.1:3000/
```

В `deploy/site-sv.service` исправьте путь к Node.js, если он отличается. Сервис работает от отдельного пользователя и пишет только в каталог текстов и кэш Next.js.

Логи: `sudo journalctl -u site-sv -n 100 --no-pager`.

## 5. Настроить домен, Nginx и HTTPS

Замените `example.com` в конфигурации на свой домен:

```bash
sudo cp /srv/site_sv/deploy/nginx.conf /etc/nginx/sites-available/site-sv
sudo editor /etc/nginx/sites-available/site-sv
sudo ln -s /etc/nginx/sites-available/site-sv /etc/nginx/sites-enabled/site-sv
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d example.com
```

Certbot дополнит конфигурацию TLS. Проверьте его автопродление: `sudo certbot renew --dry-run`. Если `editor` не установлен, используйте свой текстовый редактор.

Только после настройки HTTPS входите в `/edit/`: авторизационная cookie в production помечена Secure. Пример Nginx ограничивает частоту попыток входа и удаляет клиентские identity-заголовки. Адрес редактора не публикуется в меню, но защищается именно авторизацией, а не скрытым URL.

## 6. Перенести тексты из текущего сайта

1. На текущем Sites-сайте откройте редактор и нажмите «Скачать копию».
2. На VPS откройте `https://example.com/edit/`, войдите по паролю из окружения.
3. Нажмите «Загрузить копию», проверьте тексты и нажмите «Сохранить».
4. Проверьте главную и одну внутреннюю страницу.
5. Перезапустите сервис и убедитесь, что правки остались.

Исходники репозитория содержат последнюю редакцию из этой переписки. Скачанная из рабочего редактора копия дополнительно переносит любые самостоятельные изменения, сделанные через браузер.

## 7. Резервное копирование

Постоянные файлы находятся в `/var/lib/site-sv`, вне каталога исходников. Не храните их в `/tmp`, внутри сменяемого release-каталога или на эфемерном диске. Для согласованной ручной копии на минуту остановите сервис:

```bash
sudo systemctl stop site-sv
sudo tar -C /var/lib -czf /root/site-sv-content-backup.tar.gz site-sv
sudo systemctl start site-sv
```

Настройте собственное регулярное резервирование и храните копии отдельно от VPS. `previous.json` — лишь одна предыдущая версия. Копии `/etc/site-sv.env` храните отдельно и защищённо: там находится пароль.

Для восстановления остановите сервис, восстановите каталог, назначьте владельца `site-sv:site-sv` и запустите сервис. Восстановление также можно выполнить через импорт JSON в браузерном редакторе.

## 8. Обновить код

Выполняйте от пользователя, которому принадлежит checkout. Для небольшого сайта допустимо короткое окно обслуживания:

```bash
sudo systemctl stop site-sv
sudo -u site-sv git -C /srv/site_sv pull --ff-only origin main
sudo -u site-sv sh -c 'cd /srv/site_sv && npm ci && npm run check && npm test'
sudo -u site-sv sh -c 'cd /srv/site_sv && NEXT_PUBLIC_SITE_URL=https://example.com npm run build:vps'
sudo -u site-sv mkdir -p /srv/site_sv/.next/cache
sudo systemctl start site-sv
```

При ошибке сборки сначала устраните её или вернитесь к предыдущему коммиту и пересоберите. Каталог `/var/lib/site-sv` не очищайте. Более сложная схема с release-каталогами возможна, но для статичного персонального сайта не обязательна.

## Проверки перед открытием

- HTTPS работает; `/`, `/pr/`, `/digital/`, `/science/`, `/interests/`, `/about/`, `/biography/` открываются.
- `/edit/` без входа показывает форму, а `/api/content/` возвращает 401.
- Правка и форматирование сохраняются; после перезапуска текст не теряется.
- `robots.txt` и `sitemap.xml` содержат ваш домен, в исходном HTML правильный canonical.
- Все фотографии, логотипы и локальные шрифты загружаются.

## Технические пределы

Дисковое хранилище рассчитано на один Node-процесс. Не запускайте PM2 cluster, несколько systemd-экземпляров или несколько контейнеров поверх одного каталога: очередь записи действует внутри процесса. Сохранение атомарно заменяет основной JSON и проверяет его `version`; конкурентная правка из другой вкладки получает сообщение о конфликте.

При отсутствии `CONTENT_DIRECTORY` production-сервер не сохраняет изменения. При ошибке чтения или повреждённом JSON приложение не заменяет данные исходным шаблоном автоматически: восстановите файл из резервной копии.

## Официальная документация

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Nginx proxy_set_header](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)
- [Nginx limit_req](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [Node.js download](https://nodejs.org/en/download)
