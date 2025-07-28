// Lemon Squeezy initialization script
window.addEventListener('load', function() {
  
  // Try to load Lemon Squeezy if not already loaded
  if (!window.LemonSqueezy && window.loadLemonSqueezy) {
    window.loadLemonSqueezy()
      .then(() => {
        initializeLemonSqueezy();
      })
      .catch((error) => {
        console.error('Failed to load Lemon Squeezy:', error);
      });
  } else if (window.LemonSqueezy) {
    initializeLemonSqueezy();
  } else {
    console.warn('Lemon Squeezy not loaded and loadLemonSqueezy not available');
  }
});

function initializeLemonSqueezy() {
  // Inicializar para frameworks modernos
  if (typeof window.createLemonSqueezy === 'function') {
    window.createLemonSqueezy();
  }
  
  // Verificar métodos disponíveis
}

// Função global para criar checkout
window.createLemonSqueezy = function() {
  if (window.LemonSqueezy && window.LemonSqueezy.Setup) {
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