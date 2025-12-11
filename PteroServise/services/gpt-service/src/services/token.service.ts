// Цей сервіс буде використовуватися для відстеження токенів користувачів
// В продакшені підключіть базу даних (PostgreSQL, MongoDB, etc.)

export interface UserTokens {
  userId: string;
  tokensRemaining: number;
  tokensUsed: number;
  requestsRemaining: number;
  requestsUsed: number;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  planExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenInfo {
  tokensRemaining: number;
  tokensUsed: number;
  requestsRemaining: number;
  requestsUsed: number;
  plan: string;
  planExpiresAt: Date | null;
}

// Плани та їх ліміти
const PLAN_LIMITS = {
  free: {
    tokens: 10000,
    requests: 100,
  },
  basic: {
    tokens: 50000,
    requests: 500,
  },
  pro: {
    tokens: 200000,
    requests: 2000,
  },
  enterprise: {
    tokens: 1000000,
    requests: 10000,
  },
};

// In-memory storage (в продакшені використовуйте БД!)
const userTokensStore = new Map<string, UserTokens>();

// Отримати або створити запис користувача
const getOrCreateUser = (userId: string): UserTokens => {
  let userData = userTokensStore.get(userId);
  
  if (!userData) {
    // Створюємо нового користувача з free планом
    const planLimits = PLAN_LIMITS.free;
    userData = {
      userId,
      tokensRemaining: planLimits.tokens,
      tokensUsed: 0,
      requestsRemaining: planLimits.requests,
      requestsUsed: 0,
      plan: 'free',
      planExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    userTokensStore.set(userId, userData);
  }
  
  return userData;
};

// Перевірка чи є у користувача токени
export const checkUserTokens = (userId: string): {
  hasTokens: boolean;
  tokensRemaining: number;
  requestsRemaining: number;
} => {
  const userData = getOrCreateUser(userId);
  
  // Перевіряємо чи план не прострочений
  if (userData.planExpiresAt && userData.planExpiresAt < new Date()) {
    // План прострочений - переводимо на free
    const freeLimits = PLAN_LIMITS.free;
    userData.plan = 'free';
    userData.planExpiresAt = null;
    // Обмежуємо токени до free ліміту якщо потрібно
    userData.tokensRemaining = Math.min(userData.tokensRemaining, freeLimits.tokens);
    userData.requestsRemaining = Math.min(userData.requestsRemaining, freeLimits.requests);
    userData.updatedAt = new Date();
    userTokensStore.set(userId, userData);
  }

  return {
    hasTokens: userData.tokensRemaining > 0 && userData.requestsRemaining > 0,
    tokensRemaining: userData.tokensRemaining,
    requestsRemaining: userData.requestsRemaining,
  };
};

// Списання токенів
export const deductTokens = (
  userId: string,
  tokensUsed: number,
  requestsUsed: number = 1
): void => {
  const userData = getOrCreateUser(userId);
  
  userData.tokensRemaining = Math.max(0, userData.tokensRemaining - tokensUsed);
  userData.tokensUsed += tokensUsed;
  userData.requestsRemaining = Math.max(0, userData.requestsRemaining - requestsUsed);
  userData.requestsUsed += requestsUsed;
  userData.updatedAt = new Date();
  
  userTokensStore.set(userId, userData);
};

// Додавання токенів (для поповнення балансу)
export const addTokens = (
  userId: string, 
  tokens: number, 
  requests: number = 0
): void => {
  const userData = getOrCreateUser(userId);
  
  userData.tokensRemaining += tokens;
  userData.requestsRemaining += requests;
  userData.updatedAt = new Date();
  
  userTokensStore.set(userId, userData);
};

// Оновлення плану користувача
export const updateUserPlan = (
  userId: string,
  plan: 'free' | 'basic' | 'pro' | 'enterprise',
  expiresAt: Date | null = null
): UserTokens => {
  const userData = getOrCreateUser(userId);
  const planLimits = PLAN_LIMITS[plan];
  
  // Якщо оновлюємо на вищий план - додаємо токени
  const currentPlanLimits = PLAN_LIMITS[userData.plan];
  const tokenDiff = planLimits.tokens - currentPlanLimits.tokens;
  const requestsDiff = planLimits.requests - currentPlanLimits.requests;
  
  if (tokenDiff > 0) {
    userData.tokensRemaining += tokenDiff;
  }
  if (requestsDiff > 0) {
    userData.requestsRemaining += requestsDiff;
  }
  
  userData.plan = plan;
  userData.planExpiresAt = expiresAt;
  userData.updatedAt = new Date();
  
  userTokensStore.set(userId, userData);
  return userData;
};

// Отримання повної інформації про токени користувача
export const getUserTokenInfo = (userId: string): TokenInfo => {
  const userData = getOrCreateUser(userId);
  
  return {
    tokensRemaining: userData.tokensRemaining,
    tokensUsed: userData.tokensUsed,
    requestsRemaining: userData.requestsRemaining,
    requestsUsed: userData.requestsUsed,
    plan: userData.plan,
    planExpiresAt: userData.planExpiresAt,
  };
};

// Скидання місячних лімітів (для cron job)
export const resetMonthlyLimits = (): number => {
  let count = 0;
  
  for (const [userId, userData] of userTokensStore.entries()) {
    const planLimits = PLAN_LIMITS[userData.plan];
    
    userData.tokensRemaining = planLimits.tokens;
    userData.requestsRemaining = planLimits.requests;
    userData.tokensUsed = 0;
    userData.requestsUsed = 0;
    userData.updatedAt = new Date();
    
    userTokensStore.set(userId, userData);
    count++;
  }
  
  return count;
};

// Отримання всіх користувачів (для адмін панелі)
export const getAllUsers = (): UserTokens[] => {
  return Array.from(userTokensStore.values());
};

// Видалення користувача
export const deleteUser = (userId: string): boolean => {
  return userTokensStore.delete(userId);
};

// Отримання статистики
export const getStats = (): {
  totalUsers: number;
  totalTokensUsed: number;
  totalRequestsMade: number;
  usersByPlan: Record<string, number>;
} => {
  const users = Array.from(userTokensStore.values());
  
  const usersByPlan: Record<string, number> = {
    free: 0,
    basic: 0,
    pro: 0,
    enterprise: 0,
  };
  
  let totalTokensUsed = 0;
  let totalRequestsMade = 0;
  
  for (const user of users) {
    usersByPlan[user.plan]++;
    totalTokensUsed += user.tokensUsed;
    totalRequestsMade += user.requestsUsed;
  }
  
  return {
    totalUsers: users.length,
    totalTokensUsed,
    totalRequestsMade,
    usersByPlan,
  };
};
