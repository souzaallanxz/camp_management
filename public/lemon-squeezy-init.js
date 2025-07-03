// Lemon Squeezy initialization script
window.addEventListener('load', function() {
  console.log('Lemon Squeezy initialization script loaded');
  
  // Verificar se o Lemon Squeezy foi carregado
  if (window.LemonSqueezy) {
    console.log('Lemon Squeezy loaded successfully:', window.LemonSqueezy);
    
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
  } else {
    console.warn('Lemon Squeezy not loaded');
  }
});

// Função global para criar checkout
window.createLemonSqueezy = function() {
  console.log('createLemonSqueezy function called');
  if (window.LemonSqueezy && window.LemonSqueezy.Setup) {
    console.log('Lemon Squeezy Setup is available');
  }
}; 