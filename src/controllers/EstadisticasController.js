// src/controllers/EstadisticasController.js
import { db } from '../models/firebase';
import { collection, getDocs } from 'firebase/firestore';

class EstadisticasController {
  
  // Obtener todos los reportes desde Firebase para una ciudad específica
  async obtenerReportesPorCiudad(ciudad = 'Chetumal') {
    try {
      const reportesRef = collection(db, "reportes");
      const snapshot = await getDocs(reportesRef);
      
      // Ver todas las categorías que existen en la base de datos
      const todasLasCategorias = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.categoria) {
          todasLasCategorias.add(data.categoria);
        }
      });
      console.log("Todas las categorías en la base de datos:", Array.from(todasLasCategorias));
      
      // Transformar documentos en objetos de reporte
      const todosReportes = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Registrar la información de cada reporte para depuración
        console.log(`Reporte ID: ${doc.id}, Categoría: ${data.categoria}, Dirección: ${data.direccion}`);
        
        // Extraer colonia y calle de la dirección
        let colonia = "No especificada";
        let calle = "No especificada";
        
        if (data.direccion) {
          // Intenta extraer colonia de la dirección
          const partesDireccion = data.direccion.split(',').map(p => p.trim());
          if (partesDireccion.length >= 2) {
            calle = partesDireccion[0];
            // La colonia suele ser el segundo componente en México
            colonia = partesDireccion[1];
          } else if (partesDireccion.length === 1) {
            calle = partesDireccion[0];
          }
        }
        
        // Convertir timestamp a fecha
        let fecha = data.fechaCreacion ? 
          new Date(data.fechaCreacion.seconds * 1000) : 
          new Date();
          
        return {
          id: doc.id,
          ...data,
          colonia,
          calle,
          fechaObj: fecha,
          fechaFormateada: fecha.toLocaleDateString()
        };
      });
      
      // Solo incluimos reportes que mencionan Chetumal en la dirección
      const reportesFiltradosPorCiudad = todosReportes.filter(reporte => {
        if (!reporte.direccion) return false;
        return reporte.direccion.toLowerCase().includes(ciudad.toLowerCase());
      });
      
      console.log(`Total de reportes: ${todosReportes.length}, Reportes en ${ciudad}: ${reportesFiltradosPorCiudad.length}`);
      
      return {
        success: true,
        data: reportesFiltradosPorCiudad
      };
    } catch (error) {
      console.error("Error al obtener reportes:", error);
      return {
        success: false,
        error: "Error al obtener reportes. Intente nuevamente."
      };
    }
  }
  
  // Procesar datos de reportes para obtener estadísticas
  procesarEstadisticas(reportes, filtros) {
    // Extraer filtros
    const { categoria, periodo, colonia } = filtros;
    
    // Filtrar reportes según los criterios
    let reportesFiltrados = [...reportes];
    
    console.log("Procesando estadísticas con", reportesFiltrados.length, "reportes");
    
    // Revisar todas las categorías presentes en los datos
    const categoriasPresentes = new Set();
    reportes.forEach(reporte => {
      if (reporte.categoria) {
        categoriasPresentes.add(reporte.categoria);
      }
    });
    console.log("Categorías presentes en los datos:", Array.from(categoriasPresentes));
    
    // Filtro por categoría - CORREGIDO
    if (categoria !== 'todas') {
      // Mapeamos los IDs de categorías a los valores que realmente están en la BD
      // CORRECCIÓN: Ahora "drenaje" mapea a "Drenajes Obstruidos" (en plural)
      const mapeoCategoriasAValoresReales = {
        'basura': 'Basura Acumulada',
        'alumbrado': 'Alumbrado Público',
        'drenaje': 'Drenajes Obstruidos', // Corregido a plural
        'bacheo': 'Bacheo'
      };
      
      const categoriaABuscar = mapeoCategoriasAValoresReales[categoria];
      console.log(`Buscando categoría: "${categoriaABuscar}" (desde ${categoria})`);
      
      reportesFiltrados = reportesFiltrados.filter(reporte => {
        const match = reporte.categoria === categoriaABuscar;
        if (match) {
          console.log(`Coincidencia encontrada para categoría ${categoriaABuscar}: ${reporte.id}`);
        }
        return match;
      });
      
      console.log(`Después de filtrar por categoría ${categoriaABuscar}:`, reportesFiltrados.length);
    }
    
    // Filtro por periodo
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
        default:
          break;
      }
      
      reportesFiltrados = reportesFiltrados.filter(reporte => reporte.fechaObj >= fechaInicio);
      console.log(`Después de filtrar por periodo ${periodo}:`, reportesFiltrados.length);
    }
    
    // Filtro por colonia
    if (colonia !== 'todas') {
      reportesFiltrados = reportesFiltrados.filter(reporte => reporte.colonia === colonia);
      console.log(`Después de filtrar por colonia ${colonia}:`, reportesFiltrados.length);
    }
    
    // Datos para las estadísticas
    const resultado = {
      totalReportes: reportesFiltrados.length,
      reportesPorCategoria: [],
      reportesPorColonia: [],
      reportesPorCalle: [],
      resumenGeneral: {}
    };
    
    // CORRECCIÓN: Categorías específicas según lo solicitado, con nombres exactos
    const categoriasValoresReales = [
      "Basura Acumulada", 
      "Alumbrado Público", 
      "Drenajes Obstruidos", // Corregido a plural
      "Bacheo"
    ];
    
    // Inicializar contador de categorías
    const categoriasCount = {};
    categoriasValoresReales.forEach(cat => {
      categoriasCount[cat] = 0;
    });
    
    // Contar reportes por categoría
    reportesFiltrados.forEach(reporte => {
      if (categoriasValoresReales.includes(reporte.categoria)) {
        categoriasCount[reporte.categoria]++;
      } else {
        console.log(`Categoría no reconocida: "${reporte.categoria}" en reporte ${reporte.id}`);
      }
    });
    
    console.log("Conteo final por categorías:", categoriasCount);
    
    // Convertir a formato para gráficas
    resultado.reportesPorCategoria = Object.keys(categoriasCount)
      .map(key => ({
        name: key,
        value: categoriasCount[key]
      }));
    
    // Contar reportes por colonia
    const coloniasCount = {};
    const coloniasList = new Set();
    
    reportesFiltrados.forEach(reporte => {
      coloniasList.add(reporte.colonia);
      
      if (!coloniasCount[reporte.colonia]) {
        coloniasCount[reporte.colonia] = 0;
      }
      coloniasCount[reporte.colonia]++;
    });
    
    // Ordenar colonias por cantidad de reportes (descendente)
    resultado.reportesPorColonia = Object.keys(coloniasCount)
      .map(key => ({ name: key, value: coloniasCount[key] }))
      .sort((a, b) => b.value - a.value);
    
    // Contar reportes por calle
    const callesCount = {};
    const callesList = new Set();
    
    reportesFiltrados.forEach(reporte => {
      callesList.add(reporte.calle);
      
      if (!callesCount[reporte.calle]) {
        callesCount[reporte.calle] = 0;
      }
      callesCount[reporte.calle]++;
    });
    
    // Ordenar calles por cantidad de reportes (descendente)
    resultado.reportesPorCalle = Object.keys(callesCount)
      .map(key => ({ name: key, value: callesCount[key] }))
      .sort((a, b) => b.value - a.value);
    
    // Generar resumen general
    const coloniaMasAfectada = resultado.reportesPorColonia.length > 0 ? 
      resultado.reportesPorColonia[0].name : "Ninguna";
    
    const calleMasAfectada = resultado.reportesPorCalle.length > 0 ? 
      resultado.reportesPorCalle[0].name : "Ninguna";
    
    resultado.resumenGeneral = {
      totalIncidencias: reportesFiltrados.length,
      coloniasAfectadas: coloniasList.size,
      callesAfectadas: callesList.size,
      coloniaMasAfectada,
      calleMasAfectada,
      promedioReportesPorColonia: coloniasList.size > 0 ? 
        (reportesFiltrados.length / coloniasList.size).toFixed(1) : 0
    };
    
    return resultado;
  }
  
  // Obtener lista de colonias únicas
  obtenerColonias(reportes) {
    const colonias = new Set();
    reportes.forEach(reporte => {
      if (reporte.colonia) {
        colonias.add(reporte.colonia);
      }
    });
    return Array.from(colonias).sort();
  }
  
  // Detectar ciudad actual
  async obtenerCiudadActual() {
    // Por ahora, retornamos Chetumal fijo
    return "Chetumal";
  }
}

export default new EstadisticasController();