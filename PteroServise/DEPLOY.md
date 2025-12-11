# Інструкції по деплою

Цей документ містить повні інструкції по деплою PteroServise на GitHub та сервер.

## Зміст

1. [Деплой на GitHub](#деплой-на-github)
2. [Деплой на сервер](#деплой-на-сервер)
3. [Тестування](#тестування)
4. [Моніторинг та підтримка](#моніторинг-та-підтримка)

## Деплой на GitHub

### 1. Створення репозиторію

1. Створіть новий репозиторій на GitHub
2. Ініціалізуйте локальний Git репозиторій:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/PteroServise.git
git push -u origin main
```

### 2. Налаштування GitHub Secrets (для CI/CD)

Якщо ви хочете використовувати GitHub Actions для автоматичного деплою:

1. Перейдіть в Settings > Secrets and variables > Actions
2. Додайте наступні secrets (якщо потрібно для деплою):
   - `JWT_SECRET` - ваш секретний ключ
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `OPENAI_API_KEY`

**⚠️ УВАГА:** Не додавайте секрети в код або комітьте `.env` файл!

### 3. Перевірка CI/CD Pipeline

GitHub Actions автоматично запускається при push в `main` або `develop` гілки. Перевірте статус в розділі "Actions".

## Підготовка до деплою на сервер

### 1. Вимоги до сервера

- **ОС:** Ubuntu 20.04+ або Debian 11+ (рекомендовано)
- **RAM:** Мінімум 2GB (рекомендовано 4GB+)
- **CPU:** Мінімум 2 ядра
- **Диск:** Мінімум 10GB вільного місця
- **Docker:** версія 20.10+
- **Docker Compose:** версія 2.0+

### 2. Встановлення Docker та Docker Compose

```bash
# Оновлення системи
sudo apt update && sudo apt upgrade -y

# Встановлення Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Встановлення Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезавантаження (або вийти та увійти знову)
newgrp docker
```

### 3. Налаштування змінних оточення

Створіть файл `.env` на сервері з наступними змінними:

```env
# Оточення
NODE_ENV=production

# JWT Secret (обов'язково змініть на випадковий рядок!)
# Згенеруйте через: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Firebase налаштування
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# OpenAI налаштування
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4

# CORS налаштування (додайте ваші домени через кому)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. Отримання Firebase credentials

1. Перейдіть в [Firebase Console](https://console.firebase.google.com/)
2. Виберіть ваш проект
3. Перейдіть в Settings > Service Accounts
4. Натисніть "Generate new private key"
5. Збережіть JSON файл та витягніть з нього:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 5. Отримання OpenAI API ключа

1. Перейдіть на [OpenAI Platform](https://platform.openai.com/)
2. Створіть або використайте існуючий API ключ
3. Додайте його в `.env` як `OPENAI_API_KEY`

## Деплой на сервер

### Варіант 1: Через Git (рекомендовано)

1. Підключіться до сервера через SSH:

```bash
ssh user@your-server-ip
```

2. Клонуйте репозиторій:

```bash
cd /opt  # або іншу директорію
git clone https://github.com/your-username/PteroServise.git
cd PteroServise
```

3. Створіть файл `.env` з налаштуваннями (скопіюйте з `env.example` та заповніть):

```bash
cp env.example .env
nano .env  # або використайте ваш улюблений редактор
```

4. Запустіть через Docker Compose:

```bash
# Перевірте конфігурацію
docker-compose config

# Зберіть та запустіть контейнери
docker-compose up -d --build

# Перевірте статус
docker-compose ps
```

5. Перевірте логи:

```bash
docker-compose logs -f
```

### Варіант 2: Через SCP (якщо Git недоступний)

1. Запакуйте проект локально (виключивши node_modules та .env):

```bash
tar -czf pteroservise.tar.gz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='dist' \
  --exclude='.git' \
  .
```

2. Завантажте на сервер:

```bash
scp pteroservise.tar.gz user@your-server:/opt/
```

3. На сервері:

```bash
cd /opt
tar -xzf pteroservise.tar.gz
cd PteroServise
# Створіть .env файл
nano .env
docker-compose up -d --build
```

### Налаштування Firewall

```bash
# Дозволити тільки необхідні порти
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (якщо використовуєте Nginx)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# НЕ відкривайте порти 3000, 3001, 3002 публічно!
# Доступ до сервісів тільки через API Gateway (3000) або через Nginx reverse proxy
```

### Налаштування Nginx (рекомендовано для продакшену)

1. Встановіть Nginx:

```bash
sudo apt install nginx
```

2. Створіть конфігурацію:

```bash
sudo nano /etc/nginx/sites-available/pteroservise
```

3. Додайте конфігурацію:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Редирект на HTTPS (якщо використовуєте SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL сертифікати (використайте Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Безпека
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Обмеження розміру тіла
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout для GPT запитів
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
```

4. Активуйте конфігурацію:

```bash
sudo ln -s /etc/nginx/sites-available/pteroservise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. Налаштуйте SSL через Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Тестування

### 1. Локальне тестування перед деплоєм

```bash
# Запустіть локально
docker-compose up -d

# Перевірте health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### 2. Тестування API endpoints

#### Тест авторизації:

```bash
# Отримайте Firebase token з вашого клієнта, потім:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken": "your-firebase-token"}'
```

#### Тест обробки Mermaid:

```bash
# Спочатку отримайте JWT token з попереднього кроку
TOKEN="your-jwt-token"

curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mermaid": "graph TD\n    A[Start] --> B[End]",
    "text": "Оптимізуй цю діаграму"
  }'
```

### 3. Тестування на сервері

```bash
# Перевірка статусу контейнерів
docker-compose ps

# Перевірка health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Перевірка логів на помилки
docker-compose logs | grep -i error
```

### 4. Навантажувальне тестування (опціонально)

Використайте `ab` (Apache Bench) або `wrk`:

```bash
# Встановлення
sudo apt install apache2-utils

# Тест
ab -n 1000 -c 10 http://localhost:3000/health
```

## Оновлення

### Оновлення через Git

```bash
# На сервері
cd /opt/PteroServise

# Отримати останні зміни
git pull

# Перебудувати та перезапустити
docker-compose up -d --build

# Перевірити статус
docker-compose ps
docker-compose logs -f
```

### Оновлення окремого сервісу

```bash
# Перебудувати та перезапустити конкретний сервіс
docker-compose up -d --build --no-deps auth-service

# Або просто перезапустити
docker-compose restart auth-service
```

### Відкат до попередньої версії

```bash
# Перейти на попередній коміт
git checkout <previous-commit-hash>
docker-compose up -d --build
```

## Моніторинг

### Перевірка логів

```bash
# Всі сервіси
docker-compose logs -f

# Конкретний сервіс
docker-compose logs -f auth-service
docker-compose logs -f gpt-service
docker-compose logs -f api-gateway
```

### Перевірка здоров'я сервісів

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Налаштування Nginx (опціонально)

Якщо ви хочете використовувати Nginx як reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Безпека

### Обов'язкові заходи безпеки

1. **JWT_SECRET:** Обов'язково змініть на випадковий рядок (мінімум 64 символи)
2. **.env файл:** Ніколи не комітьте `.env` файл в Git (він вже в `.gitignore`)
3. **HTTPS:** Використовуйте HTTPS в продакшені (Let's Encrypt безкоштовний)
4. **Firewall:** Налаштуйте firewall для обмеження доступу до портів
5. **Оновлення:** Регулярно оновлюйте залежності та систему
6. **CORS:** Налаштуйте `ALLOWED_ORIGINS` тільки для ваших доменів
7. **Rate Limiting:** Вже налаштовано в коді, але можна додатково налаштувати в Nginx

### Додаткові рекомендації

- Використовуйте Docker secrets для чутливих даних (якщо використовуєте Docker Swarm)
- Налаштуйте моніторинг та алерти
- Регулярно робіть backup конфігурацій
- Використовуйте fail2ban для захисту від брутфорсу
- Обмежте SSH доступ тільки з певних IP (якщо можливо)

### Перевірка безпеки

```bash
# Перевірка відкритих портів
sudo netstat -tulpn | grep LISTEN

# Перевірка вразливостей в залежностях
npm audit
cd services/api-gateway && npm audit
cd ../auth-service && npm audit
cd ../gpt-service && npm audit

# Сканування Docker образів (якщо встановлено)
docker scan api-gateway
docker scan auth-service
docker scan gpt-service
```

## Troubleshooting

### Сервіси не запускаються

```bash
# Перевірте логи
docker-compose logs

# Перевірте чи всі змінні оточення встановлені
docker-compose config
```

### Помилки з Firebase

- Перевірте чи правильно скопійовано `FIREBASE_PRIVATE_KEY` (зберігайте `\n` як частину рядка)
- Перевірте чи `FIREBASE_CLIENT_EMAIL` відповідає вашому сервісному акаунту

### Помилки з OpenAI

- Перевірте чи API ключ валідний
- Перевірте чи є достатньо кредитів на акаунті OpenAI
- Перевірте rate limits OpenAI API
- Перевірте логи: `docker-compose logs gpt-service | grep -i openai`

### Проблеми з пам'яттю

```bash
# Перевірка використання ресурсів
docker stats

# Якщо не вистачає пам'яті, зменшіть обмеження в docker-compose.yml
```

### Проблеми з мережею

```bash
# Перевірка мережевих з'єднань
docker network inspect pteroservise-network

# Перезапуск мережі
docker-compose down
docker-compose up -d
```

## Моніторинг та підтримка

### Логування

```bash
# Всі логи
docker-compose logs -f

# Конкретний сервіс
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
docker-compose logs -f gpt-service

# Останні 100 рядків
docker-compose logs --tail=100

# Логи з фільтрацією
docker-compose logs | grep ERROR
```

### Моніторинг ресурсів

```bash
# Статистика контейнерів
docker stats

# Використання диску
docker system df

# Очищення невикористаних ресурсів
docker system prune -a
```

### Backup

```bash
# Backup .env файлу
cp .env .env.backup

# Backup docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Backup конфігурації Nginx (якщо використовується)
sudo cp /etc/nginx/sites-available/pteroservise /etc/nginx/sites-available/pteroservise.backup
```

### Автоматичний перезапуск при збоях

Docker Compose вже налаштований з `restart: unless-stopped`, але можна додатково налаштувати через systemd:

```bash
# Створіть systemd service
sudo nano /etc/systemd/system/pteroservise.service
```

```ini
[Unit]
Description=PteroServise Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/PteroServise
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Активуйте сервіс
sudo systemctl enable pteroservise
sudo systemctl start pteroservise
```

