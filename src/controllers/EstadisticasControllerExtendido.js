// src/controllers/EstadisticasControllerExtendido.js
import { db } from '../models/firebase';
import { 
  collection, getDocs, query, where, 
  Timestamp, orderBy, limit, doc, getDoc,
  startAt, endAt
} from 'firebase/firestore';

// Implementación de un sistema de caché para evitar consultas repetidas
const cache = {
  reportes: {},
  lastFetch: {},
  ttl: 5 * 60 * 1000, // Tiempo de vida del caché: 5 minutos
};

// Constantes para normalización
const MAPEO_CATEGORIAS = {
  'Basura': 'Basura Acumulada',
  'Alumbrado': 'Alumbrado Público',
  'Drenaje': 'Drenajes Obstruidos'
};

class EstadisticasControllerExtendido {
  
  // Obtener reportes detallados para una ciudad específica con optimizaciones
  async obtenerReportesDetallados(ciudad = 'Chetumal', opciones = {}) {
    try {
      const cacheKey = `${ciudad}-detallados`;
      
      // Verificar si hay datos en caché y si están vigentes
      if (opciones.usarCache && 
          cache.reportes[cacheKey] && 
          (Date.now() - cache.lastFetch[cacheKey]) < cache.ttl) {
        console.log("Usando datos de caché para:", cacheKey);
        return {
          success: true,
          data: cache.reportes[cacheKey],
          fromCache: true
        };
      }
      
      // Construir una consulta optimizada
      const reportesRef = collection(db, "reportes");
      
      // Aplicar filtros en la consulta de Firestore en lugar de filtrar después
      let reportesQuery = reportesRef;
      
      // Filtrar por ciudad
      if (ciudad) {
        // La consulta directa por ciudad no es posible si no hay un campo específico
        // Si existe un campo ciudad, podríamos usar:
        // reportesQuery = query(reportesQuery, where("ciudad", "==", ciudad));
      }
      
      // Obtener documentos
      console.log("Ejecutando consulta a Firestore");
      const snapshot = await getDocs(reportesQuery);
      
      // Optimizar el procesamiento de los datos
      const todosReportes = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Extraer colonia y calle de la dirección de forma eficiente
        let colonia = "No especificada";
        let calle = "No especificada";
        
        if (data.direccion) {
          // Extraer colonia y calle usando una sola operación de split
          const partesDireccion = data.direccion.split(',').map(p => p.trim());
          if (partesDireccion.length >= 2) {
            calle = partesDireccion[0];
            colonia = partesDireccion[1];
          } else if (partesDireccion.length === 1) {
            calle = partesDireccion[0];
          }
        }
        
        // Convertir timestamp a fecha más eficientemente
        let fecha = null;
        if (data.fechaCreacion) {
          if (data.fechaCreacion.seconds) {
            fecha = new Date(data.fechaCreacion.seconds * 1000);
          } else {
            fecha = new Date(data.fechaCreacion);
          }
        } else if (data.fecha) {
          if (data.fecha.seconds) {
            fecha = new Date(data.fecha.seconds * 1000);
          } else {
            fecha = new Date(data.fecha);
          }
        } else {
          fecha = new Date();
        }
        
        // Pre-normalizar categorías comunes para evitar procesamiento posterior
        let categoria = data.categoria;
        if (MAPEO_CATEGORIAS[categoria]) {
          categoria = MAPEO_CATEGORIAS[categoria];
        }
        
        // Pre-calcular tiempos de resolución
        let tiempoResolucion = null;
        if (data.fechaResolucion && fecha) {
          try {
            const fechaResolucion = data.fechaResolucion.seconds ? 
              new Date(data.fechaResolucion.seconds * 1000) : 
              new Date(data.fechaResolucion);
            
            tiempoResolucion = (fechaResolucion - fecha) / (1000 * 60 * 60 * 24);
          } catch (e) {
            console.error("Error al calcular tiempo de resolución:", e);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          colonia,
          calle,
          categoria, // Categoría normalizada
          fechaObj: fecha,
          fechaFormateada: fecha.toLocaleDateString(),
          tiempoResolucion
        };
      });
      
      // Filtrar por dirección que contiene la ciudad
      // Esta parte sigue siendo necesaria ya que no podemos filtrar esto en Firestore fácilmente
      const reportesFiltradosPorCiudad = todosReportes.filter(reporte => {
        if (!reporte.direccion) return false;
        return reporte.direccion.toLowerCase().includes(ciudad.toLowerCase());
      });
      
      console.log(`Reportes obtenidos: ${reportesFiltradosPorCiudad.length} de ${todosReportes.length} totales`);
      
      // Guardar en caché los resultados
      cache.reportes[cacheKey] = reportesFiltradosPorCiudad;
      cache.lastFetch[cacheKey] = Date.now();
      
      return {
        success: true,
        data: reportesFiltradosPorCiudad
      };
    } catch (error) {
      console.error("Error al obtener reportes detallados:", error);
      return {
        success: false,
        error: "Error al obtener reportes. Intente nuevamente más tarde."
      };
    }
  }
  
  // Obtener reportes filtrados aplicando filtros en la consulta cuando sea posible
  async obtenerReportesFiltrados(ciudad, filtros) {
    try {
      const { categoria, fechaInicio, fechaFin, estatus } = filtros;
      
      // Clave de caché que incluya los filtros
      const cacheKey = `${ciudad}-${categoria}-${fechaInicio}-${fechaFin}-${estatus}`;
      
      // Verificar caché
      if (cache.reportes[cacheKey] && 
          (Date.now() - cache.lastFetch[cacheKey]) < cache.ttl) {
        console.log("Usando datos filtrados de caché para:", cacheKey);
        return {
          success: true,
          data: cache.reportes[cacheKey],
          fromCache: true
        };
      }
      
      // Crear consulta base
      const reportesRef = collection(db, "reportes");
      let reportesQuery = reportesRef;
      
      // Aplicar filtros en la consulta de Firestore
      const filtrosAplicados = [];
      
      // Filtro por categoría
      if (categoria !== 'todos') {
        const categoriaReal = this._obtenerCategoriaReal(categoria);
        reportesQuery = query(reportesQuery, where("categoria", "==", categoriaReal));
        filtrosAplicados.push(`categoría: ${categoriaReal}`);
      }
      
      // Filtro por fechas
      if (fechaInicio && fechaFin) {
        const fechaInicioDate = new Date(fechaInicio);
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999); // Final del día
        
        const timestampInicio = Timestamp.fromDate(fechaInicioDate);
        const timestampFin = Timestamp.fromDate(fechaFinDate);
        
        // Intentar filtrar por fechaCreacion (o el campo que use tu base de datos)
        reportesQuery = query(
          reportesQuery, 
          where("fechaCreacion", ">=", timestampInicio),
          where("fechaCreacion", "<=", timestampFin)
        );
        
        filtrosAplicados.push(`período: ${fechaInicioDate.toLocaleDateString()} - ${fechaFinDate.toLocaleDateString()}`);
      }
      
      // Filtro por estatus
      if (estatus !== 'todos') {
        reportesQuery = query(reportesQuery, where("estatus", "==", estatus));
        filtrosAplicados.push(`estatus: ${estatus}`);
      }
      
      // Ejecutar la consulta
      console.log(`Ejecutando consulta con filtros: ${filtrosAplicados.join(', ')}`);
      const snapshot = await getDocs(reportesQuery);
      
      // Procesar resultados
      const reportesFiltrados = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Aplicar todas las transformaciones similares a obtenerReportesDetallados
        const reporte = this._procesarDocumentoReporte(doc.id, data);
        
        return reporte;
      });
      
      // Filtro final por ciudad (si es necesario)
      const resultadoFinal = ciudad ? 
        reportesFiltrados.filter(reporte => 
          reporte.direccion && reporte.direccion.toLowerCase().includes(ciudad.toLowerCase())
        ) : 
        reportesFiltrados;
      
      // Almacenar en caché
      cache.reportes[cacheKey] = resultadoFinal;
      cache.lastFetch[cacheKey] = Date.now();
      
      return {
        success: true,
        data: resultadoFinal,
        filtrosAplicados
      };
    } catch (error) {
      console.error("Error al obtener reportes filtrados:", error);
      return {
        success: false,
        error: "Error al filtrar reportes. Por favor intente nuevamente."
      };
    }
  }
  
  // Método para obtener estadísticas optimizadas
  async obtenerEstadisticasRapidas(ciudad, periodo = 'todo') {
    try {
      const cacheKey = `${ciudad}-estadisticas-${periodo}`;
      
      // Verificar caché
      if (cache.reportes[cacheKey] && 
          (Date.now() - cache.lastFetch[cacheKey]) < cache.ttl) {
        return {
          success: true,
          data: cache.reportes[cacheKey],
          fromCache: true
        };
      }
      
      // Obtener reportes (posiblemente de caché)
      const resultado = await this.obtenerReportesDetallados(ciudad, { usarCache: true });
      
      if (!resultado.success) {
        return resultado;
      }
      
      const reportes = resultado.data;
      
      // Aplicar filtro de período
      let reportesFiltrados = [...reportes];
      
      if (periodo !== 'todo') {
        const hoy = new Date();
        let fechaInicio = new Date();
        
        switch (periodo) {
          case 'semana':
            fechaInicio.setDate(hoy.getDate() - 7);
            break;
          case 'mes':
            fechaInicio.setMonth(hoy.getMonth() - 1);
            break;
          case 'trimestre':
            fechaInicio.setMonth(hoy.getMonth() - 3);
            break;
          case 'anio':
            fechaInicio.setFullYear(hoy.getFullYear() - 1);
            break;
        }
        
        reportesFiltrados = reportesFiltrados.filter(reporte => reporte.fechaObj >= fechaInicio);
      }
      
      // Calcular estadísticas rápidas
      const estadisticas = this._calcularEstadisticasRapidas(reportesFiltrados);
      
      // Guardar en caché
      cache.reportes[cacheKey] = estadisticas;
      cache.lastFetch[cacheKey] = Date.now();
      
      return {
        success: true,
        data: estadisticas
      };
    } catch (error) {
      console.error("Error al obtener estadísticas rápidas:", error);
      return {
        success: false,
        error: "Error al calcular estadísticas. Intente nuevamente."
      };
    }
  }
  
  // Procesar un documento de reporte - método auxiliar para evitar duplicar código
  _procesarDocumentoReporte(id, data) {
    // Extraer colonia y calle
    let colonia = "No especificada";
    let calle = "No especificada";
    
    if (data.direccion) {
      const partesDireccion = data.direccion.split(',').map(p => p.trim());
      if (partesDireccion.length >= 2) {
        calle = partesDireccion[0];
        colonia = partesDireccion[1];
      } else if (partesDireccion.length === 1) {
        calle = partesDireccion[0];
      }
    }
    
    // Convertir timestamp a fecha
    let fecha = null;
    if (data.fechaCreacion) {
      fecha = data.fechaCreacion.seconds ? 
        new Date(data.fechaCreacion.seconds * 1000) : 
        new Date(data.fechaCreacion);
    } else if (data.fecha) {
      fecha = data.fecha.seconds ? 
        new Date(data.fecha.seconds * 1000) : 
        new Date(data.fecha);
    } else {
      fecha = new Date();
    }
    
    // Normalizar categoría
    let categoria = data.categoria;
    if (MAPEO_CATEGORIAS[categoria]) {
      categoria = MAPEO_CATEGORIAS[categoria];
    }
    
    // Calcular tiempo de resolución
    let tiempoResolucion = null;
    if (data.fechaResolucion && fecha) {
      try {
        const fechaResolucion = data.fechaResolucion.seconds ? 
          new Date(data.fechaResolucion.seconds * 1000) : 
          new Date(data.fechaResolucion);
        
        tiempoResolucion = (fechaResolucion - fecha) / (1000 * 60 * 60 * 24);
      } catch (e) {
        console.error("Error al calcular tiempo de resolución:", e);
      }
    }
    
    return {
      id,
      ...data,
      colonia,
      calle,
      categoria,
      fechaObj: fecha,
      fechaFormateada: fecha.toLocaleDateString(),
      tiempoResolucion
    };
  }
  
  // Obtener categoría real a partir de identificador
  _obtenerCategoriaReal(idCategoria) {
    const mapeoCategoriasAValoresReales = {
      'basura': 'Basura Acumulada',
      'alumbrado': 'Alumbrado Público',
      'drenaje': 'Drenajes Obstruidos',
      'bacheo': 'Bacheo'
    };
    
    return mapeoCategoriasAValoresReales[idCategoria] || idCategoria;
  }
  
  // Calcular estadísticas rápidas
  _calcularEstadisticasRapidas(reportes) {
    // Preparar estructura para estadísticas
    const estadisticas = {
      totalReportes: reportes.length,
      porCategoria: {
        'Basura Acumulada': 0,
        'Alumbrado Público': 0,
        'Drenajes Obstruidos': 0,
        'Bacheo': 0
      },
      porEstatus: {
        pendiente: 0,
        en_proceso: 0,
        resuelto: 0,
        cancelado: 0
      },
      tiempoPromedioResolucion: 0,
      eficienciaTotal: 0,
      reportesPorColonia: {},
      coloniaMasAfectada: null,
      ultimosReportes: []
    };
    
    // Maps para conteos más eficientes
    const conteoColonias = new Map();
    let tiempoTotalResolucion = 0;
    let reportesResueltos = 0;
    
    // Procesar cada reporte una sola vez
    reportes.forEach(reporte => {
      // Contar por categoría
      if (estadisticas.porCategoria.hasOwnProperty(reporte.categoria)) {
        estadisticas.porCategoria[reporte.categoria]++;
      }
      
      // Contar por estatus
      const estatus = reporte.estatus || reporte.estado || 'pendiente';
      if (estatus === 'pendiente') {
        estadisticas.porEstatus.pendiente++;
      } else if (estatus === 'en_proceso' || estatus === 'en proceso') {
        estadisticas.porEstatus.en_proceso++;
      } else if (estatus === 'resuelto' || estatus === 'completado') {
        estadisticas.porEstatus.resuelto++;
        
        // Sumar tiempo de resolución
        if (reporte.tiempoResolucion) {
          tiempoTotalResolucion += reporte.tiempoResolucion;
          reportesResueltos++;
        }
      } else if (estatus === 'cancelado') {
        estadisticas.porEstatus.cancelado++;
      }
      
      // Contar por colonia
      if (reporte.colonia && reporte.colonia !== "No especificada") {
        conteoColonias.set(
          reporte.colonia, 
          (conteoColonias.get(reporte.colonia) || 0) + 1
        );
      }
    });
    
    // Calcular tiempo promedio de resolución
    estadisticas.tiempoPromedioResolucion = reportesResueltos > 0 ? 
      (tiempoTotalResolucion / reportesResueltos).toFixed(1) : 0;
    
    // Calcular eficiencia total
    estadisticas.eficienciaTotal = reportes.length > 0 ? 
      ((estadisticas.porEstatus.resuelto / reportes.length) * 100).toFixed(1) : 0;
    
    // Obtener reportes por colonia y la colonia más afectada
    estadisticas.reportesPorColonia = Object.fromEntries(conteoColonias);
    
    let maxAfectacion = 0;
    conteoColonias.forEach((cantidad, colonia) => {
      if (cantidad > maxAfectacion) {
        maxAfectacion = cantidad;
        estadisticas.coloniaMasAfectada = colonia;
      }
    });
    
    // Obtener últimos reportes (los más recientes)
    estadisticas.ultimosReportes = [...reportes]
      .sort((a, b) => b.fechaObj - a.fechaObj)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        categoria: r.categoria,
        direccion: r.direccion,
        estatus: r.estatus || r.estado,
        fecha: r.fechaFormateada
      }));
    
    return estadisticas;
  }
  
  // Método para limpiar caché
  limpiarCache() {
    cache.reportes = {};
    cache.lastFetch = {};
    console.log("Caché limpiado completamente");
  }
  
  // Método para invalidar una entrada específica de caché
  invalidarCache(ciudad) {
    // Eliminar todas las entradas relacionadas con esta ciudad
    Object.keys(cache.reportes).forEach(key => {
      if (key.startsWith(ciudad)) {
        delete cache.reportes[key];
        delete cache.lastFetch[key];
      }
    });
    console.log(`Caché invalidado para: ${ciudad}`);
  }
}

export default new EstadisticasControllerExtendido();