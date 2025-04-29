// src/controllers/EstadisticasControllerExtendido.js
import { db } from '../models/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import EstadisticasController from './EstadisticasController';

/**
 * Controlador extendido para las funciones avanzadas del Dashboard de Jefe de Departamento
 * Hereda del controlador básico de estadísticas
 */
class EstadisticasControllerExtendido {
  /**
   * Obtiene todos los reportes con información detallada para análisis
   * @param {string} ciudad - Nombre de la ciudad para filtrar reportes
   * @returns {Promise<Object>} - Objeto con los datos de reportes
   */
  async obtenerReportesDetallados(ciudad = 'Chetumal') {
    try {
      // Primero obtener los reportes base usando el controlador existente
      const resultadoBase = await EstadisticasController.obtenerReportesPorCiudad(ciudad);
      
      if (!resultadoBase.success) {
        return resultadoBase; // Devolver el error si hubo problemas al obtener los reportes
      }
      
      const reportesBase = resultadoBase.data;
      const reportesDetallados = [];
      
      // Para cada reporte, obtener información adicional
      for (const reporte of reportesBase) {
        // Agregar información de tiempo de resolución
        let tiempoResolucion = null;
        if (reporte.estatus === 'resuelto' && reporte.fechaResolucion && reporte.fechaCreacion) {
          const fechaResolucion = new Date(reporte.fechaResolucion.seconds * 1000);
          const fechaCreacion = new Date(reporte.fechaCreacion.seconds * 1000);
          tiempoResolucion = (fechaResolucion - fechaCreacion) / (1000 * 60 * 60 * 24); // en días
        }
        
        // Agregar seguimiento si existe
        let seguimiento = [];
        if (reporte.id) {
          try {
            const seguimientoData = await this.obtenerSeguimientoReporte(reporte.id);
            if (seguimientoData.success) {
              seguimiento = seguimientoData.data;
            }
          } catch (err) {
            console.error(`Error al obtener seguimiento del reporte ${reporte.id}:`, err);
          }
        }
        
        // Obtener información del responsable si existe
        let datosResponsable = {};
        if (reporte.responsableId) {
          try {
            const respData = await this.obtenerInformacionUsuario(reporte.responsableId);
            if (respData.success) {
              datosResponsable = respData.data;
            }
          } catch (err) {
            console.error(`Error al obtener datos del responsable ${reporte.responsableId}:`, err);
          }
        }
        
        // Crear objeto de reporte detallado
        const reporteDetallado = {
          ...reporte,
          tiempoResolucion,
          seguimiento,
          datosResponsable,
          tiempoTranscurrido: this.calcularTiempoTranscurrido(reporte)
        };
        
        reportesDetallados.push(reporteDetallado);
      }
      
      return {
        success: true,
        data: reportesDetallados
      };
    } catch (error) {
      console.error("Error al obtener reportes detallados:", error);
      return {
        success: false,
        error: "Error al obtener información detallada de reportes. Intente nuevamente."
      };
    }
  }
  
  /**
   * Calcula el tiempo transcurrido de un reporte
   * @param {Object} reporte - Objeto del reporte
   * @returns {number} - Tiempo transcurrido en días
   */
  calcularTiempoTranscurrido(reporte) {
    const fechaCreacion = reporte.fechaObj || new Date();
    const fechaActual = new Date();
    
    // Si está resuelto, usar la fecha de resolución
    if (reporte.estatus === 'resuelto' && reporte.fechaResolucion) {
      const fechaResolucion = new Date(reporte.fechaResolucion.seconds * 1000);
      return (fechaResolucion - fechaCreacion) / (1000 * 60 * 60 * 24);
    }
    
    // Si no está resuelto, calcular desde la creación hasta ahora
    return (fechaActual - fechaCreacion) / (1000 * 60 * 60 * 24);
  }
  
