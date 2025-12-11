// ==========================================
// MineAI Auth — Application Logic
// ==========================================

class MineAIAuth {
  constructor() {
    this.currentTab = 'login';
    this.tokens = null;
    
    this.initElements();
    this.initEventListeners();
    this.checkAuthState();
  }
  
  // ==========================================
  // Initialization
  // ==========================================
  
  initElements() {
    // Forms
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    
    // Tabs
    this.tabBtns = document.querySelectorAll('.tab-btn');
    
    // Inputs
    this.loginEmail = document.getElementById('login-email');
    this.loginPassword = document.getElementById('login-password');
    this.registerName = document.getElementById('register-name');
    this.registerEmail = document.getElementById('register-email');
    this.registerPassword = document.getElementById('register-password');
    this.registerConfirm = document.getElementById('register-confirm');
    
    // Buttons
    this.googleLoginBtn = document.getElementById('google-login');
    this.googleRegisterBtn = document.getElementById('google-register');
    this.copyTokenBtn = document.getElementById('copy-token');
    
    // UI Elements
    this.message = document.getElementById('message');
    this.loading = document.getElementById('loading');
    this.successModal = document.getElementById('success-modal');
    this.tokenInfo = document.getElementById('token-info');
    this.successMessage = document.getElementById('success-message');
    
    // Password toggles
    this.passwordToggles = document.querySelectorAll('.toggle-password');
  }
  
