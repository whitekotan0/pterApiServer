// Цей сервіс буде використовуватися для відстеження токенів користувачів
// Поки що проста реалізація, можна підключити базу даних

interface UserTokens {
  userId: string;
  tokensRemaining: number;
  requestsRemaining: number;
}

// In-memory storage (в продакшені використовуйте БД)
const userTokensStore = new Map<string, UserTokens>();

export const checkUserTokens = (userId: string): {
  hasTokens: boolean;
  tokensRemaining: number;
  requestsRemaining: number;
} => {
  const userData = userTokensStore.get(userId);
  
  if (!userData) {
    // Якщо користувача немає, створюємо з дефолтними значеннями
    const defaultData: UserTokens = {
      userId,
      tokensRemaining: 10000, // Дефолтна кількість токенів
      requestsRemaining: 100, // Дефолтна кількість запитів
    };
    userTokensStore.set(userId, defaultData);
    return {
      hasTokens: true,
      tokensRemaining: defaultData.tokensRemaining,
      requestsRemaining: defaultData.requestsRemaining,
    };
  }

  return {
    hasTokens: userData.tokensRemaining > 0 && userData.requestsRemaining > 0,
    tokensRemaining: userData.tokensRemaining,
    requestsRemaining: userData.requestsRemaining,
  };
};

export const deductTokens = (
  userId: string,
  tokensUsed: number,
  requestsUsed: number = 1
): void => {
  const userData = userTokensStore.get(userId);
  
  if (userData) {
    userData.tokensRemaining = Math.max(0, userData.tokensRemaining - tokensUsed);
    userData.requestsRemaining = Math.max(0, userData.requestsRemaining - requestsUsed);
    userTokensStore.set(userId, userData);
  }
};

export const addTokens = (userId: string, tokens: number, requests: number = 0): void => {
  const userData = userTokensStore.get(userId);
  
  if (userData) {
    userData.tokensRemaining += tokens;
    userData.requestsRemaining += requests;
    userTokensStore.set(userId, userData);
  } else {
    userTokensStore.set(userId, {
      userId,
      tokensRemaining: tokens,
      requestsRemaining: requests,
    });
  }
};

