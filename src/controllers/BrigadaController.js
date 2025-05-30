// src/controllers/BrigadaController.js
import { brigadaModel, TIPOS_BRIGADA, ESTADOS_BRIGADA, ROLES_BRIGADA } from '../models/brigadaModel';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../models/firebase';

export class BrigadaController {
  
  // Obtener todas las brigadas con filtros opcionales
  static async obtenerBrigadas(filtros = {}) {
    try {
      const resultado = await brigadaModel.obtenerTodas(filtros);
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.obtenerBrigadas:", error);
      return {
        success: false,
        error: "Error al obtener brigadas: " + error.message
      };
    }
  }

  // Crear nueva brigada
  static async crearBrigada(dataBrigada) {
    try {
      // Validar datos antes de crear
      const validacion = brigadaModel.validarDatos(dataBrigada);
      if (!validacion.esValido) {
        return {
          success: false,
          error: "Datos inválidos: " + validacion.errores.join(", ")
        };
      }

      // Agregar información del usuario actual
      const usuarioActual = localStorage.getItem('username') || 'Sistema';
      const datosConUsuario = {
        ...dataBrigada,
        creadoPor: usuarioActual
      };

      const resultado = await brigadaModel.crear(datosConUsuario);
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.crearBrigada:", error);
      return {
        success: false,
        error: "Error al crear brigada: " + error.message
      };
    }
  }

  // Obtener brigada por ID
  static async obtenerBrigadaPorId(brigadaId) {
    try {
      const resultado = await brigadaModel.obtenerPorId(brigadaId);
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.obtenerBrigadaPorId:", error);
      return {
        success: false,
        error: "Error al obtener brigada: " + error.message
      };
    }
  }

  // Actualizar brigada
  static async actualizarBrigada(brigadaId, datosActualizacion) {
    try {
      // Validar datos si se proporcionan campos críticos
      if (datosActualizacion.nombre || datosActualizacion.tipo || datosActualizacion.miembros) {
        const validacion = brigadaModel.validarDatos(datosActualizacion);
        if (!validacion.esValido) {
          return {
            success: false,
            error: "Datos inválidos: " + validacion.errores.join(", ")
          };
        }
      }

      const resultado = await brigadaModel.actualizar(brigadaId, datosActualizacion);
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.actualizarBrigada:", error);
      return {
        success: false,
        error: "Error al actualizar brigada: " + error.message
      };
    }
  }

  // Obtener brigadas disponibles para un tipo de reporte
  static async obtenerBrigadasDisponibles(tipoReporte, ubicacion = null) {
    try {
      // Mapear categorías de reporte a tipos de brigada
      const mapeoTipos = {
        'Alumbrado Público': TIPOS_BRIGADA.ALUMBRADO,
        'Basura Acumulada': TIPOS_BRIGADA.BASURA,
        'Bacheo': TIPOS_BRIGADA.BACHEO,
        'Drenajes Obstruidos': TIPOS_BRIGADA.DRENAJE
      };

      const tipoBrigada = mapeoTipos[tipoReporte] || tipoReporte.toLowerCase();
      const resultado = await brigadaModel.obtenerDisponibles(tipoBrigada);
      
      if (resultado.success && ubicacion) {
        // Aquí podrías agregar lógica para filtrar por ubicación
        // Por ahora solo devolvemos todas las disponibles
        resultado.data = resultado.data.map(brigada => ({
          ...brigada,
          distanciaEstimada: this.calcularDistanciaEstimada(ubicacion, brigada)
        }));
      }

      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.obtenerBrigadasDisponibles:", error);
      return {
        success: false,
        error: "Error al obtener brigadas disponibles: " + error.message
      };
    }
  }

