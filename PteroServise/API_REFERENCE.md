# MineAI API Reference

## Базова URL
```
http://localhost:3000/api
```

---

## 🔐 Авторизація (Auth Service)

### POST `/auth/login`
Авторизація через Firebase token.

**Request:**
```json
{
  "firebaseToken": "string (Firebase ID token)",
  "deviceInfo": "string (optional, e.g. 'Windows 10, MineAI v1.0')"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://..."
  }
}
```

---

### POST `/auth/register`
Реєстрація нового користувача (Firebase вже створив юзера).

**Request:** Аналогічно `/auth/login`

**Response (200):** Аналогічно `/auth/login` + `"message": "User registered successfully"`

---

### POST `/auth/refresh`
Оновлення токенів через refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "deviceInfo": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000
}
```

**Errors:**
- `401` - Refresh token expired (`code: REFRESH_TOKEN_EXPIRED`)
- `401` - Invalid refresh token

---

### GET `/auth/verify`
Перевірка валідності access token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "userId": "user-id",
    "email": "user@example.com",
    "firebaseUid": "firebase-uid"
  }
}
```

**Response (token invalid):**
```json
{
  "success": true,
  "valid": false,
  "error": "Token expired"
}
```

---

### GET `/auth/me`
Отримання профілю поточного користувача.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "emailVerified": true,
    "disabled": false,
    "metadata": {
      "creationTime": "2024-01-01T00:00:00.000Z",
      "lastSignInTime": "2024-12-11T12:00:00.000Z"
    }
  }
}
```

---

### POST `/auth/logout`
Вихід з системи (інвалідація токенів).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refreshToken": "string (optional)",
  "logoutAll": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "revokedCount": 2
}
```

---

### GET `/auth/sessions`
Отримання списку активних сесій.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "abc12345...",
      "createdAt": "2024-12-11T10:00:00.000Z",
      "expiresAt": "2025-01-10T10:00:00.000Z",
      "deviceInfo": "Windows 10, MineAI v1.0"
    }
  ],
  "count": 1
}
```

---

## 🤖 GPT Service

### POST `/gpt/process`
Обробка Mermaid діаграми через GPT.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "mermaid": "graph TD\n  A[Start] --> B[End]",
  "text": "string (optional, additional instructions)"
}
```

**Response (200):**
```json
{
  "success": true,
  "code": "graph TD\n  A[Optimized Start] --> B[Optimized End]",
  "tokensUsed": 150,
  "tokensRemaining": 9850,
  "requestsRemaining": 99
}
```

**Errors:**
- `401` - Token expired (`code: TOKEN_EXPIRED`)
- `403` - Insufficient tokens (`code: INSUFFICIENT_TOKENS`)
- `429` - Rate limit exceeded (`code: RATE_LIMIT`)

---

### GET `/gpt/balance`
Отримання балансу токенів користувача.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "balance": {
    "tokensRemaining": 9850,
    "tokensUsed": 150,
    "requestsRemaining": 99,
    "requestsUsed": 1,
    "plan": "free",
    "planExpiresAt": null
  }
}
```

---

## 🏥 Health Checks

### GET `/health`
API Gateway health check.

**Response (200):**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "services": {
    "auth": "http://auth-service:3001",
    "gpt": "http://gpt-service:3002"
  }
}
```

---

## 📱 Використання в Desktop додатку

### Приклад авторизації (C#)
```csharp
// 1. Отримуємо Firebase token від Google Sign-In
var firebaseToken = await GetFirebaseToken();

// 2. Логінимось та отримуємо наші токени
var response = await httpClient.PostAsJsonAsync("/api/auth/login", new {
    firebaseToken = firebaseToken,
    deviceInfo = "Windows 10, MineAI Desktop v1.0"
});

var result = await response.Content.ReadFromJsonAsync<LoginResponse>();

// 3. Зберігаємо токени
Settings.AccessToken = result.accessToken;
Settings.RefreshToken = result.refreshToken;
Settings.TokenExpiresAt = DateTime.Now.AddSeconds(result.expiresIn);
```

### Приклад оновлення токена
```csharp
// Перевіряємо чи токен скоро закінчиться (за 5 хвилин)
if (Settings.TokenExpiresAt < DateTime.Now.AddMinutes(5))
{
    var response = await httpClient.PostAsJsonAsync("/api/auth/refresh", new {
        refreshToken = Settings.RefreshToken
    });
    
    if (response.IsSuccessStatusCode)
    {
        var result = await response.Content.ReadFromJsonAsync<RefreshResponse>();
        Settings.AccessToken = result.accessToken;
        Settings.RefreshToken = result.refreshToken;
        Settings.TokenExpiresAt = DateTime.Now.AddSeconds(result.expiresIn);
    }
    else
    {
        // Refresh token прострочений - потрібна повна переавторизація
        await PromptUserToLogin();
    }
}
```

### Приклад запиту до GPT
```csharp
httpClient.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", Settings.AccessToken);

var response = await httpClient.PostAsJsonAsync("/api/gpt/process", new {
    mermaid = "graph TD\n  A --> B",
    text = "Optimize this diagram"
});

if (response.StatusCode == HttpStatusCode.Unauthorized)
{
    // Токен прострочений - оновлюємо та повторюємо
    await RefreshToken();
    // Retry request...
}
```

---

## 🔒 Коди помилок

| Code | HTTP Status | Опис |
|------|-------------|------|
| `TOKEN_MISSING` | 401 | Токен не надано |
| `TOKEN_EXPIRED` | 401 | Токен прострочений |
| `TOKEN_INVALID` | 403 | Невалідний токен |
| `TOKEN_REVOKED` | 401 | Токен було відкликано |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token прострочений |
| `INSUFFICIENT_TOKENS` | 403 | Недостатньо токенів |
| `RATE_LIMIT` | 429 | Перевищено ліміт запитів |
| `VALIDATION_ERROR` | 400 | Помилка валідації даних |
| `NOT_AUTHENTICATED` | 401 | Користувач не автентифікований |

---

## 📊 Плани підписок

| План | Токени | Запити | Ціна |
|------|--------|--------|------|
| Free | 10,000 | 100 | $0 |
| Basic | 50,000 | 500 | TBD |
| Pro | 200,000 | 2,000 | TBD |
| Enterprise | 1,000,000 | 10,000 | TBD |

