// Lemon Squeezy initialization script
window.addEventListener('load', function() {
  // Verificar se o Lemon Squeezy foi carregado
  if (window.LemonSqueezy) {
    console.log('Lemon Squeezy loaded successfully');
    // Inicializar para frameworks modernos
    if (typeof window.createLemonSqueezy === 'function') {
      console.log('Initializing Lemon Squeezy for modern frameworks...');
      window.createLemonSqueezy();
    }
  } else {
    console.warn('Lemon Squeezy not loaded');
  }
}); 