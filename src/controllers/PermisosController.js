// src/controllers/PermisosController.js - Versión completa actualizada con Brigadas
import { db } from '../models/firebase';
// ✅ CORRECTO:
import { collection, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Clase para gestionar los permisos por rol en la aplicación
 */
export class PermisosController {
  /**
   * Obtiene los permisos de acceso a módulos según el rol del usuario
   * @param {string} rol - Identificador del rol
   * @returns {Array} - Lista de módulos a los que tiene acceso
   */
  static obtenerPermisosModulos(rol) {
    // Definición de los permisos por rol
    const permisosRol = {
      'jefe_ayuntatel': [
        'users', 
        'admin_users', 
        'admin_permisos'
      ], // Acceso completo
      'jefe_departamento': [
        'analytics', 
        'dashboard_jefe', 
        'admin_permisos', 
        'admin_brigadas'
      ], // Acceso a módulos de supervisión + permisos + brigadas (SOLO BRIGADAS PARA JEFE_DEPARTAMENTO)
      'basura': [
        'dashboard'
      ], // Solo panel de reportes específico
      'alumbrado': [
        'dashboard'
      ], // Solo panel de reportes específico
      'drenaje': [
        'dashboard'
      ], // Solo panel de reportes específico
      'bacheo': [
        'dashboard'
      ], // Solo panel de reportes específico
      'capturista': [
        'reports', 
        'admin_reports'
      ], // Reportes y gestión de reportes
      'auditor': [
        'dashboard', 
        'analytics', 
        'admin_reports'
      ], // Panel, estadísticas y gestión
    };
    
    // Si el rol no está definido, devolver acceso mínimo
    if (!rol || !permisosRol[rol]) {
      return ['dashboard'];
    }
    
    return permisosRol[rol];
  }
  
  /**
   * Verifica si un usuario tiene permiso para acceder a un módulo específico
   * @param {string} rol - Rol del usuario
   * @param {string} modulo - Identificador del módulo
   * @returns {boolean} - true si tiene permiso, false en caso contrario
   */
  static tienePermisoModulo(rol, modulo) {
    const permisosUsuario = this.obtenerPermisosModulos(rol);
    return permisosUsuario.includes(modulo);
  }
  
  /**
   * Obtiene el primer módulo al que tiene acceso un usuario según su rol
   * Útil para redireccionar cuando no tiene acceso al módulo solicitado
   * @param {string} rol - Rol del usuario
   * @returns {string} - Identificador del primer módulo con acceso
   */
  static obtenerModuloInicial(rol) {
    const permisosUsuario = this.obtenerPermisosModulos(rol);
    
    // Para jefes de departamento, iniciar siempre en el dashboard específico de jefe
    if (rol === 'jefe_departamento' && permisosUsuario.includes('dashboard_jefe')) {
      return 'dashboard_jefe';
    }
    
    return permisosUsuario[0] || 'dashboard';
  }
  
  /**
   * Obtiene el nombre legible de un rol
   * @param {string} rolId - Identificador del rol
   * @returns {string} - Nombre legible del rol
   */
  static obtenerNombreRol(rolId) {
    const roles = {
      'jefe_ayuntatel': 'Jefe de Ayuntatel',
      'jefe_departamento': 'Jefe de Departamento',
      'basura': 'Dep. Basura Acumulada',
      'alumbrado': 'Dep. Alumbrado Público',
      'drenaje': 'Dep. Drenaje Obstruido',
      'bacheo': 'Dep. Bacheo',
      'capturista': 'Capturista',
      'auditor': 'Auditor',
      'admin': 'Administrador'
    };
    
    return roles[rolId] || 'Usuario';
  }

  /**
   * Obtiene los permisos personalizados de un usuario específico
   * Si no tiene permisos personalizados, devuelve los permisos de su rol
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Permisos del usuario
   */
  static async obtenerPermisosUsuario(usuarioId) {
    try {
      if (!usuarioId) {
        console.log("ID de usuario no proporcionado");
        return {
          success: false,
          error: "ID de usuario no proporcionado",
          data: [] // Devolvemos un array vacío para evitar errores
        };
      }
      
      // Primero buscamos si el usuario tiene permisos personalizados
      const permisosRef = doc(db, "permisos_usuarios", usuarioId);
      const docSnapshot = await getDoc(permisosRef);
      
      if (docSnapshot.exists()) {
        // El usuario tiene permisos personalizados
        const data = docSnapshot.data();
        return {
          success: true,
          data: data.modulos || [],
          personalizado: true
        };
      } else {
        // El usuario no tiene permisos personalizados, usamos los de su rol
        // Primero obtenemos el rol del usuario
        try {
          const usuarioRef = doc(db, "usuarioWeb", usuarioId);
          const usuarioSnapshot = await getDoc(usuarioRef);
          
          if (usuarioSnapshot.exists()) {
            const userData = usuarioSnapshot.data();
            const permisosRol = this.obtenerPermisosModulos(userData.rol);
            
            return {
              success: true,
              data: permisosRol,
              personalizado: false
            };
          } else {
            console.log("Usuario no encontrado, usando permisos por defecto");
            // Si no encontramos al usuario, usamos el rol almacenado en localStorage
            const rolLocalStorage = localStorage.getItem('userRole') || 'capturista';
            const permisosRol = this.obtenerPermisosModulos(rolLocalStorage);
            
            return {
              success: true,
              data: permisosRol,
              personalizado: false,
              fallback: true
            };
          }
        } catch (error) {
          console.error("Error al obtener usuario por ID:", error);
          // Si hay algún error, devolvemos los permisos básicos según el rol en localStorage
          const rolLocalStorage = localStorage.getItem('userRole') || 'capturista';
          const permisosRol = this.obtenerPermisosModulos(rolLocalStorage);
          
          return {
            success: true,
            data: permisosRol,
            personalizado: false,
            fallback: true
          };
        }
      }
    } catch (error) {
      console.error("Error al obtener permisos del usuario:", error);
      // Si hay algún error, devolvemos los permisos básicos según el rol en localStorage
      const rolLocalStorage = localStorage.getItem('userRole') || 'capturista';
      const permisosRol = this.obtenerPermisosModulos(rolLocalStorage);
      
      return {
        success: true,
        data: permisosRol,
        personalizado: false,
        fallback: true
      };
    }
  }

  /**
   * Guarda los permisos personalizados de un usuario
   * @param {string} usuarioId - ID del usuario
   * @param {Array} modulos - Arreglo de módulos permitidos
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async guardarPermisosUsuario(usuarioId, modulos) {
    try {
      // Verificar que el usuario exista
      const usuarioRef = doc(db, "usuarioWeb", usuarioId);
      const usuarioSnapshot = await getDoc(usuarioRef);
      
      if (!usuarioSnapshot.exists()) {
        return {
          success: false,
          error: "El usuario no existe"
        };
      }
      
      // Guardar los permisos personalizados
      const permisosRef = doc(db, "permisos_usuarios", usuarioId);
      await setDoc(permisosRef, {
        modulos: modulos,
        usuarioId: usuarioId,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Actualizar el campo de permisos personalizados en el usuario
      await setDoc(usuarioRef, { 
        tienePermisosPersonalizados: true 
      }, { merge: true });
      
      return {
        success: true,
        message: "Permisos guardados correctamente"
      };
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      return {
        success: false,
        error: "Error al guardar los permisos del usuario"
      };
    }
  }

  /**
   * Elimina los permisos personalizados de un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async eliminarPermisosPersonalizados(usuarioId) {
    try {
      // Verificar que el usuario exista
      const usuarioRef = doc(db, "usuarioWeb", usuarioId);
      const usuarioSnapshot = await getDoc(usuarioRef);
      
      if (!usuarioSnapshot.exists()) {
        return {
          success: false,
          error: "El usuario no existe"
        };
      }
      
      // Eliminar el documento de permisos personalizados
      const permisosRef = doc(db, "permisos_usuarios", usuarioId);
      await deleteDoc(permisosRef);
      
      // Actualizar el campo de permisos personalizados en el usuario
      await setDoc(usuarioRef, { 
        tienePermisosPersonalizados: false 
      }, { merge: true });
      
      return {
        success: true,
        message: "Permisos personalizados eliminados correctamente"
      };
    } catch (error) {
      console.error("Error al eliminar permisos:", error);
      return {
        success: false,
        error: "Error al eliminar los permisos personalizados"
      };
    }
  }

  /**
   * Verifica si un usuario tiene acceso a un módulo específico
   * Primero busca permisos personalizados, si no encuentra usa los del rol
   * @param {string} usuarioId - ID del usuario
   * @param {string} modulo - Identificador del módulo
   * @returns {Promise<boolean>} - true si tiene permiso, false en caso contrario
   */
  static async verificarAccesoUsuario(usuarioId, modulo) {
    try {
      const permisos = await this.obtenerPermisosUsuario(usuarioId);
      
      if (permisos.success) {
        return permisos.data.includes(modulo);
      }
      
      return false;
    } catch (error) {
      console.error("Error al verificar acceso:", error);
      return false;
    }
  }

  /**
   * Obtiene todos los módulos disponibles en el sistema con sus descripciones
   * @returns {Array} - Lista de módulos con sus metadatos
   */
  static obtenerTodosLosModulos() {
    return [
      { 
        id: 'dashboard', 
        nombre: 'Panel Administrativo', 
        descripcion: 'Vista general del sistema y reportes por departamento',
        categoria: 'Principal'
      },
      { 
        id: 'dashboard_jefe', 
        nombre: 'Dashboard Departamentos', 
        descripcion: 'Vista avanzada para jefes de departamento',
        categoria: 'Supervisión'
      },
      { 
        id: 'users', 
        nombre: 'Registrar Usuario', 
        descripcion: 'Permite registrar nuevos usuarios en el sistema',
        categoria: 'Administración'
      },
      { 
        id: 'reports', 
        nombre: 'Registrar Reporte', 
        descripcion: 'Creación de nuevos reportes de incidencias',
        categoria: 'Reportes'
      },
      { 
        id: 'admin_reports', 
        nombre: 'Gestión de Reportes', 
        descripcion: 'Administración y edición de reportes existentes',
        categoria: 'Administración'
      },
      { 
        id: 'analytics', 
        nombre: 'Estadísticas', 
        descripcion: 'Visualización de estadísticas y gráficos del sistema',
        categoria: 'Análisis'
      },
      { 
        id: 'admin_users', 
        nombre: 'Admin. Usuarios', 
        descripcion: 'Administración avanzada de usuarios existentes',
        categoria: 'Administración'
      },
      { 
        id: 'admin_permisos', 
        nombre: 'Gestión de Permisos', 
        descripcion: 'Configuración de permisos y roles de usuarios',
        categoria: 'Administración'
      },
      { 
        id: 'admin_brigadas', 
        nombre: 'Gestión de Brigadas', 
        descripcion: 'Creación y administración de brigadas de trabajo',
        categoria: 'Administración'
      }
    ];
  }

  /**
   * Obtiene los módulos disponibles agrupados por categoría
   * @returns {Object} - Objeto con módulos agrupados por categoría
   */
  static obtenerModulosPorCategoria() {
    const modulos = this.obtenerTodosLosModulos();
    const agrupados = {};
    
    modulos.forEach(modulo => {
      if (!agrupados[modulo.categoria]) {
        agrupados[modulo.categoria] = [];
      }
      agrupados[modulo.categoria].push(modulo);
    });
    
    return agrupados;
  }

  /**
   * Verifica si un rol tiene permisos para gestionar brigadas
   * @param {string} rol - Rol del usuario
   * @returns {boolean} - true si puede gestionar brigadas
   */
  static puedeGestionarBrigadas(rol) {
    // SOLO el jefe de departamento puede gestionar brigadas
    return rol === 'jefe_departamento';
  }

  /**
   * Verifica si un rol puede asignar reportes a brigadas
   * @param {string} rol - Rol del usuario
   * @returns {boolean} - true si puede asignar reportes
   */
  static puedeAsignarReportes(rol) {
    const rolesConAcceso = ['jefe_ayuntatel', 'jefe_departamento', 'auditor'];
    return rolesConAcceso.includes(rol);
  }
}

export default PermisosController;