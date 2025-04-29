// src/controllers/agregarReporte.js
import { db } from '../models/firebase';
import { 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc, 
    updateDoc, 
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';

// Usa export default en lugar de una clase exportada
const ReporteController = {
    // Generar un folio único para el reporte
    generarFolio: () => {
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
        const dia = ahora.getDate().toString().padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        return `RP-${anio}${mes}${dia}-${randomNum}`;
    },

    // Validar el formulario de reporte
    validarFormularioReporte: (formData) => {
        // Validar folio
        if (!formData.folio || formData.folio.trim() === '') {
            return {
                isValid: false,
                error: "Por favor genere un folio para el reporte."
            };
        }
        
        // Validar categoría
        if (!formData.categoria || formData.categoria.trim() === '') {
            return {
                isValid: false,
                error: "Por favor seleccione una categoría."
            };
        }
        
        // Validar dirección
        if (!formData.direccion || formData.direccion.trim() === '') {
            return {
                isValid: false,
                error: "Por favor ingrese la dirección del reporte."
            };
        }
        
        // Si todas las validaciones pasan
        return {
            isValid: true,
            error: ""
        };
    },
    
    // Registrar un nuevo reporte en Firestore
    registrarReporte: async (formData) => {
        try {
            // Obtener información del usuario actual
            const usuarioId = formData.usuarioId || localStorage.getItem('userId') || null;
            const nombreUsuario = formData.nombreUsuario || localStorage.getItem('username') || 'Usuario';
            
            // Referencia a la colección "reportes"
            const reportesRef = collection(db, "reportes");
            
            // Preparar los datos para Firestore
            const reporteData = {
                folio: formData.folio,
                categoria: formData.categoria,
                direccion: formData.direccion,
                ubicacion: formData.ubicacion || null,
                fecha: formData.fecha,
                comentario: formData.comentario || "",
                // Siempre establecer como pendiente al crear un nuevo reporte
                estado: "pendiente",
                usuarioId: usuarioId, // ID del usuario que creó el reporte
                nombreUsuario: nombreUsuario, // Nombre del usuario que creó el reporte
                fechaCreacion: serverTimestamp()
            };
            
            // Añadir documento a Firestore
            const docRef = await addDoc(reportesRef, reporteData);
            
            // Actualizar el documento con su ID
            await updateDoc(doc(db, "reportes", docRef.id), {
                id: docRef.id
            });
            
            return {
                success: true,
                message: `Reporte con folio ${formData.folio} registrado correctamente.`,
                reporte: {
                    ...reporteData,
                    id: docRef.id
                }
            };
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al registrar el reporte. Por favor intente nuevamente."
            };
        }
    },
    
    // Obtener reportes filtrados por usuario actual sin ordenar (para evitar error de índice)
    obtenerReportes: async () => {
        try {
            // Obtener ID del usuario actual
            const usuarioId = localStorage.getItem('userId');
            
            if (!usuarioId) {
                console.error("No se encontró ID de usuario en localStorage");
                return {
                    success: false,
                    error: "Debes iniciar sesión para ver tus reportes."
                };
            }
            
            // Referencia a la colección de reportes
            const reportesRef = collection(db, "reportes");
            
            // Consulta filtrada solo por usuarioId (sin ordenar)
            const q = query(
                reportesRef, 
                where("usuarioId", "==", usuarioId)
            );
            
            const querySnapshot = await getDocs(q);
            
            const reportes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Convertir la fecha de timestamp a string si existe
                if (data.fechaCreacion) {
                    try {
                        const fecha = data.fechaCreacion.toDate();
                        data.fechaCreacionStr = fecha.toLocaleDateString();
                    } catch (error) {
                        console.error("Error al convertir timestamp:", error);
                        data.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                reportes.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Ordenar los resultados en el cliente
            reportes.sort((a, b) => {
                // Si no hay fechaCreacion, colocar al final
                if (!a.fechaCreacion) return 1;
                if (!b.fechaCreacion) return -1;
                
                // Ordenar de más reciente a más antiguo
                return b.fechaCreacion.seconds - a.fechaCreacion.seconds;
            });
            
            return {
                success: true,
                data: reportes
            };
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al obtener los reportes."
            };
        }
    },
    
    // Obtener todos los reportes (solo para administradores)
    obtenerTodosReportes: async () => {
        try {
            const reportesRef = collection(db, "reportes");
            // Consulta sin ordenamiento en Firestore
            const querySnapshot = await getDocs(reportesRef);
            
            const reportes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.fechaCreacion) {
                    try {
                        const fecha = data.fechaCreacion.toDate();
                        data.fechaCreacionStr = fecha.toLocaleDateString();
                    } catch (error) {
                        data.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                reportes.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Ordenar los resultados en el cliente
            reportes.sort((a, b) => {
                // Si no hay fechaCreacion, colocar al final
                if (!a.fechaCreacion) return 1;
                if (!b.fechaCreacion) return -1;
                
                // Ordenar de más reciente a más antiguo
                return b.fechaCreacion.seconds - a.fechaCreacion.seconds;
            });
            
            return {
                success: true,
                data: reportes
            };
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al obtener los reportes."
            };
        }
    },
    
    // Obtener reportes agrupados por categoría (para dashboard)
    obtenerReportesAgrupados: async () => {
        try {
            // Primero obtenemos todos los reportes sin ordenamiento en Firestore
            const reportesRef = collection(db, "reportes");
            const querySnapshot = await getDocs(reportesRef);
            
            const reportes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Convertir la fecha de timestamp a string si existe
                if (data.fechaCreacion) {
                    try {
                        const fecha = data.fechaCreacion.toDate();
                        data.fechaCreacionStr = fecha.toLocaleDateString();
                    } catch (error) {
                        data.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                reportes.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Ordenar los resultados en el cliente (más reciente primero)
            reportes.sort((a, b) => {
                if (!a.fechaCreacion) return 1;
                if (!b.fechaCreacion) return -1;
                return b.fechaCreacion.seconds - a.fechaCreacion.seconds;
            });
            
            // Agrupar por categoría
            const reportesPorCategoria = {};
            const reportesPorEstado = {};
            
            // Inicializar categorías
            const categorias = ["basura", "alumbrado", "drenaje", "bacheo"];
            categorias.forEach(cat => {
                reportesPorCategoria[cat] = 0;
            });
            
            // Inicializar estados
            const estados = ["pendiente", "en_revision", "en_proceso", "resuelto", "cancelado"];
            estados.forEach(estado => {
                reportesPorEstado[estado] = 0;
            });
            
            // Contar reportes por categoría y estado
            reportes.forEach(reporte => {
                // Contar por categoría
                if (reporte.categoria && reportesPorCategoria[reporte.categoria] !== undefined) {
                    reportesPorCategoria[reporte.categoria]++;
                }
                
                // Contar por estado
                if (reporte.estado && reportesPorEstado[reporte.estado] !== undefined) {
                    reportesPorEstado[reporte.estado]++;
                }
            });
            
            return {
                success: true,
                data: {
                    reportesPorCategoria,
                    reportesPorEstado,
                    total: reportes.length,
                    recientes: reportes.slice(0, 5) // Últimos 5 reportes
                }
            };
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al obtener los reportes agrupados."
            };
        }
    },
    
    // Obtener un reporte específico por ID
    obtenerReportePorId: async (reporteId) => {
        try {
            const reporteRef = doc(db, "reportes", reporteId);
            const docSnap = await getDoc(reporteRef);
            
            if (docSnap.exists()) {
                const reporteData = docSnap.data();
                
                // Convertir la fecha de timestamp a string si existe
                if (reporteData.fechaCreacion) {
                    try {
                        const fecha = reporteData.fechaCreacion.toDate();
                        reporteData.fechaCreacionStr = fecha.toLocaleDateString();
                    } catch (error) {
                        console.error("Error al convertir timestamp:", error);
                        reporteData.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                // Verificar que el usuario actual sea el propietario del reporte
                const usuarioId = localStorage.getItem('userId');
                if (reporteData.usuarioId !== usuarioId) {
                    // Permitir acceso a administradores
                    const userRole = localStorage.getItem('userRole');
                    const rolesAdmin = ['jefe_ayuntatel', 'jefe_departamento', 'admin', 'auditor'];
                    
                    if (!rolesAdmin.includes(userRole)) {
                        return {
                            success: false,
                            error: "No tienes permiso para ver este reporte."
                        };
                    }
                }
                
                return {
                    success: true,
                    data: {
                        id: docSnap.id,
                        ...reporteData
                    }
                };
            } else {
                return {
                    success: false,
                    error: "El reporte no existe."
                };
            }
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al obtener el reporte."
            };
        }
    },
    
    // Actualizar un reporte existente
    actualizarReporte: async (reporteData) => {
        try {
            // Validar que exista ID del reporte
            if (!reporteData.id) {
                return {
                    success: false,
                    error: "ID de reporte no válido"
                };
            }
            
            // Obtener el reporte actual para verificar permisos
            const reporteRef = doc(db, "reportes", reporteData.id);
            const docSnap = await getDoc(reporteRef);
            
            if (!docSnap.exists()) {
                return {
                    success: false,
                    error: "El reporte no existe"
                };
            }
            
            const reporteActual = docSnap.data();
            const usuarioId = localStorage.getItem('userId');
            
            // Verificar que el usuario actual sea el propietario o un administrador
            if (reporteActual.usuarioId !== usuarioId) {
                // Permitir edición a administradores
                const userRole = localStorage.getItem('userRole');
                const rolesAdmin = ['jefe_ayuntatel', 'jefe_departamento', 'admin'];
                
                if (!rolesAdmin.includes(userRole)) {
                    return {
                        success: false,
                        error: "No tienes permiso para editar este reporte."
                    };
                }
            }
            
            // Extraer los campos que se actualizarán
            const datosActualizados = {
                categoria: reporteData.categoria,
                direccion: reporteData.direccion,
                estado: reporteData.estado,
                fecha: reporteData.fecha,
                comentario: reporteData.comentario || "",
                fechaActualizacion: serverTimestamp()
            };
            
            // Incluir la ubicación si existe en los datos enviados
            if (reporteData.ubicacion) {
                datosActualizados.ubicacion = reporteData.ubicacion;
            }
            
            // Actualizar el documento
            await updateDoc(reporteRef, datosActualizados);
            
            return {
                success: true,
                message: "Reporte actualizado correctamente",
                data: {
                    id: reporteData.id,
                    ...datosActualizados
                }
            };
        } catch (error) {
            console.error("Error en el controlador:", error);
            return {
                success: false,
                error: "Error al actualizar el reporte."
            };
        }
    }
};

export default ReporteController;