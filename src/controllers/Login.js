// src/controllers/Login.js
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../models/firebase';

/**
 * Función para iniciar sesión con usuario y contraseña
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} - Resultado del inicio de sesión
 */
export const loginWithUsernamePassword = async (username, password) => {
  try {
    console.log("Intentando autenticar usuario:", username);
    
    // Buscar usuario en la colección usuarioWeb
    const userRef = collection(db, 'usuarioWeb');
    const q = query(
      userRef, 
      where('usuario', '==', username),
      where('contrasena', '==', password)
    );
    
    console.log("Ejecutando consulta en Firestore");
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No se encontraron coincidencias");
      return {
        success: false,
        error: 'Usuario o contraseña incorrectos'
      };
    }
    
    // Obtener datos del usuario
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log("Usuario autenticado:", userData.usuario);
    
    // Retornar información del usuario
    return {
      success: true,
      id: userDoc.id,
      usuario: userData.usuario,
      rol: userData.rol,
      usuarioId: userData.usuarioId,
      nombre: userData.nombre || userData.usuario // Mantener el nombre si existe
    };
  } catch (error) {
    console.error('Error en autenticación:', error);
    return {
      success: false,
      error: 'Error al iniciar sesión: ' + error.message
    };
  }
};

/**
 * Función para verificar si el usuario tiene permisos para acceder a ciertas rutas
 * @param {string} userRole - Rol del usuario
 * @param {string} requiredRole - Rol requerido para la ruta
 * @returns {boolean} - True si tiene permiso, false en caso contrario
 */
export const checkUserPermission = (userRole, requiredRole) => {
  // Lógica simple de permisos, puede ser expandida según necesidades
  if (requiredRole === 'admin' && userRole === 'admin') {
    return true;
  }
  
  if (requiredRole === 'user' && (userRole === 'admin' || userRole === 'user')) {
    return true;
  }
  
  return false;
};