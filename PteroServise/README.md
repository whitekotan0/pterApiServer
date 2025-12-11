# PteroServise

Система мікросервісів для обробки Mermaid діаграм через ChatGPT API.

## Архітектура

- **auth-service** (порт 3001) - Мікросервіс авторизації та аутентифікації через Google Firebase
  - Верифікація Firebase токенів
  - Генерація власних JWT токенів
  - Ендпоінти: `/api/auth/login`, `/api/auth/register`, `/api/auth/token`

- **gpt-service** (порт 3002) - Мікросервіс для роботи з ChatGPT API та обробки Mermaid діаграм
  - Обробка Mermaid діаграм через ChatGPT
  - Відстеження використання токенів користувачів
  - Ендпоінт: `/api/gpt/process`

- **api-gateway** (порт 3000) - API Gateway для маршрутизації запитів
  - Єдина точка входу для всіх запитів
  - Проксі запитів до відповідних мікросервісів

## Вимоги

- Node.js 18+
- Docker та Docker Compose
- Google Firebase проект (для авторизації)
- OpenAI API ключ (для ChatGPT)

## Швидкий старт

### 1. Клонування репозиторію

```bash
git clone <your-repo-url>
cd PteroServise
```

### 2. Налаштування змінних оточення

Створіть файл `.env` в корені проекту:

```env
# JWT Secret (використовується в auth-service та gpt-service)
# Згенеруйте випадковий секретний ключ одним з способів:
# - PowerShell: [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
# - Node.js: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# - Онлайн генератор: https://generate-secret.vercel.app/64
# ВАЖЛИВО: Використовуйте міцний випадковий ключ у продакшені!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# Час дії JWT токену (7d = 7 днів, можна змінити на 1h, 24h, 30d тощо)
JWT_EXPIRES_IN=7d

# Firebase налаштування
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# OpenAI налаштування
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
```

### 3. Запуск через Docker Compose

```bash
docker-compose up -d
```

Перевірте статус сервісів:

```bash
docker-compose ps
```

Перевірте логи:

```bash
docker-compose logs -f
```

### 4. Перевірка роботи

Відкрийте браузер або використайте curl:

```bash
# Health check API Gateway
curl http://localhost:3000/health

# Health check Auth Service
curl http://localhost:3001/health

# Health check GPT Service
curl http://localhost:3002/health
```

## API Документація

### Авторизація

#### Реєстрація/Вхід

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "firebaseToken": "your-firebase-id-token"
}
```

Відповідь:
```json
{
  "success": true,
  "token": "your-jwt-token",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

#### Отримання токену

```bash
POST http://localhost:3000/api/auth/token
Content-Type: application/json

{
  "firebaseToken": "your-firebase-id-token"
}
```

### Обробка Mermaid діаграм

```bash
POST http://localhost:3000/api/gpt/process
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "mermaid": "graph TD\n    A[Start] --> B[End]",
  "text": "Оптимізуй цю діаграму"
}
```

Відповідь:
```json
{
  "success": true,
  "code": "оптимізований код діаграми",
  "tokensUsed": 150,
  "tokensRemaining": 9850,
  "requestsRemaining": 99
}
```

## Розробка

### Локальна розробка без Docker

1. Встановіть залежності:

```bash
npm install
cd services/auth-service && npm install
cd ../gpt-service && npm install
cd ../api-gateway && npm install
```

2. Налаштуйте змінні оточення для кожного сервісу

3. Запустіть сервіси окремо:

```bash
# Термінал 1 - Auth Service
cd services/auth-service
npm run dev

# Термінал 2 - GPT Service
cd services/gpt-service
npm run dev

# Термінал 3 - API Gateway
cd services/api-gateway
npm run dev
```

### Збірка для продакшену

```bash
# Збірка всіх сервісів
npm run build

# Або окремо
cd services/auth-service && npm run build
cd services/gpt-service && npm run build
cd services/api-gateway && npm run build
```

## Структура проекту

```
.
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── gpt-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── api-gateway/
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Документація

- 📖 [Інструкції по деплою](DEPLOY.md) - повний гайд по деплою на GitHub та сервер
- 🧪 [Інструкції по тестуванню](TESTING.md) - як тестувати систему
- 🔒 [Безпека та надійність](SECURITY.md) - детальний опис покращень безпеки

## Наступні кроки

- [x] Додати rate limiting
- [x] Покращити безпеку (helmet, CORS, валідація)
- [x] Додати health checks
- [x] Додати graceful shutdown
- [x] Покращити обробку помилок
- [ ] Додати базу даних для зберігання токенів користувачів
- [ ] Реалізувати мікросервіс для оплати/підписки
- [ ] Додати моніторинг та логування (Prometheus, Grafana)
- [ ] Додати автоматичні тести (Jest, Supertest)
- [ ] Додати CI/CD pipeline для автоматичного деплою

## Ліцензія

ISC

