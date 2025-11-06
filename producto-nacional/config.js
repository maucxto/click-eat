// Configuración del Sistema Click&EAT
// Detecta automáticamente si está en desarrollo local o producción

const config = {
  // Detectar si estamos en local o producción
  isLocal: window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '',

  // URLs base
  get baseURL() {
    if (this.isLocal) {
      // En local, usar rutas relativas
      return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '') + '/producto-nacional/menu.html';
    } else {
      // En producción (GitHub Pages), usar URL absoluta confiable
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;

      // Detectar si estamos en un subdirectorio (como GitHub Pages)
      if (pathname.includes('/click-eat/')) {
        return `${window.location.origin}/click-eat/producto-nacional/menu.html`;
      } else if (pathname.includes('/maucxto/')) {
        return `${window.location.origin}/maucxto/click-eat/producto-nacional/menu.html`;
      } else {
        // Fallback: asumir que estamos en el directorio correcto
        return `${window.location.origin}${pathname.replace(/\/[^\/]*$/, '')}/producto-nacional/menu.html`;
      }
    }
  },

  // URL para QR codes
  get qrBaseURL() {
    return this.baseURL;
  },

  // Nombre del dominio para display
  get domainName() {
    if (this.isLocal) {
      return 'localhost';
    } else {
      return window.location.hostname;
    }
  },

  // Configuración de mesas
  totalTables: 20,

  // Configuración de API (simulada)
  api: {
    baseURL: '/api',
    timeout: 200
  }
};

// Exportar configuración
window.ClickEatConfig = config;
export default config;