  initEventListeners() {
    // Tab switching
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Form submissions
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    
    // Google auth
    this.googleLoginBtn.addEventListener('click', () => this.handleGoogleAuth());
    this.googleRegisterBtn.addEventListener('click', () => this.handleGoogleAuth());
    
    // Copy token
    this.copyTokenBtn.addEventListener('click', () => this.copyToken());
    
    // Password toggles
    this.passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.togglePassword(e));
    });
    
    // Close modal on outside click
    this.successModal.addEventListener('click', (e) => {
      if (e.target === this.successModal) {
        this.hideModal();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.successModal.classList.contains('hidden')) {
        this.hideModal();
      }
    });
  }
  
  checkAuthState() {
    // Check if already have valid tokens
    const storedTokens = this.loadTokens();
    if (storedTokens?.accessToken) {
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
      return;
    }
    
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is signed in:', user.email);
      } else {
        console.log('User is signed out');
      }
    });
  }
  
  loadTokens() {
    try {
      const stored = localStorage.getItem('mineai_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  // ==========================================
  // UI Methods
  // ==========================================
  
  switchTab(tab) {
    this.currentTab = tab;
    
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    this.loginForm.classList.toggle('active', tab === 'login');
    this.registerForm.classList.toggle('active', tab === 'register');
    
    this.hideMessage();
  }
  
  showLoading() {
    this.loading.classList.remove('hidden');
  }
  
  hideLoading() {
    this.loading.classList.add('hidden');
  }
  
  showMessage(text, type = 'error') {
    this.message.textContent = text;
    this.message.className = `message ${type}`;
    this.message.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideMessage(), 5000);
  }
  
  hideMessage() {
    this.message.classList.add('hidden');
  }
  
  showSuccessModal(message, tokens) {
    this.tokens = tokens;
    this.saveTokens(tokens);
    this.successMessage.textContent = message;
    this.tokenInfo.textContent = tokens.accessToken;
    this.successModal.classList.remove('hidden');
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
  }
  
  saveTokens(tokens) {
    try {
      localStorage.setItem('mineai_tokens', JSON.stringify(tokens));
    } catch (err) {
      console.error('Failed to save tokens:', err);
    }
  }
  
  hideModal() {
    this.successModal.classList.add('hidden');
  }
  
  togglePassword(e) {
    const btn = e.currentTarget;
    const input = btn.parentElement.querySelector('input');
    
    if (input.type === 'password') {
      input.type = 'text';
      btn.style.opacity = '1';
    } else {
      input.type = 'password';
      btn.style.opacity = '0.5';
    }
  }
  
  async copyToken() {
    if (!this.tokens?.accessToken) return;
    
    try {
      await navigator.clipboard.writeText(this.tokens.accessToken);
      this.copyTokenBtn.querySelector('span').textContent = 'Скопійовано!';
      
      setTimeout(() => {
        this.copyTokenBtn.querySelector('span').textContent = 'Копіювати токен';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  // ==========================================
  // Auth Methods
  // ==========================================
  
  async handleLogin(e) {
    e.preventDefault();
    
    const email = this.loginEmail.value.trim();
    const password = this.loginPassword.value;
    
    if (!email || !password) {
      this.showMessage('Заповніть всі поля');
      return;
    }
    
    this.showLoading();
    this.hideMessage();
    
    try {
      // Firebase email/password sign in
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Get our JWT tokens from backend
      const tokens = await this.getBackendTokens(firebaseToken);
      
      this.hideLoading();
      this.showSuccessModal('Ви успішно увійшли в систему!', tokens);
      
    } catch (error) {
      this.hideLoading();
      this.showMessage(this.getErrorMessage(error));
    }
  }
  
  async handleRegister(e) {
    e.preventDefault();
    
    const name = this.registerName.value.trim();
    const email = this.registerEmail.value.trim();
    const password = this.registerPassword.value;
    const confirmPassword = this.registerConfirm.value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      this.showMessage('Заповніть всі поля');
      return;
    }
    
    if (password !== confirmPassword) {
      this.showMessage('Паролі не співпадають');
      return;
    }
    
    if (password.length < 8) {
      this.showMessage('Пароль має бути мінімум 8 символів');
      return;
    }
    
    this.showLoading();
    this.hideMessage();
    
    try {
      // Create Firebase user
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Update display name
      await userCredential.user.updateProfile({
        displayName: name
      });
      
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Register with our backend
      const tokens = await this.registerWithBackend(firebaseToken);
      
      this.hideLoading();
      this.showSuccessModal('Акаунт успішно створено!', tokens);
      
    } catch (error) {
      this.hideLoading();
      this.showMessage(this.getErrorMessage(error));
    }
  }
  
  async handleGoogleAuth() {
    this.showLoading();
    this.hideMessage();
    
    try {
      const result = await auth.signInWithPopup(googleProvider);
      const firebaseToken = await result.user.getIdToken();
      
      // Determine if this is login or register based on current tab
      const isNewUser = result.additionalUserInfo?.isNewUser;
      
      let tokens;
      if (isNewUser || this.currentTab === 'register') {
        tokens = await this.registerWithBackend(firebaseToken);
      } else {
        tokens = await this.getBackendTokens(firebaseToken);
      }
      
      this.hideLoading();
      this.showSuccessModal(
        isNewUser ? 'Акаунт успішно створено!' : 'Ви успішно увійшли!',
        tokens
      );
      
    } catch (error) {
      this.hideLoading();
      
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup, don't show error
        return;
      }
      
      this.showMessage(this.getErrorMessage(error));
    }
  }
  
  // ==========================================
  // API Methods
  // ==========================================
  
  async getBackendTokens(firebaseToken) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseToken,
        deviceInfo: this.getDeviceInfo()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Помилка авторизації');
    }
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: data.user
    };
  }
  
  async registerWithBackend(firebaseToken) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseToken,
        deviceInfo: this.getDeviceInfo()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Помилка реєстрації');
    }
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: data.user
    };
  }
  
  // ==========================================
  // Helper Methods
  // ==========================================
  
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let browser = 'Unknown';
    
    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';
    
    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return `${os}, ${browser}, MineAI Web Auth`;
  }
  
  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'Ця електронна пошта вже використовується',
      'auth/invalid-email': 'Невірний формат електронної пошти',
      'auth/operation-not-allowed': 'Операція не дозволена',
      'auth/weak-password': 'Пароль занадто простий',
      'auth/user-disabled': 'Акаунт заблоковано',
      'auth/user-not-found': 'Користувача не знайдено',
      'auth/wrong-password': 'Невірний пароль',
      'auth/invalid-credential': 'Невірні дані для входу',
      'auth/too-many-requests': 'Забагато спроб. Спробуйте пізніше',
      'auth/network-request-failed': 'Помилка мережі. Перевірте з\'єднання',
      'auth/popup-blocked': 'Браузер заблокував спливаюче вікно',
      'auth/cancelled-popup-request': 'Запит скасовано',
    };
    
    return errorMessages[error.code] || error.message || 'Сталася помилка';
  }
}

// ==========================================
// Initialize App
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  window.mineAIAuth = new MineAIAuth();
});

