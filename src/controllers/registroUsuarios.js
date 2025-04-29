// src/controllers/registroUsuarios.js
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../models/firebase";

/**
 * Clase Controlador para gestionar usuarios
 */
export class UsuarioController {
  /**
   * Obtiene todos los usuarios del sistema
   * @returns {Promise<Array>} Lista de usuarios
   */
  static async obtenerUsuarios() {
    try {
      const userRef = collection(db, 'usuarioWeb');
      const querySnapshot = await getDocs(userRef);
      const usuarios = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        data: usuarios
      };
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      return {
        success: false,
        error: "Error al cargar usuarios"
      };
    }
  }
  
  /**
   * Valida los datos del formulario de usuario
   * @param {Object} formData Datos del formulario
   * @param {Array} usuariosExistentes Lista de usuarios existentes
   * @returns {Object} Resultado de la validación
   */
  static validarFormularioUsuario(formData, usuariosExistentes) {
    // Comprobar campos obligatorios
    if (!formData.usuario || !formData.contrasena || !formData.confirmarContrasena || 
        !formData.rol || !formData.nombre || !formData.apellidos) {
      return {
        isValid: false,
        error: "Todos los campos marcados con * son obligatorios"
      };
    }

    // Comprobar que las contraseñas coinciden
    if (formData.contrasena !== formData.confirmarContrasena) {
      return {
        isValid: false,
        error: "Las contraseñas no coinciden"
      };
    }

    // Comprobar que el usuario no existe
    const usuarioExistente = usuariosExistentes.find(u => u.usuario === formData.usuario);
    if (usuarioExistente) {
      return {
        isValid: false,
        error: "El nombre de usuario ya está en uso"
      };
    }

    // Validar formato de email si se proporciona
    if (formData.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      return {
        isValid: false,
        error: "El formato del correo electrónico es inválido"
      };
    }

    // Validar formato de teléfono si se proporciona
    if (formData.telefono && !/^\d{10}$/.test(formData.telefono)) {
      return {
        isValid: false,
        error: "El teléfono debe tener 10 dígitos"
      };
    }

    return {
      isValid: true
    };
  }
  
  /**
   * Registra un nuevo usuario en el sistema
   * @param {Object} userData Datos del usuario a registrar
   * @returns {Promise<Object>} Resultado del registro
   */
  static async registrarUsuario(userData) {
    try {
      // Generar un ID único para el usuario
      const userId = Date.now().toString();
      
      // Preparar datos para guardar en Firebase
      const nuevoUsuario = {
        usuario: userData.usuario,
        contrasena: userData.contrasena, 
        rol: userData.rol,
        usuarioId: userId,
        email: userData.email || null,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        telefono: userData.telefono || null,
        fechaCreacion: new Date().toISOString()
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, "usuarioWeb"), nuevoUsuario);
      
      return {
        success: true,
        id: docRef.id,
        usuario: nuevoUsuario
      };
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      return {
        success: false,
        error: "Error al registrar el usuario en la base de datos"
      };
    }
  }
  
  /**
   * Busca un usuario por su nombre de usuario
   * @param {string} username Nombre de usuario a buscar
   * @returns {Promise<Object>} Resultado de la búsqueda
   */
  static async buscarUsuarioPorNombre(username) {
    try {
      const userRef = collection(db, 'usuarioWeb');
      const q = query(
        userRef, 
        where('usuario', '==', username)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      return {
        success: true,
        id: userDoc.id,
        usuario: userData
      };
    } catch (error) {
      console.error('Error al buscar usuario:', error);
      return {
        success: false,
        error: 'Error al buscar usuario'
      };
    }
  }

  /**
   * Actualiza la información de un usuario
   * @param {string} userId ID del documento del usuario
   * @param {Object} userData Nuevos datos del usuario
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async actualizarUsuario(userId, userData) {
    try {
      // Referencia al documento del usuario
      const userRef = doc(db, 'usuarioWeb', userId);
      
      // Verificar que el usuario existe
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'El usuario no existe'
        };
      }
      
      // Preparar datos para actualizar
      const datosActualizados = {
        rol: userData.rol,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        email: userData.email || null,
        telefono: userData.telefono || null,
        fechaActualizacion: new Date().toISOString()
      };
      
      // Actualizar en Firestore
      await updateDoc(userRef, datosActualizados);
      
      return {
        success: true,
        message: 'Usuario actualizado correctamente'
      };
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return {
        success: false,
        error: 'Error al actualizar el usuario en la base de datos'
      };
    }
  }
  
  /**
   * Elimina un usuario del sistema
   * @param {string} userId ID del documento del usuario
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async eliminarUsuario(userId) {
    try {
      // Referencia al documento del usuario
      const userRef = doc(db, 'usuarioWeb', userId);
      
      // Verificar que el usuario existe
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'El usuario no existe'
        };
      }
      
      // Eliminar de Firestore
      await deleteDoc(userRef);
      
      return {
        success: true,
        message: 'Usuario eliminado correctamente'
      };
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return {
        success: false,
        error: 'Error al eliminar el usuario de la base de datos'
      };
    }
  }
}

export default UsuarioController;