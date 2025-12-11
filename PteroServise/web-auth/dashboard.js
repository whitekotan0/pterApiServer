// ==========================================
// MineAI Dashboard — Application Logic
// ==========================================

class MineAIDashboard {
  constructor() {
    this.tokens = this.loadTokens();
    this.user = null;
    
    this.initElements();
    this.initEventListeners();
    this.checkAuth();
  }
  
  // ==========================================
  // Initialization
  // ==========================================
  
  initElements() {
    // User info
    this.userAvatar = document.getElementById('user-avatar');
    this.avatarLetter = document.getElementById('avatar-letter');
    this.userName = document.getElementById('user-name');
    this.userEmail = document.getElementById('user-email');
    this.userPlan = document.getElementById('user-plan');
    
    // Stats
    this.tokensRemaining = document.getElementById('tokens-remaining');
    this.tokensProgress = document.getElementById('tokens-progress');
    this.requestsRemaining = document.getElementById('requests-remaining');
    this.requestsProgress = document.getElementById('requests-progress');
    
    // Token display
    this.accessTokenEl = document.getElementById('access-token');
    this.tokenExpires = document.getElementById('token-expires');
    
    // Buttons
    this.logoutBtn = document.getElementById('logout-btn');
    this.logoutAllBtn = document.getElementById('logout-all-btn');
    this.copyTokenBtn = document.getElementById('copy-token-btn');
    this.refreshTokenBtn = document.getElementById('refresh-token-btn');
    
    // Sessions
    this.sessionsList = document.getElementById('sessions-list');
    
    // UI
    this.loading = document.getElementById('loading');
  }
  
  initEventListeners() {
    this.logoutBtn.addEventListener('click', () => this.logout());
    this.logoutAllBtn.addEventListener('click', () => this.logoutAll());
    this.copyTokenBtn.addEventListener('click', () => this.copyToken());
    this.refreshTokenBtn.addEventListener('click', () => this.refreshToken());
  }
  
  // ==========================================
  // Auth
  // ==========================================
  
