// Lemon Squeezy initialization script
window.addEventListener('load', function() {
  console.log('Lemon Squeezy initialization script loaded');
  
  // Try to load Lemon Squeezy if not already loaded
  if (!window.LemonSqueezy && window.loadLemonSqueezy) {
    console.log('Loading Lemon Squeezy dynamically...');
    window.loadLemonSqueezy()
      .then(() => {
        console.log('Lemon Squeezy loaded successfully:', window.LemonSqueezy);
        initializeLemonSqueezy();
      })
      .catch((error) => {
        console.error('Failed to load Lemon Squeezy:', error);
      });
  } else if (window.LemonSqueezy) {
    console.log('Lemon Squeezy already loaded:', window.LemonSqueezy);
    initializeLemonSqueezy();
  } else {
    console.warn('Lemon Squeezy not loaded and loadLemonSqueezy not available');
  }
});

function initializeLemonSqueezy() {
  // Inicializar para frameworks modernos
  if (typeof window.createLemonSqueezy === 'function') {
    console.log('Initializing Lemon Squeezy for modern frameworks...');
    window.createLemonSqueezy();
  }
  
  // Verificar métodos disponíveis
  console.log('Available Lemon Squeezy methods:', {
    Setup: window.LemonSqueezy.Setup,
    Url: window.LemonSqueezy.Url,
    open: window.LemonSqueezy.open
  });
}

// Função global para criar checkout
window.createLemonSqueezy = function() {
  console.log('createLemonSqueezy function called');
  if (window.LemonSqueezy && window.LemonSqueezy.Setup) {
    console.log('Lemon Squeezy Setup is available');
  }
};

// Função global para carregar Lemon Squeezy quando necessário
window.ensureLemonSqueezyLoaded = function() {
  return new Promise((resolve, reject) => {
    if (window.LemonSqueezy) {
      resolve(window.LemonSqueezy);
      return;
    }
    
    if (window.loadLemonSqueezy) {
      window.loadLemonSqueezy()
        .then(resolve)
        .catch(reject);
    } else {
      reject(new Error('Lemon Squeezy loader not available'));
    }
  });
}; 