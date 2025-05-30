// src/controllers/agregarReporte.js
import { db } from '../models/firebase';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, serverTimestamp, query, where
} from 'firebase/firestore';

// se usa export default en lugar de una clase exportada
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
    
    // Registrar un nuevo reporte en Firestore - CORREGIDO PARA FORMATO DE FECHA
    registrarReporte: async (formData) => {
        try {
            // Obtener información del usuario actual
            const usuarioId = formData.usuarioId || localStorage.getItem('userId') || null;
            const nombreUsuario = formData.nombreUsuario || localStorage.getItem('username') || 'Usuario';
            
            // Referencia a la colección "reportes"
            const reportesRef = collection(db, "reportes");
            
            // Asegurar que la fecha tiene el formato correcto
            let fecha = formData.fecha;
            if (typeof fecha === 'string' && !fecha.includes('T')) {
                // Si no tiene formato ISO, convertirlo
                fecha = new Date(fecha).toISOString();
            }
            
            // Preparar los datos para Firestore
            const reporteData = {
                folio: formData.folio,
                categoria: formData.categoria, // Nombre completo de la categoría
                direccion: formData.direccion,
                ubicacion: formData.ubicacion || null,
                fecha: fecha, // Formato ISO con fecha y hora
                comentario: formData.comentario || "",
                // Siempre establecer como pendiente al crear un nuevo reporte
                estado: "pendiente",
                usuarioId: usuarioId, // ID del usuario que creó el reporte
                nombreUsuario: nombreUsuario, // Nombre del usuario que creó el reporte
                fechaCreacion: serverTimestamp() // Timestamp de Firebase
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
    // CORREGIDO PARA FORMATEAR FECHAS CORRECTAMENTE
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
                // Convertir la fecha de timestamp a string si existe - FORMATO MEJORADO
                if (data.fechaCreacion) {
                    try {
                        const fecha = data.fechaCreacion.toDate();
                        // Usar formato más completo con fecha y hora
                        data.fechaCreacionStr = fecha.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun' // Zona horaria para Quintana Roo
                        });
                    } catch (error) {
                        console.error("Error al convertir timestamp:", error);
                        data.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                // Formatear la fecha normal si existe - NUEVO
                if (data.fecha) {
                    try {
                        let fechaObj;
                        // Verificar si la fecha es un string en formato ISO o un objeto Date
                        if (typeof data.fecha === 'string') {
                            fechaObj = new Date(data.fecha);
                        } else if (data.fecha.toDate) { 
                            // Si es un timestamp de Firestore
                            fechaObj = data.fecha.toDate();
                        } else {
                            fechaObj = new Date(data.fecha);
                        }
                        
                        data.fechaStr = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun' // Zona horaria para Quintana Roo
                        });
                    } catch (error) {
                        console.error("Error al formatear fecha:", error);
                        data.fechaStr = "Fecha no disponible";
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
    
    // Obtener todos los reportes (solo para administradores) - CORREGIDO FORMATO DE FECHA
    obtenerTodosReportes: async () => {
        try {
            const reportesRef = collection(db, "reportes");
            // Consulta sin ordenamiento en Firestore
            const querySnapshot = await getDocs(reportesRef);
            
            const reportes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Formatear fechaCreacion
                if (data.fechaCreacion) {
                    try {
                        const fecha = data.fechaCreacion.toDate();
                        data.fechaCreacionStr = fecha.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        data.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                // Formatear la fecha normal
                if (data.fecha) {
                    try {
                        let fechaObj;
                        if (typeof data.fecha === 'string') {
                            fechaObj = new Date(data.fecha);
                        } else if (data.fecha.toDate) {
                            fechaObj = data.fecha.toDate();
                        } else {
                            fechaObj = new Date(data.fecha);
                        }
                        
                        data.fechaStr = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        console.error("Error al formatear fecha:", error);
                        data.fechaStr = "Fecha no disponible";
                    }
                }
                
                // Formatear fechaResolucion si existe - NUEVO
                if (data.fechaResolucion) {
                    try {
                        let fechaObj;
                        if (typeof data.fechaResolucion === 'string') {
                            fechaObj = new Date(data.fechaResolucion);
                        } else if (data.fechaResolucion.toDate) {
                            fechaObj = data.fechaResolucion.toDate();
                        } else {
                            fechaObj = new Date(data.fechaResolucion);
                        }
                        
                        data.fechaResolucionStr = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        console.error("Error al formatear fecha de resolución:", error);
                        data.fechaResolucionStr = "Fecha no disponible";
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
    
    // Obtener reportes agrupados por categoría (para dashboard) - ACTUALIZADO CON NUEVAS CATEGORÍAS
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
                        data.fechaCreacionStr = fecha.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
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
            
            // Inicializar categorías CON NOMBRES COMPLETOS
            const categorias = ["Basura Acumulada", "Alumbrado Público", "Drenajes Obstruidos", "Bacheo"];
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
                } else if (reporte.categoria) {
                    // Si la categoría no está en nuestras categorías predefinidas, 
                    // podríamos estar tratando con categorías antiguas
                    
                    // Mapeo de categorías antiguas a nuevas (si es necesario)
                    const mapeoCategoriasAntiguas = {
                        "basura": "Basura Acumulada",
                        "alumbrado": "Alumbrado Público",
                        "drenaje": "Drenajes Obstruidos",
                        "bacheo": "Bacheo"
                    };
                    
                    const categoriaCorrecta = mapeoCategoriasAntiguas[reporte.categoria];
                    if (categoriaCorrecta && reportesPorCategoria[categoriaCorrecta] !== undefined) {
                        reportesPorCategoria[categoriaCorrecta]++;
                    } else {
                        // Si no podemos mapear, agregar como "Otra"
                        if (!reportesPorCategoria["Otra"]) {
                            reportesPorCategoria["Otra"] = 0;
                        }
                        reportesPorCategoria["Otra"]++;
                    }
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
    
    // Obtener un reporte específico por ID - CORREGIDO FORMATO DE FECHA
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
                        reporteData.fechaCreacionStr = fecha.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        console.error("Error al convertir timestamp:", error);
                        reporteData.fechaCreacionStr = "Fecha no disponible";
                    }
                }
                
                // Formatear la fecha normal
                if (reporteData.fecha) {
                    try {
                        let fechaObj;
                        if (typeof reporteData.fecha === 'string') {
                            fechaObj = new Date(reporteData.fecha);
                        } else if (reporteData.fecha.toDate) {
                            fechaObj = reporteData.fecha.toDate();
                        } else {
                            fechaObj = new Date(reporteData.fecha);
                        }
                        
                        reporteData.fechaStr = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        console.error("Error al formatear fecha:", error);
                        reporteData.fechaStr = "Fecha no disponible";
                    }
                }
                
                // Formatear fechaResolucion si existe
                if (reporteData.fechaResolucion) {
                    try {
                        let fechaObj;
                        if (typeof reporteData.fechaResolucion === 'string') {
                            fechaObj = new Date(reporteData.fechaResolucion);
                        } else if (reporteData.fechaResolucion.toDate) {
                            fechaObj = reporteData.fechaResolucion.toDate();
                        } else {
                            fechaObj = new Date(reporteData.fechaResolucion);
                        }
                        
                        reporteData.fechaResolucionStr = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'America/Cancun'
                        });
                    } catch (error) {
                        console.error("Error al formatear fecha de resolución:", error);
                        reporteData.fechaResolucionStr = "Fecha no disponible";
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
    
    // Actualizar un reporte existente - CORREGIDO PARA FORMATO DE FECHA
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
            
            // Asegurar que la fecha tiene el formato correcto
            let fecha = reporteData.fecha;
            if (typeof fecha === 'string' && !fecha.includes('T')) {
                // Si no tiene formato ISO, convertirlo
                fecha = new Date(fecha).toISOString();
            }
            
            // Extraer los campos que se actualizarán
            const datosActualizados = {
                categoria: reporteData.categoria,
                direccion: reporteData.direccion,
                estado: reporteData.estado,
                fecha: fecha,
                comentario: reporteData.comentario || "",
                fechaActualizacion: serverTimestamp()
            };
            
            // Si el estado cambia a "resuelto", añadir la fecha de resolución
            if (reporteData.estado === 'resuelto' && reporteActual.estado !== 'resuelto') {
                datosActualizados.fechaResolucion = serverTimestamp();
            }
            
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