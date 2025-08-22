// src/controllers/ExportController.js
import * as XLSX from 'xlsx';

class ExportController {
  
  /**
   * Exportar datos del dashboard a Excel con múltiples hojas
   */
  static exportarDashboardAExcel(datos, nombreArchivo = 'dashboard_departamentos') {
    try {
      const {
        resumenesDepartamentos,
        tiemposResolucion,
        tendenciasSemanal,
        tendenciasMensual,
        comparativoDepartamentos,
        reportesRaw,
        reportesFiltrados, // Agregamos los reportes ya filtrados
        filtrosAplicados
      } = datos;

      // Crear un nuevo libro de trabajo
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen Ejecutivo (ahora con reportes filtrados)
      const resumenEjecutivo = this._crearHojaResumenEjecutivo(
        resumenesDepartamentos, 
        filtrosAplicados,
        reportesFiltrados || reportesRaw // Usar reportes filtrados si están disponibles
      );
      XLSX.utils.book_append_sheet(workbook, resumenEjecutivo, 'Resumen Ejecutivo');

      // Hoja 2: Comparativo Departamentos
      if (comparativoDepartamentos && comparativoDepartamentos.length > 0) {
        const hojaComparativo = this._crearHojaComparativo(comparativoDepartamentos);
        XLSX.utils.book_append_sheet(workbook, hojaComparativo, 'Comparativo Departamentos');
      }

      // Hoja 3: Tiempos de Resolución Semanal
      if (tiemposResolucion && tiemposResolucion.length > 0) {
        const hojaTiempos = this._crearHojaTiempos(tiemposResolucion);
        XLSX.utils.book_append_sheet(workbook, hojaTiempos, 'Tiempos Semanales');
      }

      // Hoja 4: Tendencias Semanales
      if (tendenciasSemanal && tendenciasSemanal.length > 0) {
        const hojaTendencias = this._crearHojaTendencias(tendenciasSemanal, 'semanal');
        XLSX.utils.book_append_sheet(workbook, hojaTendencias, 'Tendencias Semanales');
      }

      // Hoja 5: Tendencias Mensuales
      if (tendenciasMensual && tendenciasMensual.length > 0) {
        const hojaTendenciasMensual = this._crearHojaTendencias(tendenciasMensual, 'mensual');
        XLSX.utils.book_append_sheet(workbook, hojaTendenciasMensual, 'Tendencias Mensuales');
      }

      // Hoja 6: Datos Detallados (opcional, si hay reportes)
      if (reportesRaw && reportesRaw.length > 0) {
        const hojaDetallada = this._crearHojaDetallada(reportesRaw);
        XLSX.utils.book_append_sheet(workbook, hojaDetallada, 'Datos Detallados');
      }

      // Hoja 7: Metadatos y Configuración
      const hojaMetadatos = this._crearHojaMetadatos(filtrosAplicados);
      XLSX.utils.book_append_sheet(workbook, hojaMetadatos, 'Información del Reporte');

      // Generar el archivo y descargarlo
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivoFinal = `${nombreArchivo}_${fechaActual}.xlsx`;
      
      XLSX.writeFile(workbook, nombreArchivoFinal);
      
      return {
        success: true,
        mensaje: `Archivo "${nombreArchivoFinal}" descargado exitosamente`
      };
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      return {
        success: false,
        error: 'Error al generar el archivo Excel. Intente nuevamente.'
      };
    }
  }