  // Asignar reporte a brigada
  static async asignarReporte(brigadaId, reporteId, asignadoPor) {
    try {
      // 1. Agregar reporte a la brigada
      const resultadoBrigada = await brigadaModel.agregarReporte(brigadaId, reporteId);
      if (!resultadoBrigada.success) {
        return resultadoBrigada;
      }

      // 2. Obtener información de la brigada para actualizar el reporte
      const brigadaInfo = await brigadaModel.obtenerPorId(brigadaId);
      if (!brigadaInfo.success) {
        return brigadaInfo;
      }

      // 3. Actualizar el reporte con información de la brigada
      const reporteRef = doc(db, "reportes", reporteId);
      const datosActualizacion = {
        estado: 'asignado',
        brigadaAsignada: {
          id: brigadaId,
          nombre: brigadaInfo.data.nombre,
          tipo: brigadaInfo.data.tipo,
          fechaAsignacion: new Date(),
          asignadoPor: asignadoPor || 'Sistema'
        },
        fechaUltimaActualizacion: new Date()
      };

      await updateDoc(reporteRef, datosActualizacion);

      return {
        success: true,
        message: `Reporte asignado exitosamente a la brigada ${brigadaInfo.data.nombre}`,
        data: {
          brigadaId: brigadaId,
          brigadaNombre: brigadaInfo.data.nombre,
          reporteId: reporteId
        }
      };

    } catch (error) {
      console.error("Error en BrigadaController.asignarReporte:", error);
      
      // Intentar revertir cambios en caso de error
      try {
        await brigadaModel.removerReporte(brigadaId, reporteId);
      } catch (revertError) {
        console.error("Error al revertir asignación:", revertError);
      }

      return {
        success: false,
        error: "Error al asignar reporte: " + error.message
      };
    }
  }

  // Desasignar reporte de brigada
  static async desasignarReporte(brigadaId, reporteId) {
    try {
      // 1. Remover reporte de la brigada
      const resultadoBrigada = await brigadaModel.removerReporte(brigadaId, reporteId);
      if (!resultadoBrigada.success) {
        return resultadoBrigada;
      }

      // 2. Actualizar el reporte removiendo información de brigada
      const reporteRef = doc(db, "reportes", reporteId);
      const datosActualizacion = {
        estado: 'pendiente',
        brigadaAsignada: null,
        fechaUltimaActualizacion: new Date()
      };

      await updateDoc(reporteRef, datosActualizacion);

      return {
        success: true,
        message: "Reporte desasignado exitosamente",
        data: { reporteId: reporteId }
      };

    } catch (error) {
      console.error("Error en BrigadaController.desasignarReporte:", error);
      return {
        success: false,
        error: "Error al desasignar reporte: " + error.message
      };
    }
  }

  // Completar reporte asignado a brigada
  static async completarReporte(brigadaId, reporteId) {
    try {
      // 1. Marcar como completado en la brigada
      const resultadoBrigada = await brigadaModel.completarReporte(brigadaId, reporteId);
      if (!resultadoBrigada.success) {
        return resultadoBrigada;
      }

      // 2. Actualizar el reporte como resuelto
      const reporteRef = doc(db, "reportes", reporteId);
      const datosActualizacion = {
        estado: 'resuelto',
        fechaResolucion: new Date(),
        fechaUltimaActualizacion: new Date()
      };

      await updateDoc(reporteRef, datosActualizacion);

      return {
        success: true,
        message: "Reporte completado exitosamente",
        data: { reporteId: reporteId }
      };

    } catch (error) {
      console.error("Error en BrigadaController.completarReporte:", error);
      return {
        success: false,
        error: "Error al completar reporte: " + error.message
      };
    }
  }

  // Cambiar estado de brigada
  static async cambiarEstadoBrigada(brigadaId, nuevoEstado) {
    try {
      if (!Object.values(ESTADOS_BRIGADA).includes(nuevoEstado)) {
        return {
          success: false,
          error: "Estado de brigada inválido"
        };
      }

      const resultado = await brigadaModel.actualizar(brigadaId, { estado: nuevoEstado });
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.cambiarEstadoBrigada:", error);
      return {
        success: false,
        error: "Error al cambiar estado: " + error.message
      };
    }
  }

