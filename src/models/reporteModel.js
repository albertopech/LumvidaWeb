// En reporteModel.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const CATEGORIAS = {
  ALUMBRADO: 'Alumbrado Público',
  BASURA: 'Basura Acumulada',
  BACHEO: 'Bacheo',
  DRENAJE: 'Drenajes Obstruidos'
};

// Obtener todos los reportes
export const obtenerTodosLosReportes = async () => {
  try {
    const reportesRef = collection(db, 'reportes');
    const snapshot = await getDocs(reportesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    throw error;
  }
};

// Obtener reportes agrupados por categoría
export const obtenerReportesPorCategoria = async () => {
  try {
    const reportes = await obtenerTodosLosReportes();
    
    // Agrupar reportes por categoría
    const reportesPorCategoria = {
      [CATEGORIAS.ALUMBRADO]: [],
      [CATEGORIAS.BASURA]: [],
      [CATEGORIAS.BACHEO]: [],
      [CATEGORIAS.DRENAJE]: []
    };
    
    // Clasificar cada reporte en su categoría correspondiente
    reportes.forEach(reporte => {
      if (reportesPorCategoria[reporte.categoria]) {
        reportesPorCategoria[reporte.categoria].push(reporte);
      }
    });
    
    return reportesPorCategoria;
  } catch (error) {
    console.error('Error al obtener reportes por categoría:', error);
    throw error;
  }
};