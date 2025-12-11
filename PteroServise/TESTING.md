# Інструкції по тестуванню

## Швидкий старт для тестування

### 1. Локальне тестування

```bash
# Запустіть сервіси
docker-compose up -d

# Перевірте health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### 2. Тестування API endpoints

#### Отримання Firebase Token

Спочатку вам потрібно отримати Firebase ID token з вашого клієнта (веб-додаток, мобільний додаток тощо).

#### Тест авторизації

```bash
# Замініть YOUR_FIREBASE_TOKEN на реальний токен
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "YOUR_FIREBASE_TOKEN"
  }'
```

Очікувана відповідь:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

Збережіть `token` для наступних запитів.

#### Тест обробки Mermaid діаграми

```bash
# Замініть YOUR_JWT_TOKEN на токен з попереднього кроку
TOKEN="YOUR_JWT_TOKEN"

curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mermaid": "graph TD\n    A[Start] --> B[End]",
    "text": "Оптимізуй цю діаграму"
  }'
```

Очікувана відповідь:
```json
{
  "success": true,
  "code": "оптимізований код діаграми",
  "tokensUsed": 150,
  "tokensRemaining": 9850,
  "requestsRemaining": 99
}
```

### 3. Тестування безпеки

#### Тест без токену

```bash
curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -d '{
    "mermaid": "graph TD\n    A[Start] --> B[End]"
  }'
```

Очікувана відповідь: `401 Unauthorized`

#### Тест з невалідним токеном

```bash
curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{
    "mermaid": "graph TD\n    A[Start] --> B[End]"
  }'
```

Очікувана відповідь: `403 Forbidden`

#### Тест rate limiting

```bash
# Виконайте багато запитів швидко
for i in {1..150}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"firebaseToken": "test"}' &
done
wait
```

Після ~100 запитів ви повинні отримати `429 Too Many Requests`.

### 4. Тестування валідації

#### Тест без mermaid діаграми

```bash
curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Просто текст"
  }'
```

Очікувана відповідь: `400 Bad Request` з повідомленням про валідацію.

#### Тест з порожньою діаграмою

```bash
curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mermaid": ""
  }'
```

Очікувана відповідь: `400 Bad Request`

### 5. Тестування обробки помилок

#### Тест з невалідним Firebase токеном

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "invalid-firebase-token"
  }'
```

Очікувана відповідь: `401 Unauthorized`

#### Тест з невалідним OpenAI API ключем

Якщо ви тимчасово встановите невалідний `OPENAI_API_KEY` в `.env`:

```bash
# Очікується помилка при обробці Mermaid
curl -X POST http://localhost:3000/api/gpt/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mermaid": "graph TD\n    A[Start] --> B[End]"
  }'
```

Очікувана відповідь: `500 Internal Server Error` з повідомленням про помилку.

### 6. Навантажувальне тестування

#### Встановлення інструментів

```bash
# Apache Bench
sudo apt install apache2-utils

# або wrk
sudo apt install wrk
```

#### Тест health endpoint

```bash
# 1000 запитів, 10 одночасно
ab -n 1000 -c 10 http://localhost:3000/health
```

#### Тест з wrk

```bash
# 1000 запитів, 10 потоків, тривалість 30 секунд
wrk -t10 -c100 -d30s http://localhost:3000/health
```

### 7. Тестування Docker контейнерів

#### Перевірка статусу

```bash
docker-compose ps
```

Всі сервіси повинні бути в стані `Up`.

#### Перевірка логів

```bash
# Всі логи
docker-compose logs

# Конкретний сервіс
docker-compose logs api-gateway
docker-compose logs auth-service
docker-compose logs gpt-service

# Логи в реальному часі
docker-compose logs -f
```

#### Перевірка health checks

```bash
# Перевірка health check статусу
docker inspect api-gateway | grep -A 10 Health
docker inspect auth-service | grep -A 10 Health
docker inspect gpt-service | grep -A 10 Health
```

### 8. Тестування після деплою на сервер

#### Перевірка доступності

```bash
# Замініть your-domain.com на ваш домен
curl https://your-domain.com/health
```

#### Перевірка через HTTPS

```bash
# Перевірка SSL сертифікату
curl -v https://your-domain.com/health

# Перевірка без попереджень
curl https://your-domain.com/health
```

### 9. Автоматичне тестування (якщо додано тести)

```bash
# Запуск тестів (якщо вони є)
npm test

# Або для конкретного сервісу
cd services/auth-service && npm test
cd ../gpt-service && npm test
```

### 10. Моніторинг під час тестування

В окремому терміналі спостерігайте за логами:

```bash
docker-compose logs -f
```

Або за ресурсами:

```bash
docker stats
```

## Чеклист тестування

- [ ] Health checks працюють для всіх сервісів
- [ ] Авторизація працює з валідним Firebase токеном
- [ ] Авторизація відхиляє невалідний Firebase токен
- [ ] Обробка Mermaid працює з валідним JWT токеном
- [ ] Обробка Mermaid відхиляє запити без токену
- [ ] Обробка Mermaid відхиляє запити з невалідним токеном
- [ ] Валідація працює для всіх endpoints
- [ ] Rate limiting працює
- [ ] Обробка помилок працює коректно
- [ ] CORS налаштований правильно
- [ ] HTTPS працює (на сервері)
- [ ] Health checks Docker працюють
- [ ] Graceful shutdown працює
- [ ] Логування працює коректно

## Troubleshooting

### Сервіси не запускаються

```bash
# Перевірте логи
docker-compose logs

# Перевірте конфігурацію
docker-compose config

# Перевірте змінні оточення
docker-compose exec api-gateway env | grep -E "(JWT|FIREBASE|OPENAI)"
```

### Помилки з'єднання між сервісами

```bash
# Перевірте мережу
docker network inspect pteroservise-network

# Перевірте чи сервіси доступні один одному
docker-compose exec api-gateway ping auth-service
docker-compose exec api-gateway ping gpt-service
```

### Проблеми з пам'яттю

```bash
# Перевірте використання ресурсів
docker stats

# Якщо не вистачає пам'яті, зменшіть обмеження в docker-compose.yml
```
