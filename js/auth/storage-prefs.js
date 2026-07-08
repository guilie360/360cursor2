/* Auth UI preferences — Remember me + saved email */
var AuthStoragePrefs = (function () {
  var REMEMBER_KEY = '360preventa_remember_me';
  var LOGIN_KEY = '360preventa_visitor_login';
  var EMAIL_KEY = '360preventa_visitor_email';

  function getRememberMe() {
    try {
      return localStorage.getItem(REMEMBER_KEY) !== 'false';
    } catch (e) {
      return true;
    }
  }

  function setRememberMe(enabled) {
    try {
      localStorage.setItem(REMEMBER_KEY, enabled ? 'true' : 'false');
    } catch (e) {}
  }

  function getSavedLogin() {
    try {
      return localStorage.getItem(LOGIN_KEY) || localStorage.getItem(EMAIL_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setSavedLogin(value) {
    try {
      var loginValue = String(value || '').trim();
      if (loginValue) {
        localStorage.setItem(LOGIN_KEY, loginValue);
      } else {
        localStorage.removeItem(LOGIN_KEY);
      }
    } catch (e) {}
  }

  function clearSavedLogin() {
    try {
      localStorage.removeItem(LOGIN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch (e) {}
  }

  function getSavedEmail() {
    return getSavedLogin();
  }

  function setSavedEmail(email) {
    setSavedLogin(email);
  }

  function clearSavedEmail() {
    clearSavedLogin();
  }

  return {
    getRememberMe: getRememberMe,
    setRememberMe: setRememberMe,
    getSavedLogin: getSavedLogin,
    setSavedLogin: setSavedLogin,
    clearSavedLogin: clearSavedLogin,
    getSavedEmail: getSavedEmail,
    setSavedEmail: setSavedEmail,
    clearSavedEmail: clearSavedEmail
  };
})();
