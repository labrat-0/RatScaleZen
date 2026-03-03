// Detect Safari and add class to HTML
(function detectBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1) {
    document.documentElement.classList.add('is-safari');
  }
  
  // Detect mobile devices
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-mobile');
  }
})();