  /**
   * Crear hoja de resumen ejecutivo
   */
  static _crearHojaResumenEjecutivo(resumenesDepartamentos, filtrosAplicados, reportesFiltrados = []) {
    const datos = [];

    // Título y fecha
    datos.push(['REPORTE EJECUTIVO - DASHBOARD DE DEPARTAMENTOS']);
    datos.push(['Fecha de generación:', new Date().toLocaleDateString('es-MX')]);
    datos.push(['']); // Línea vacía

    // Filtros aplicados
    if (filtrosAplicados && Object.keys(filtrosAplicados).length > 0) {
      datos.push(['FILTROS APLICADOS:']);
      
      // Mostrar filtros básicos primero
      const filtrosBasicos = ['Ciudad', 'Departamento', 'Fecha Inicio', 'Fecha Fin', 'Estatus'];
      filtrosBasicos.forEach(filtro => {
        if (filtrosAplicados[filtro]) {
          datos.push([filtro, filtrosAplicados[filtro]]);
        }
      });
      
      datos.push(['']); // Línea vacía
    }

    // Resumen general basado SOLO en reportes filtrados
    const totalReportesFiltrados = reportesFiltrados.length;
    const totalResueltosFromFiltered = reportesFiltrados.filter(r => {
      const estado = r.estatus || r.estado || '';
      return estado === 'resuelto' || estado === 'completado';
    }).length;
    const eficienciaGeneral = totalReportesFiltrados > 0 ? 
      ((totalResueltosFromFiltered / totalReportesFiltrados) * 100).toFixed(1) : 0;

    datos.push(['RESUMEN GENERAL:']);
    datos.push(['Total de Reportes:', totalReportesFiltrados]);
    datos.push(['Reportes Resueltos:', totalResueltosFromFiltered]);
    datos.push(['Eficiencia General:', `${eficienciaGeneral}%`]);
    datos.push(['']); // Línea vacía

    // Headers para tabla de departamentos
    datos.push([
      'Departamento',
      'Total Reportes',
      'Pendientes',
      'En Proceso',
      'Resueltos',
      'Cancelados',
      'Eficiencia (%)',
      'Tiempo Promedio (días)',
      'Valoración Promedio'
    ]);

    // Datos de departamentos
    resumenesDepartamentos.forEach(dept => {
      datos.push([
        dept.nombre,
        dept.total,
        dept.pendientes,
        dept.en_proceso,
        dept.resueltos,
        dept.cancelados,
        parseFloat(dept.eficiencia),
        parseFloat(dept.tiempoPromedio),
        parseFloat(dept.valoracionPromedio || 0)
      ]);
    });

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Crear hoja comparativo de departamentos
   */
  static _crearHojaComparativo(comparativoDepartamentos) {
    const datos = [];

    datos.push(['COMPARATIVO DE DEPARTAMENTOS']);
    datos.push(['']); // Línea vacía

    // Headers
    datos.push([
      'Departamento',
      'Total Reportes',
      'Reportes Resueltos',
      'Porcentaje Resolución (%)',
      'Tiempo Promedio (días)',
      'Valoración Promedio'
    ]);

    // Datos
    comparativoDepartamentos.forEach(dept => {
      datos.push([
        dept.name,
        dept.reportes,
        dept.resueltos,
        parseFloat(dept.porcentaje),
        parseFloat(dept.tiempoPromedio),
        parseFloat(dept.valoracion || 0)
      ]);
    });

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Crear hoja de tiempos de resolución
   */
  static _crearHojaTiempos(tiemposResolucion) {
    const datos = [];

    datos.push(['TIEMPOS DE RESOLUCIÓN POR SEMANA']);
    datos.push(['']); // Línea vacía

    // Headers
    datos.push([
      'Semana',
      'Basura Acumulada (días)',
      'Alumbrado Público (días)',
      'Drenajes Obstruidos (días)',
      'Bacheo (días)'
    ]);

    // Datos
    tiemposResolucion.forEach(semana => {
      datos.push([
        semana.semana,
        semana.Basura || 0,
        semana.Alumbrado || 0,
        semana.Drenaje || 0,
        semana.Bacheo || 0
      ]);
    });

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Crear hoja de tendencias
   */
  static _crearHojaTendencias(tendencias, tipo) {
    const datos = [];

    datos.push([`TENDENCIAS ${tipo.toUpperCase()}`]);
    datos.push(['']); // Línea vacía

    // Headers dinámicos según el tipo
    const headers = [
      tipo === 'semanal' ? 'Semana' : 'Mes',
      'Total Reportes',
      'Reportes Resueltos',
      'Reportes Pendientes',
      'Basura Acumulada',
      'Alumbrado Público',
      'Drenajes Obstruidos',
      'Bacheo',
      'Eficiencia (%)'
    ];

    datos.push(headers);

    // Datos
    tendencias.forEach(periodo => {
      const fila = [
        tipo === 'semanal' ? periodo.semana : periodo.mes,
        periodo.total,
        periodo.resueltos,
        periodo.pendientes,
        periodo.basura,
        periodo.alumbrado,
        periodo.drenaje,
        periodo.bacheo,
        periodo.eficiencia
      ];

      datos.push(fila);
    });

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Crear hoja con datos detallados de reportes
   */
  static _crearHojaDetallada(reportes) {
    const datos = [];

    datos.push(['DATOS DETALLADOS DE REPORTES']);
    datos.push(['']); // Línea vacía

    // Headers
    datos.push([
      'ID',
      'Categoría',
      'Estado',
      'Fecha Creación',
      'Fecha Resolución',
      'Tiempo Resolución (días)',
      'Dirección',
      'Colonia',
      'Valoración',
      'Comentarios'
    ]);

    // Datos de reportes (limitado a los primeros 1000 para performance)
    const reportesLimitados = reportes.slice(0, 1000);
    
    reportesLimitados.forEach(reporte => {
      datos.push([
        reporte.id,
        reporte.categoria,
        reporte.estado || reporte.estatus,
        reporte.fechaFormateada || (reporte.fechaObj ? reporte.fechaObj.toLocaleDateString() : ''),
        reporte.fechaResolucion ? 
          (reporte.fechaResolucion.seconds ? 
            new Date(reporte.fechaResolucion.seconds * 1000).toLocaleDateString() : 
            new Date(reporte.fechaResolucion).toLocaleDateString()) : '',
        reporte.tiempoResolucion || '',
        reporte.direccion || '',
        reporte.colonia || '',
        reporte.valoracion || '',
        reporte.comentario || ''
      ]);
    });

    if (reportes.length > 1000) {
      datos.push(['']); // Línea vacía
      datos.push([`Nota: Se muestran solo los primeros 1000 reportes de ${reportes.length} totales`]);
    }

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Crear hoja de metadatos
   */
  static _crearHojaMetadatos(filtrosAplicados) {
    const datos = [];

    datos.push(['INFORMACIÓN DEL REPORTE']);
    datos.push(['']); // Línea vacía

    // Información general
    datos.push(['Generado por:', 'Sistema de Gestión Municipal']);
    datos.push(['Fecha y hora:', new Date().toLocaleString('es-MX')]);
    datos.push(['Versión:', '1.0']);
    datos.push(['']); // Línea vacía

    // Filtros aplicados
    datos.push(['CONFIGURACIÓN DE FILTROS:']);
    if (filtrosAplicados && Object.keys(filtrosAplicados).length > 0) {
      Object.entries(filtrosAplicados).forEach(([key, value]) => {
        datos.push([key, value]);
      });
    } else {
      datos.push(['Sin filtros específicos aplicados']);
    }
    datos.push(['']); // Línea vacía

    // Descripción de las hojas
    datos.push(['DESCRIPCIÓN DE HOJAS:']);
    datos.push(['Resumen Ejecutivo', 'Vista general con estadísticas principales']);
    datos.push(['Comparativo Departamentos', 'Comparación entre diferentes departamentos']);
    datos.push(['Tiempos Semanales', 'Tiempos de resolución por semana']);
    datos.push(['Tendencias Semanales', 'Evolución semanal de reportes']);
    datos.push(['Tendencias Mensuales', 'Evolución mensual de reportes']);
    datos.push(['Datos Detallados', 'Información completa de reportes']);
    datos.push(['']); // Línea vacía

    // Notas adicionales
    datos.push(['NOTAS:']);
    datos.push(['- Los tiempos se muestran en días']);
    datos.push(['- Las eficiencias se calculan como porcentaje de reportes resueltos']);
    datos.push(['- Las valoraciones van de 1 a 5 estrellas']);

    return XLSX.utils.aoa_to_sheet(datos);
  }

  /**
   * Exportar solo datos de una gráfica específica
   */
  static exportarGraficaEspecifica(datos, nombreGrafica, tipoGrafica = 'tabla') {
    try {
      const workbook = XLSX.utils.book_new();
      
      let hoja;
      switch (tipoGrafica) {
        case 'comparativo':
          hoja = this._crearHojaComparativo(datos);
          break;
        case 'tiempos':
          hoja = this._crearHojaTiempos(datos);
          break;
        case 'tendencias_semanal':
          hoja = this._crearHojaTendencias(datos, 'semanal');
          break;
        case 'tendencias_mensual':
          hoja = this._crearHojaTendencias(datos, 'mensual');
          break;
        default:
          // Crear hoja genérica
          hoja = XLSX.utils.json_to_sheet(datos);
      }

      XLSX.utils.book_append_sheet(workbook, hoja, nombreGrafica);

      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `${nombreGrafica.toLowerCase().replace(/\s+/g, '_')}_${fechaActual}.xlsx`;
      
      XLSX.writeFile(workbook, nombreArchivo);
      
      return {
        success: true,
        mensaje: `Gráfica "${nombreGrafica}" exportada exitosamente`
      };
      
    } catch (error) {
      console.error('Error al exportar gráfica específica:', error);
      return {
        success: false,
        error: 'Error al exportar la gráfica. Intente nuevamente.'
      };
    }
  }
}

export default ExportController;