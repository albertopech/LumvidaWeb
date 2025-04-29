// src/controllers/cerrarSession.js

/**
 * Cierra la sesión del usuario actual
 * @returns {Promise<{success: boolean, message?: string, error?: Error}>}
 */
export const cerrarSesion = async () => {
  try {
    // Limpiar datos de sesión en localStorage
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAuthenticated');
    
    return {
      success: true,
      message: 'Sesión cerrada correctamente'
    };
  } catch (error) {
    console.error("Error al cerrar la sesión:", error);
    return {
      success: false,
      error,
      message: 'Error al cerrar sesión: ' + error.message
    };
  }
};

/**
 * Cierra la sesión y limpia datos adicionales del usuario
 * @param {boolean} limpiarHistorial - Si se debe limpiar el historial del navegador
 * @returns {Promise<{success: boolean, message?: string, error?: Error}>}
 */
export const cerrarSesionCompleta = async (limpiarHistorial = false) => {
  try {
    // Limpiar datos de sesión
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAuthenticated');
    
    // Limpiar datos adicionales de la aplicación si es necesario
    localStorage.removeItem('lastVisitedPage');
    localStorage.removeItem('userPreferences');
    
    // Si se solicitó limpiar historial, hacerlo
    if (limpiarHistorial) {
      window.history.replaceState(null, '', '/login');
    }
    
    return {
      success: true,
      message: 'Sesión cerrada y datos limpiados correctamente'
    };
  } catch (error) {
    console.error("Error al cerrar sesión completamente:", error);
    return {
      success: false,
      error,
      message: 'Error al cerrar sesión completa: ' + error.message
    };
  }
};

/**
 * Verifica si hay una sesión activa
 * @returns {boolean}
 */
export const tieneSesionActiva = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

/**
 * Verifica si el usuario tiene permisos para acceder a un recurso específico
 * @param {string} recurso - El recurso o ruta que se quiere acceder
 * @returns {boolean}
 */
export const verificarPermisos = (recurso) => {
  const userRole = localStorage.getItem('userRole');
  
  // Mapa de recursos a roles permitidos
  const permisosRecursos = {
    'reportes': ['admin', 'operador'],
    'usuarios': ['admin'],
    'estadisticas': ['admin', 'analista'],
    'config': ['admin']
  };
  
  // Verificar si el recurso existe en el mapa de permisos
  if (permisosRecursos[recurso]) {
    // Verificar si el rol del usuario está en la lista de roles permitidos
    return permisosRecursos[recurso].includes(userRole);
  }
  
  // Si el recurso no existe en el mapa, denegar acceso por defecto
  return false;
};

/**
 * Obtiene información básica del usuario actualmente logueado
 * @returns {Object|null} - Datos del usuario o null si no hay sesión
 */
export const obtenerUsuarioActual = () => {
  if (!tieneSesionActiva()) {
    return null;
  }
  
  return {
    username: localStorage.getItem('username'),
    role: localStorage.getItem('userRole'),
    userId: localStorage.getItem('userId')
  };
};