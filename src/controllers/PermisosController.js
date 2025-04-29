// src/controllers/PermisosController.js - Versión actualizada
import { db } from '../models/firebase';
import { collection, doc, getDoc, setDoc, deleteDoc } 
from 'firebase/firestore';

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
      'jefe_ayuntatel': ['users', 'admin_users', 'admin_permisos'], // Acceso completo
      'jefe_departamento': ['analytics', 'dashboard_jefe'], // Acceso a módulos de supervisión
      'basura': ['dashboard'], // Solo panel, reportes y gestión
      'alumbrado': ['dashboard'], // Solo panel, reportes y gestión
      'drenaje': ['dashboard'], // Solo panel, reportes y gestión
      'bacheo': ['dashboard'], // Solo panel, reportes y gestión
      'capturista': ['reports', 'admin_reports'], // Reportes y gestión de reportes
      'auditor': ['dashboard', 'analytics', 'admin_reports'], // Panel, estadísticas y gestión
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
}

export default PermisosController;