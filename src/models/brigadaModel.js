// src/models/brigadaModel.js
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  orderBy 
} from 'firebase/firestore';

// Constantes para tipos de brigada
export const TIPOS_BRIGADA = {
  BASURA: 'basura',
  ALUMBRADO: 'alumbrado', 
  DRENAJE: 'drenaje',
  BACHEO: 'bacheo',
  MIXTA: 'mixta' // Para brigadas que pueden atender múltiples tipos
};

// Estados de brigada
export const ESTADOS_BRIGADA = {
  ACTIVA: 'activa',
  INACTIVA: 'inactiva',
  EN_MISION: 'en_mision',
  MANTENIMIENTO: 'mantenimiento'
};

// Roles en brigada
export const ROLES_BRIGADA = {
  SUPERVISOR: 'supervisor',
  TECNICO: 'tecnico',
  OPERARIO: 'operario',
  CONDUCTOR: 'conductor'
};

// Modelo de datos para Brigada
export class BrigadaModel {
  constructor() {
    this.collectionName = 'brigadas';
  }

  // Crear nueva brigada
  async crear(dataBrigada) {
    try {
      // Validar datos requeridos
      if (!dataBrigada.nombre || !dataBrigada.tipo) {
        throw new Error("Nombre y tipo de brigada son requeridos");
      }

      // Preparar datos con valores por defecto
      const nuevaBrigada = {
        nombre: dataBrigada.nombre,
        descripcion: dataBrigada.descripcion || '',
        tipo: dataBrigada.tipo,
        estado: dataBrigada.estado || ESTADOS_BRIGADA.ACTIVA,
        
        // Miembros de la brigada
        miembros: dataBrigada.miembros || [],
        
        // Equipamiento
        equipamiento: dataBrigada.equipamiento || [],
        
        // Zonas de cobertura
        zonasCobertura: dataBrigada.zonasCobertura || [],
        
        // Horarios de trabajo
        horarios: dataBrigada.horarios || {
          lunes: { inicio: '08:00', fin: '16:00', activo: true },
          martes: { inicio: '08:00', fin: '16:00', activo: true },
          miercoles: { inicio: '08:00', fin: '16:00', activo: true },
          jueves: { inicio: '08:00', fin: '16:00', activo: true },
          viernes: { inicio: '08:00', fin: '16:00', activo: true },
          sabado: { inicio: '08:00', fin: '12:00', activo: false },
          domingo: { inicio: '00:00', fin: '00:00', activo: false }
        },
        
        // Reportes asignados
        reportesAsignados: [],
        
        // Estadísticas
        estadisticas: {
          reportesCompletados: 0,
          reportesEnProceso: 0,
          tiempoPromedioResolucion: 0,
          calificacionPromedio: 0
        },
        
        // Metadatos
        fechaCreacion: new Date(),
        fechaUltimaActualizacion: new Date(),
        creadoPor: dataBrigada.creadoPor || 'Sistema',
        activa: true
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, this.collectionName), nuevaBrigada);
      
      return {
        success: true,
        data: { id: docRef.id, ...nuevaBrigada },
        message: "Brigada creada exitosamente"
      };

    } catch (error) {
      console.error("Error en BrigadaModel.crear:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener todas las brigadas
  async obtenerTodas(filtros = {}) {
    try {
      let consulta = collection(db, this.collectionName);

      // Por ahora, solo aplicamos un filtro a la vez para evitar problemas de índices
      if (filtros.activa !== undefined) {
        // Filtro más común - por estado activo
        consulta = query(consulta, where("activa", "==", filtros.activa));
      } else if (filtros.tipo) {
        // Filtro por tipo
        consulta = query(consulta, where("tipo", "==", filtros.tipo));
      } else if (filtros.estado) {
        // Filtro por estado
        consulta = query(consulta, where("estado", "==", filtros.estado));
      }

      const querySnapshot = await getDocs(consulta);
      let brigadas = [];

      querySnapshot.forEach((doc) => {
        brigadas.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Aplicar filtros adicionales en memoria si es necesario
      if (filtros.tipo && filtros.activa !== undefined) {
        brigadas = brigadas.filter(brigada => brigada.tipo === filtros.tipo);
      }
      if (filtros.estado && filtros.activa !== undefined) {
        brigadas = brigadas.filter(brigada => brigada.estado === filtros.estado);
      }

      // Ordenar en memoria por fecha de creación
      brigadas.sort((a, b) => {
        const fechaA = a.fechaCreacion?.seconds || a.fechaCreacion?.getTime() || 0;
        const fechaB = b.fechaCreacion?.seconds || b.fechaCreacion?.getTime() || 0;
        return fechaB - fechaA; // Más recientes primero
      });

      return {
        success: true,
        data: brigadas
      };

    } catch (error) {
      console.error("Error en BrigadaModel.obtenerTodas:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener brigada por ID
  async obtenerPorId(brigadaId) {
    try {
      const docRef = doc(db, this.collectionName, brigadaId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          success: true,
          data: { id: docSnap.id, ...docSnap.data() }
        };
      } else {
        return {
          success: false,
          error: "Brigada no encontrada"
        };
      }

    } catch (error) {
      console.error("Error en BrigadaModel.obtenerPorId:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar brigada
  async actualizar(brigadaId, datosActualizacion) {
    try {
      const brigadaRef = doc(db, this.collectionName, brigadaId);
      
      // Agregar fecha de última actualización
      const datosConFecha = {
        ...datosActualizacion,
        fechaUltimaActualizacion: new Date()
      };

      await updateDoc(brigadaRef, datosConFecha);

      return {
        success: true,
        message: "Brigada actualizada exitosamente"
      };

    } catch (error) {
      console.error("Error en BrigadaModel.actualizar:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Agregar reporte a brigada
  async agregarReporte(brigadaId, reporteId) {
    try {
      // Obtener brigada actual
      const brigadaDoc = await this.obtenerPorId(brigadaId);
      if (!brigadaDoc.success) {
        return brigadaDoc;
      }

      const brigada = brigadaDoc.data;
      const reportesAsignados = brigada.reportesAsignados || [];

      // Evitar duplicados
      if (!reportesAsignados.includes(reporteId)) {
        reportesAsignados.push(reporteId);
        
        // Actualizar estadísticas
        const nuevasEstadisticas = {
          ...brigada.estadisticas,
          reportesEnProceso: reportesAsignados.length
        };

        // Actualizar brigada
        return await this.actualizar(brigadaId, {
          reportesAsignados: reportesAsignados,
          estadisticas: nuevasEstadisticas
        });
      }

      return {
        success: true,
        message: "Reporte ya estaba asignado a esta brigada"
      };

    } catch (error) {
      console.error("Error en BrigadaModel.agregarReporte:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Remover reporte de brigada
  async removerReporte(brigadaId, reporteId) {
    try {
      // Obtener brigada actual
      const brigadaDoc = await this.obtenerPorId(brigadaId);
      if (!brigadaDoc.success) {
        return brigadaDoc;
      }

      const brigada = brigadaDoc.data;
      const reportesAsignados = (brigada.reportesAsignados || []).filter(id => id !== reporteId);
      
      // Actualizar estadísticas
      const nuevasEstadisticas = {
        ...brigada.estadisticas,
        reportesEnProceso: reportesAsignados.length
      };

      // Actualizar brigada
      return await this.actualizar(brigadaId, {
        reportesAsignados: reportesAsignados,
        estadisticas: nuevasEstadisticas
      });

    } catch (error) {
      console.error("Error en BrigadaModel.removerReporte:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener brigadas disponibles para un tipo de reporte
  async obtenerDisponibles(tipoReporte, maxCarga = 5) {
    try {
      // Obtener todas las brigadas activas (filtro simple)
      const resultado = await this.obtenerTodas({ activa: true });

      if (!resultado.success) {
        return resultado;
      }

      // Filtrar en memoria por tipo y estado activo, y carga de trabajo
      const brigadasDisponibles = resultado.data.filter(brigada => {
        // Verificar que esté activa
        if (!brigada.activa) return false;
        
        // Verificar estado
        if (brigada.estado !== ESTADOS_BRIGADA.ACTIVA) return false;
        
        // Verificar tipo
        const tipoCoincide = brigada.tipo === tipoReporte || brigada.tipo === TIPOS_BRIGADA.MIXTA;
        if (!tipoCoincide) return false;
        
        // Verificar carga de trabajo
        const cargaActual = brigada.reportesAsignados?.length || 0;
        const disponible = cargaActual < maxCarga;
        
        return disponible;
      });

      // Agregar información de carga de trabajo
      const brigadasConInfo = brigadasDisponibles.map(brigada => ({
        ...brigada,
        cargaTrabajo: brigada.reportesAsignados?.length || 0,
        disponible: (brigada.reportesAsignados?.length || 0) < maxCarga
      }));

      // Ordenar por carga de trabajo (menos cargadas primero)
      brigadasConInfo.sort((a, b) => a.cargaTrabajo - b.cargaTrabajo);

      return {
        success: true,
        data: brigadasConInfo
      };

    } catch (error) {
      console.error("Error en BrigadaModel.obtenerDisponibles:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Marcar reporte como completado
  async completarReporte(brigadaId, reporteId) {
    try {
      // Obtener brigada actual
      const brigadaDoc = await this.obtenerPorId(brigadaId);
      if (!brigadaDoc.success) {
        return brigadaDoc;
      }

      const brigada = brigadaDoc.data;
      
      // Remover de reportes asignados
      const reportesAsignados = (brigada.reportesAsignados || []).filter(id => id !== reporteId);
      
      // Actualizar estadísticas
      const nuevasEstadisticas = {
        ...brigada.estadisticas,
        reportesEnProceso: reportesAsignados.length,
        reportesCompletados: (brigada.estadisticas.reportesCompletados || 0) + 1
      };

      // Actualizar brigada
      return await this.actualizar(brigadaId, {
        reportesAsignados: reportesAsignados,
        estadisticas: nuevasEstadisticas
      });

    } catch (error) {
      console.error("Error en BrigadaModel.completarReporte:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar brigada (soft delete)
  async eliminar(brigadaId) {
    try {
      return await this.actualizar(brigadaId, { activa: false });
    } catch (error) {
      console.error("Error en BrigadaModel.eliminar:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validar datos de brigada
  validarDatos(datos) {
    const errores = [];

    if (!datos.nombre || datos.nombre.trim().length < 3) {
      errores.push("El nombre debe tener al menos 3 caracteres");
    }

    if (!datos.tipo || !Object.values(TIPOS_BRIGADA).includes(datos.tipo)) {
      errores.push("Tipo de brigada inválido");
    }

    if (datos.miembros && datos.miembros.length > 0) {
      datos.miembros.forEach((miembro, index) => {
        if (!miembro.nombre || miembro.nombre.trim().length < 2) {
          errores.push(`Miembro ${index + 1}: Nombre inválido`);
        }
        if (!Object.values(ROLES_BRIGADA).includes(miembro.rol)) {
          errores.push(`Miembro ${index + 1}: Rol inválido`);
        }
      });
    }

    return {
      esValido: errores.length === 0,
      errores: errores
    };
  }
}

// Instancia singleton del modelo
export const brigadaModel = new BrigadaModel();