  async checkAuth() {
    // Check if we have tokens
    if (!this.tokens?.accessToken) {
      this.redirectToLogin();
      return;
    }
    
    this.showLoading();
    
    try {
      // Verify token and get user info
      const isValid = await this.verifyToken();
      
      if (!isValid) {
        // Try to refresh
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          this.redirectToLogin();
          return;
        }
      }
      
      // Load user data
      await this.loadUserData();
      await this.loadBalance();
      await this.loadSessions();
      
      this.hideLoading();
      
    } catch (error) {
      console.error('Auth check failed:', error);
      this.hideLoading();
      this.redirectToLogin();
    }
  }
  
  async verifyToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      });
      
      const data = await response.json();
      return data.success && data.valid;
      
    } catch {
      return false;
    }
  }
  
  async loadUserData() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.user = data.user;
        this.updateUserUI();
      }
      
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }
  
  async loadBalance() {
    try {
      const response = await fetch(`${API_BASE_URL}/gpt/balance`, {
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateBalanceUI(data.balance);
      }
      
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }
  
  async loadSessions() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateSessionsUI(data.sessions);
      }
      
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }
  
  async refreshToken() {
    if (!this.tokens?.refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.tokens.refreshToken,
          deviceInfo: this.getDeviceInfo()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.tokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn
        };
        this.saveTokens();
        this.updateTokenUI();
        return true;
      }
      
      return false;
      
    } catch {
      return false;
    }
  }
  
  async logout() {
    this.showLoading();
    
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.tokens.refreshToken
        })
      });
    } catch {
      // Ignore errors, logout anyway
    }
    
    // Sign out from Firebase
    await auth.signOut();
    
    // Clear tokens
    this.clearTokens();
    
    // Redirect
    this.redirectToLogin();
  }
  
  async logoutAll() {
    if (!confirm('Ви впевнені, що хочете вийти з усіх пристроїв?')) {
      return;
    }
    
    this.showLoading();
    
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logoutAll: true
        })
      });
    } catch {
      // Ignore errors
    }
    
    await auth.signOut();
    this.clearTokens();
    this.redirectToLogin();
  }
  
  // ==========================================
  // UI Updates
  // ==========================================
  
  updateUserUI() {
    if (!this.user) return;
    
    // Name
    const displayName = this.user.displayName || this.user.email?.split('@')[0] || 'Користувач';
    this.userName.textContent = displayName;
    this.userEmail.textContent = this.user.email;
    
    // Avatar
    if (this.user.photoURL) {
      this.userAvatar.innerHTML = `<img src="${this.user.photoURL}" alt="${displayName}">`;
    } else {
      this.avatarLetter.textContent = displayName.charAt(0).toUpperCase();
    }
    
    // Token display
    this.updateTokenUI();
  }
  
  updateTokenUI() {
    if (!this.tokens?.accessToken) return;
    
    // Show truncated token
    const token = this.tokens.accessToken;
    const truncated = token.substring(0, 50) + '...' + token.substring(token.length - 20);
    this.accessTokenEl.textContent = truncated;
    
    // Calculate expiry
    if (this.tokens.expiresIn) {
      const expiresAt = new Date(Date.now() + this.tokens.expiresIn * 1000);
      this.tokenExpires.textContent = this.formatDate(expiresAt);
    }
  }
  
  updateBalanceUI(balance) {
    // Tokens
    this.tokensRemaining.textContent = this.formatNumber(balance.tokensRemaining);
    const tokensPercent = Math.min(100, (balance.tokensRemaining / this.getPlanLimit(balance.plan, 'tokens')) * 100);
    this.tokensProgress.style.width = `${tokensPercent}%`;
    
    // Requests
    this.requestsRemaining.textContent = this.formatNumber(balance.requestsRemaining);
    const requestsPercent = Math.min(100, (balance.requestsRemaining / this.getPlanLimit(balance.plan, 'requests')) * 100);
    this.requestsProgress.style.width = `${requestsPercent}%`;
    
    // Plan
    this.userPlan.textContent = balance.plan.toUpperCase();
  }
  
  updateSessionsUI(sessions) {
    if (!sessions || sessions.length === 0) {
      return;
    }
    
    // Keep current session indicator, add others
    const currentSession = this.sessionsList.querySelector('.session-item.current');
    
    if (currentSession) {
      const sessionDate = currentSession.querySelector('.session-date');
      sessionDate.textContent = 'Активна зараз';
    }
    
    // Add other sessions
    sessions.slice(1).forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-item';
      sessionEl.innerHTML = `
        <div class="session-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <path d="M12 18h.01"/>
          </svg>
        </div>
        <div class="session-info">
          <span class="session-device">${session.deviceInfo || 'Невідомий пристрій'}</span>
          <span class="session-date">Створено: ${this.formatDate(new Date(session.createdAt))}</span>
        </div>
      `;
      this.sessionsList.appendChild(sessionEl);
    });
  }
  
  // ==========================================
  // Actions
  // ==========================================
  
  async copyToken() {
    if (!this.tokens?.accessToken) return;
    
    try {
      await navigator.clipboard.writeText(this.tokens.accessToken);
      
      // Visual feedback
      const icon = this.copyTokenBtn.querySelector('svg');
      icon.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
      
      setTimeout(() => {
        icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>';
      }, 2000);
      
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }
  
  // ==========================================
  // Token Storage
  // ==========================================
  
  loadTokens() {
    try {
      const stored = localStorage.getItem('mineai_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  saveTokens() {
    try {
      localStorage.setItem('mineai_tokens', JSON.stringify(this.tokens));
    } catch (err) {
      console.error('Failed to save tokens:', err);
    }
  }
  
  clearTokens() {
    localStorage.removeItem('mineai_tokens');
    this.tokens = null;
  }
  
  // ==========================================
  // Helpers
  // ==========================================
  
  showLoading() {
    this.loading.classList.remove('hidden');
  }
  
  hideLoading() {
    this.loading.classList.add('hidden');
  }
  
  redirectToLogin() {
    window.location.href = 'index.html';
  }
  
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
  
  formatDate(date) {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  getPlanLimit(plan, type) {
    const limits = {
      free: { tokens: 10000, requests: 100 },
      basic: { tokens: 50000, requests: 500 },
      pro: { tokens: 200000, requests: 2000 },
      enterprise: { tokens: 1000000, requests: 10000 }
    };
    return limits[plan]?.[type] || limits.free[type];
  }
  
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let browser = 'Unknown';
    
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return `${os}, ${browser}, MineAI Web`;
  }
}

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  window.mineAIDashboard = new MineAIDashboard();
});