  // Obtener estadísticas de brigadas
  static async obtenerEstadisticas() {
    try {
      const resultado = await brigadaModel.obtenerTodas({ activa: true });
      if (!resultado.success) {
        return resultado;
      }

      const brigadas = resultado.data;
      const estadisticas = {
        totalBrigadas: brigadas.length,
        brigadasActivas: brigadas.filter(b => b.estado === ESTADOS_BRIGADA.ACTIVA).length,
        brigadasEnMision: brigadas.filter(b => b.estado === ESTADOS_BRIGADA.EN_MISION).length,
        totalMiembros: brigadas.reduce((sum, b) => sum + (b.miembros?.length || 0), 0),
        reportesAsignados: brigadas.reduce((sum, b) => sum + (b.reportesAsignados?.length || 0), 0),
        reportesCompletados: brigadas.reduce((sum, b) => sum + (b.estadisticas?.reportesCompletados || 0), 0),
        porTipo: {
          [TIPOS_BRIGADA.BASURA]: brigadas.filter(b => b.tipo === TIPOS_BRIGADA.BASURA).length,
          [TIPOS_BRIGADA.ALUMBRADO]: brigadas.filter(b => b.tipo === TIPOS_BRIGADA.ALUMBRADO).length,
          [TIPOS_BRIGADA.DRENAJE]: brigadas.filter(b => b.tipo === TIPOS_BRIGADA.DRENAJE).length,
          [TIPOS_BRIGADA.BACHEO]: brigadas.filter(b => b.tipo === TIPOS_BRIGADA.BACHEO).length,
          [TIPOS_BRIGADA.MIXTA]: brigadas.filter(b => b.tipo === TIPOS_BRIGADA.MIXTA).length
        }
      };

      return {
        success: true,
        data: estadisticas
      };

    } catch (error) {
      console.error("Error en BrigadaController.obtenerEstadisticas:", error);
      return {
        success: false,
        error: "Error al obtener estadísticas: " + error.message
      };
    }
  }

  // Eliminar brigada (soft delete)
  static async eliminarBrigada(brigadaId) {
    try {
      // Verificar que no tenga reportes asignados
      const brigada = await brigadaModel.obtenerPorId(brigadaId);
      if (!brigada.success) {
        return brigada;
      }

      if (brigada.data.reportesAsignados && brigada.data.reportesAsignados.length > 0) {
        return {
          success: false,
          error: "No se puede eliminar una brigada con reportes asignados"
        };
      }

      const resultado = await brigadaModel.eliminar(brigadaId);
      return resultado;
    } catch (error) {
      console.error("Error en BrigadaController.eliminarBrigada:", error);
      return {
        success: false,
        error: "Error al eliminar brigada: " + error.message
      };
    }
  }

  // Calcular distancia estimada (función auxiliar)
  static calcularDistanciaEstimada(ubicacion, brigada) {
    // Implementación básica - se puede mejorar
    if (!ubicacion || !brigada.zonasCobertura || brigada.zonasCobertura.length === 0) {
      return null;
    }

    // Por ahora retornamos una distancia simulada
    // En una implementación real, calcularías la distancia real
    return Math.random() * 10; // Distancia aleatoria entre 0-10 km
  }

  // Obtener nombres de roles para la UI
  static obtenerRoles() {
    return {
      [ROLES_BRIGADA.SUPERVISOR]: 'Supervisor',
      [ROLES_BRIGADA.TECNICO]: 'Técnico',
      [ROLES_BRIGADA.OPERARIO]: 'Operario',
      [ROLES_BRIGADA.CONDUCTOR]: 'Conductor'
    };
  }

  // Obtener nombres de tipos para la UI
  static obtenerTipos() {
    return {
      [TIPOS_BRIGADA.BASURA]: 'Basura Acumulada',
      [TIPOS_BRIGADA.ALUMBRADO]: 'Alumbrado Público',
      [TIPOS_BRIGADA.DRENAJE]: 'Drenajes Obstruidos',
      [TIPOS_BRIGADA.BACHEO]: 'Bacheo',
      [TIPOS_BRIGADA.MIXTA]: 'Brigada Mixta'
    };
  }

  // Obtener nombres de estados para la UI
  static obtenerEstados() {
    return {
      [ESTADOS_BRIGADA.ACTIVA]: 'Activa',
      [ESTADOS_BRIGADA.INACTIVA]: 'Inactiva',
      [ESTADOS_BRIGADA.EN_MISION]: 'En Misión',
      [ESTADOS_BRIGADA.MANTENIMIENTO]: 'Mantenimiento'
    };
  }
}

// Exportar constantes para uso en las vistas
export { TIPOS_BRIGADA, ESTADOS_BRIGADA, ROLES_BRIGADA };