  /**
   * Obtiene el historial de seguimiento de un reporte
   * @param {string} reporteId - ID del reporte
   * @returns {Promise<Object>} - Objeto con el historial de seguimiento
   */
  async obtenerSeguimientoReporte(reporteId) {
    try {
      // Buscar en la colección de seguimiento
      const seguimientoRef = collection(db, "seguimiento_reportes");
      const q = query(
        seguimientoRef, 
        where("reporteId", "==", reporteId),
        orderBy("fecha", "asc")
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          success: true,
          data: []
        };
      }
      
      const seguimientos = snapshot.docs.map(doc => {
        const data = doc.data();
        // Transformar fecha de Firestore a objeto Date
        const fecha = data.fecha ? new Date(data.fecha.seconds * 1000) : new Date();
        
        return {
          id: doc.id,
          ...data,
          fecha,
          fechaFormateada: fecha.toLocaleString()
        };
      });
      
      return {
        success: true,
        data: seguimientos
      };
    } catch (error) {
      console.error("Error al obtener seguimiento:", error);
      return {
        success: false,
        error: "Error al obtener historial de seguimiento"
      };
    }
  }
  
  /**
   * Obtiene información detallada de un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Objeto con la información del usuario
   */
  async obtenerInformacionUsuario(usuarioId) {
    try {
      const usuarioRef = doc(db, "usuarioWeb", usuarioId);
      const snapshot = await getDoc(usuarioRef);
      
      if (!snapshot.exists()) {
        return {
          success: false,
          error: "Usuario no encontrado"
        };
      }
      
      const usuario = {
        id: snapshot.id,
        ...snapshot.data()
      };
      
      return {
        success: true,
        data: usuario
      };
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      return {
        success: false,
        error: "Error al obtener información del usuario"
      };
    }
  }
  
  /**
   * Obtiene estadísticas de rendimiento por departamento
   * @param {Array} reportes - Array de reportes
   * @returns {Object} - Estadísticas de rendimiento
   */
  obtenerEstadisticasRendimiento(reportes) {
    const departamentos = {
      'Basura Acumulada': { 
        id: 'basura',
        nombre: 'Basura Acumulada',
        total: 0,
        resueltos: 0,
        enProceso: 0,
        pendientes: 0,
        tiempoPromedio: 0,
        tiempoTotal: 0,
        eficiencia: 0,
        valoraciones: []
      },
      'Alumbrado Público': { 
        id: 'alumbrado',
        nombre: 'Alumbrado Público',
        total: 0,
        resueltos: 0,
        enProceso: 0,
        pendientes: 0,
        tiempoPromedio: 0,
        tiempoTotal: 0,
        eficiencia: 0,
        valoraciones: []
      },
      'Drenajes Obstruidos': { 
        id: 'drenaje',
        nombre: 'Drenajes Obstruidos',
        total: 0,
        resueltos: 0,
        enProceso: 0,
        pendientes: 0,
        tiempoPromedio: 0,
        tiempoTotal: 0,
        eficiencia: 0,
        valoraciones: []
      },
      'Bacheo': { 
        id: 'bacheo',
        nombre: 'Bacheo',
        total: 0,
        resueltos: 0,
        enProceso: 0,
        pendientes: 0,
        tiempoPromedio: 0,
        tiempoTotal: 0,
        eficiencia: 0,
        valoraciones: []
      }
    };
    
    // Procesar cada reporte para las estadísticas
    reportes.forEach(reporte => {
      const { categoria } = reporte;
      
      // Si no es una categoría que estamos siguiendo, ignorar
      if (!departamentos[categoria]) return;
      
      const depto = departamentos[categoria];
      depto.total++;
      
      // Contabilizar por estatus
      if (reporte.estatus === 'resuelto') {
        depto.resueltos++;
        
        // Si tiene tiempo de resolución, sumarlo
        if (reporte.tiempoResolucion) {
          depto.tiempoTotal += reporte.tiempoResolucion;
        }
      } else if (reporte.estatus === 'pendiente') {
        depto.pendientes++;
      } else if (reporte.estatus === 'en_proceso') {
        depto.enProceso++;
      }
      
      // Agregar valoración si existe
      if (reporte.valoracion && !isNaN(reporte.valoracion)) {
        depto.valoraciones.push(parseFloat(reporte.valoracion));
      }
    });
    
    // Calcular promedios y métricas finales
    Object.values(departamentos).forEach(depto => {
      // Eficiencia (porcentaje de reportes resueltos)
      depto.eficiencia = depto.total > 0 ? 
        (depto.resueltos / depto.total) * 100 : 0;
      
      // Tiempo promedio de resolución
      depto.tiempoPromedio = depto.resueltos > 0 ? 
        depto.tiempoTotal / depto.resueltos : 0;
      
      // Valoración promedio
      const sumaValoraciones = depto.valoraciones.reduce((sum, val) => sum + val, 0);
      depto.valoracionPromedio = depto.valoraciones.length > 0 ? 
        sumaValoraciones / depto.valoraciones.length : 0;
    });
    
    return Object.values(departamentos);
  }
  
  /**
   * Obtiene estadísticas de rendimiento por empleado
   * @param {Array} reportes - Array de reportes
   * @returns {Array} - Lista de rendimiento de empleados
   */
  obtenerRendimientoEmpleados(reportes) {
    const empleados = {};
    
    // Procesar cada reporte
    reportes.forEach(reporte => {
      // Si no tiene responsable, no podemos contabilizarlo
      if (!reporte.responsable) return;
      
      const responsable = reporte.responsable;
      
      // Inicializar contadores si es la primera vez que vemos a este empleado
      if (!empleados[responsable]) {
        empleados[responsable] = {
          nombre: responsable,
          departamento: reporte.categoria || 'No especificado',
          total: 0,
          resueltos: 0,
          pendientes: 0,
          enProceso: 0,
          tiempoTotal: 0,
          valoraciones: []
        };
      }
      
      const emp = empleados[responsable];
      emp.total++;
      
      // Contabilizar por estatus
      if (reporte.estatus === 'resuelto') {
        emp.resueltos++;
        
        // Si tiene tiempo de resolución, sumarlo
        if (reporte.tiempoResolucion) {
          emp.tiempoTotal += reporte.tiempoResolucion;
        }
      } else if (reporte.estatus === 'pendiente') {
        emp.pendientes++;
      } else if (reporte.estatus === 'en_proceso') {
        emp.enProceso++;
      }
      
      // Agregar valoración si existe
      if (reporte.valoracion && !isNaN(reporte.valoracion)) {
        emp.valoraciones.push(parseFloat(reporte.valoracion));
      }
    });
    
    // Calcular promedios y métricas finales
    Object.values(empleados).forEach(emp => {
      // Eficiencia (porcentaje de reportes resueltos)
      emp.eficiencia = emp.total > 0 ? 
        (emp.resueltos / emp.total) * 100 : 0;
      
      // Tiempo promedio de resolución
      emp.tiempoPromedio = emp.resueltos > 0 ? 
        emp.tiempoTotal / emp.resueltos : 0;
      
      // Valoración promedio
      const sumaValoraciones = emp.valoraciones.reduce((sum, val) => sum + val, 0);
      emp.valoracionPromedio = emp.valoraciones.length > 0 ? 
        sumaValoraciones / emp.valoraciones.length : 0;
    });
    
    // Convertir a array y ordenar por eficiencia
    return Object.values(empleados)
      .sort((a, b) => b.eficiencia - a.eficiencia);
  }
  
  /**
   * Obtiene estadísticas temporales de reportes
   * @param {Array} reportes - Array de reportes
   * @param {number} periodoSemanas - Número de semanas a analizar
   * @returns {Object} - Estadísticas temporales
   */
  obtenerEstadisticasTemporales(reportes, periodoSemanas = 12) {
    // Estructuras para almacenar las estadísticas
    const estadisticasSemanal = [];
    const estadisticasMensual = [];
    
    // Fecha actual para cálculos
    const fechaActual = new Date();
    
    // Generar estadísticas semanales
    for (let i = 0; i < periodoSemanas; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setDate(fechaActual.getDate() - (i * 7));
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - 7);
      
      const reportesSemana = reportes.filter(reporte => {
        const fechaReporte = reporte.fechaObj;
        return fechaReporte >= fechaInicio && fechaReporte <= fechaFin;
      });
      
      // Contadores por categoría y estatus
      const contadores = {
        basura: 0,
        alumbrado: 0,
        drenaje: 0,
        bacheo: 0,
        total: reportesSemana.length,
        resueltos: 0,
        pendientes: 0,
        enProceso: 0
      };
      
      // Procesar cada reporte de la semana
      reportesSemana.forEach(reporte => {
        // Contar por categoría
        if (reporte.categoria === 'Basura Acumulada') {
          contadores.basura++;
        } else if (reporte.categoria === 'Alumbrado Público') {
          contadores.alumbrado++;
        } else if (reporte.categoria === 'Drenajes Obstruidos') {
          contadores.drenaje++;
        } else if (reporte.categoria === 'Bacheo') {
          contadores.bacheo++;
        }
        
        // Contar por estatus
        if (reporte.estatus === 'resuelto') {
          contadores.resueltos++;
        } else if (reporte.estatus === 'pendiente') {
          contadores.pendientes++;
        } else if (reporte.estatus === 'en_proceso') {
          contadores.enProceso++;
        }
      });
      
      // Formatear nombre de la semana
      const nombreSemana = `Sem ${periodoSemanas - i}`;
      
      // Agregar al array de estadísticas semanales
      estadisticasSemanal.push({
        name: nombreSemana,
        fechaInicio,
        fechaFin,
        ...contadores
      });
    }
    
    // Generar estadísticas mensuales (6 meses)
    for (let i = 0; i < 6; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setMonth(fechaActual.getMonth() - i);
      fechaFin.setDate(0); // Último día del mes anterior
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(1); // Primer día del mes
      
      const reportesMes = reportes.filter(reporte => {
        const fechaReporte = reporte.fechaObj;
        return fechaReporte >= fechaInicio && fechaReporte <= fechaFin;
      });
      
      // Nombre del mes
      const nombreMes = fechaInicio.toLocaleString('default', { month: 'short' });
      
      // Contadores por categoría y estatus (igual que en semanal)
      const contadores = {
        basura: 0,
        alumbrado: 0,
        drenaje: 0,
        bacheo: 0,
        total: reportesMes.length,
        resueltos: 0,
        pendientes: 0,
        enProceso: 0
      };
      
      // Procesar cada reporte del mes
      reportesMes.forEach(reporte => {
        // Contar por categoría
        if (reporte.categoria === 'Basura Acumulada') {
          contadores.basura++;
        } else if (reporte.categoria === 'Alumbrado Público') {
          contadores.alumbrado++;
        } else if (reporte.categoria === 'Drenajes Obstruidos') {
          contadores.drenaje++;
        } else if (reporte.categoria === 'Bacheo') {
          contadores.bacheo++;
        }
        
        // Contar por estatus
        if (reporte.estatus === 'resuelto') {
          contadores.resueltos++;
        } else if (reporte.estatus === 'pendiente') {
          contadores.pendientes++;
        } else if (reporte.estatus === 'en_proceso') {
          contadores.enProceso++;
        }
      });
      
      // Agregar al array de estadísticas mensuales
      estadisticasMensual.push({
        name: nombreMes,
        fechaInicio,
        fechaFin,
        ...contadores
      });
    }
    
    return {
      semanal: estadisticasSemanal.reverse(),
      mensual: estadisticasMensual.reverse()
    };
  }
  
  /**
   * Obtiene datos para el análisis comparativo entre departamentos
   * @param {Array} reportes - Array de reportes
   * @returns {Object} - Datos comparativos
   */
  obtenerDatosComparativos(reportes) {
    // Obtener primero las estadísticas de rendimiento
    const estadisticasDepartamentos = this.obtenerEstadisticasRendimiento(reportes);
    
    // Métricas para comparar
    const metricas = ['eficiencia', 'tiempoPromedio', 'valoracionPromedio'];
    const resultados = {};
    
    // Para cada métrica, ordenar departamentos
    metricas.forEach(metrica => {
      // Clonar y ordenar el array por la métrica actual
      const ordenados = [...estadisticasDepartamentos]
        .sort((a, b) => {
          // Ordenar de manera diferente según el caso
          if (metrica === 'tiempoPromedio') {
            // Para tiempos, menor es mejor
            return a[metrica] - b[metrica];
          } else {
            // Para el resto, mayor es mejor
            return b[metrica] - a[metrica];
          }
        });
      
      resultados[metrica] = ordenados.map(dept => ({
        name: dept.nombre,
        id: dept.id,
        valor: dept[metrica]
      }));
    });
    
    // Preparar datos para gráficos de radar
    const datosRadar = estadisticasDepartamentos.map(dept => {
      // Normalizar valores para el radar (0-100)
      return {
        name: dept.nombre,
        eficiencia: dept.eficiencia,
        velocidad: dept.tiempoPromedio > 0 ? 
          100 - Math.min(dept.tiempoPromedio * 10, 100) : 0, // Invertir para que menos tiempo sea mejor
        valoracion: dept.valoracionPromedio * 20, // Escalar de 0-5 a 0-100
        volumen: Math.min((dept.total / 10) * 100, 100) // Normalizar volumen
      };
    });
    
    return {
      rankings: resultados,
      radar: datosRadar
    };
  }
  
  /**
   * Obtener indicadores clave de rendimiento (KPIs)
   * @param {Array} reportes - Array de reportes
   * @returns {Object} - Indicadores KPI
   */
  obtenerKPIs(reportes) {
    // Total de reportes
    const totalReportes = reportes.length;
    
    // Reportes resueltos
    const reportesResueltos = reportes.filter(r => r.estatus === 'resuelto').length;
    
    // Tasa de resolución
    const tasaResolucion = totalReportes > 0 ? 
      (reportesResueltos / totalReportes) * 100 : 0;
    
    // Tiempo promedio de resolución
    let tiempoTotalResolucion = 0;
    let contadorReportesConTiempo = 0;
    
    reportes.forEach(reporte => {
      if (reporte.tiempoResolucion) {
        tiempoTotalResolucion += reporte.tiempoResolucion;
        contadorReportesConTiempo++;
      }
    });
    
    const tiempoPromedioResolucion = contadorReportesConTiempo > 0 ? 
      tiempoTotalResolucion / contadorReportesConTiempo : 0;
    
    // Valoración promedio de satisfacción
    let valoracionTotal = 0;
    let contadorValoraciones = 0;
    
    reportes.forEach(reporte => {
      if (reporte.valoracion && !isNaN(reporte.valoracion)) {
        valoracionTotal += parseFloat(reporte.valoracion);
        contadorValoraciones++;
      }
    });
    
    const satisfaccionPromedio = contadorValoraciones > 0 ? 
      valoracionTotal / contadorValoraciones : 0;
    
    // Reportes por estatus
    const estatusCounts = {
      pendiente: 0,
      en_proceso: 0,
      resuelto: 0,
      cancelado: 0
    };
    
    reportes.forEach(reporte => {
      if (estatusCounts.hasOwnProperty(reporte.estatus)) {
        estatusCounts[reporte.estatus]++;
      }
    });
    
    return {
      totalReportes,
      reportesResueltos,
      tasaResolucion,
      tiempoPromedioResolucion,
      satisfaccionPromedio,
      estatusCounts
    };
  }
}

export default new EstadisticasControllerExtendido();