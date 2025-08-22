// src/controllers/ReportesBacheoController.js - BACKEND LOGIC
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../models/firebase';
import { CATEGORIAS } from '../models/reporteModel';
import { BrigadaController } from '../controllers/BrigadaController';
import { jsPDF } from 'jspdf';

/**
 * Controlador que contiene toda la lógica de negocio para reportes de bacheo
 */
export class ReportesBacheoController {
  
  /**
   * Cargar todos los reportes de bacheo desde Firestore
   * Los reportes se ordenan por fecha descendente (más nuevos primero)
   */
  static async cargarReportes() {
    try {
      console.log("🔍 Iniciando carga de reportes de bacheo...");
      
      const reportesRef = collection(db, "reportes");
      
      // Primero intentamos con orderBy, si falla usamos query simple
      let querySnapshot;
      try {
        const q = query(
          reportesRef, 
          where("categoria", "==", CATEGORIAS.BACHEO),
          orderBy("fecha", "desc") // Ordenar por fecha descendente
        );
        console.log("📝 Query con orderBy configurada");
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn("Índice no disponible, usando query simple:", indexError.message);
        // Fallback: query sin orderBy
        const q = query(reportesRef, where("categoria", "==", CATEGORIAS.BACHEO));
        console.log("📝 Query simple configurada");
        querySnapshot = await getDocs(q);
      }
      
      console.log("📊 Documentos encontrados:", querySnapshot.size);
      
      const reportesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("📄 Documento procesado:", doc.id, {
          categoria: data.categoria,
          estado: data.estado,
          fecha: data.fecha,
          imagenes: data.imagenes ? `${data.imagenes.length} imágenes` : 'Sin imágenes',
          foto: data.foto ? 'Tiene foto' : 'Sin foto'
        });
        
        reportesData.push({
          id: doc.id,
          ...data
        });
      });
      
      // Ordenamiento en el cliente para asegurar que los más nuevos estén arriba
      reportesData.sort((a, b) => {
        const fechaA = this.parsearFecha(a.fecha);
        const fechaB = this.parsearFecha(b.fecha);
        return fechaB - fechaA; // Descendente (más nuevos primero)
      });
      
      console.log("✅ Reportes de bacheo cargados:", reportesData.length);
      return { success: true, data: reportesData };
    } catch (error) {
      console.error("❌ Error al cargar reportes:", error);
      return { 
        success: false, 
        error: "Error al cargar los reportes. Por favor, intenta de nuevo." 
      };
    }
  }

  /**
   * Obtener la URL de la imagen principal del reporte
   * Maneja tanto el campo 'imagenes' (array) como 'foto' (string) para compatibilidad
   */
  static obtenerImagenPrincipal(reporte) {
    // Priorizar el campo 'imagenes' (estructura actual)
    if (reporte.imagenes && Array.isArray(reporte.imagenes) && reporte.imagenes.length > 0) {
      return reporte.imagenes[0];
    }
    
    // Fallback al campo 'foto' para compatibilidad con versiones anteriores
    if (reporte.foto) {
      return reporte.foto;
    }
    
    return null;
  }

  /**
   * Verificar si el reporte tiene imágenes
   */
  static tieneImagenes(reporte) {
    return this.obtenerImagenPrincipal(reporte) !== null;
  }

  /**
   * Obtener todas las imágenes del reporte
   */
  static obtenerTodasLasImagenes(reporte) {
    const imagenes = [];
    
    // Agregar imágenes del array 'imagenes'
    if (reporte.imagenes && Array.isArray(reporte.imagenes)) {
      imagenes.push(...reporte.imagenes);
    }
    
    // Agregar imagen del campo 'foto' si existe y no está ya en el array
    if (reporte.foto && !imagenes.includes(reporte.foto)) {
      imagenes.push(reporte.foto);
    }
    
    return imagenes;
  }

  /**
   * Parsear fecha desde diferentes formatos
   */
  static parsearFecha(fechaData) {
    try {
      if (fechaData && fechaData.seconds) {
        return new Date(fechaData.seconds * 1000);
      } else if (fechaData instanceof Date) {
        return fechaData;
      } else if (fechaData) {
        return new Date(fechaData);
      } else {
        return new Date(0); // Fecha por defecto muy antigua
      }
    } catch (e) {
      console.error("Error al parsear fecha:", e);
      return new Date(0);
    }
  }

  /**
   * Cargar brigadas disponibles para bacheo
   */
  static async cargarBrigadasDisponibles() {
    try {
      const resultado = await BrigadaController.obtenerBrigadasDisponibles(CATEGORIAS.BACHEO);
      if (resultado.success) {
        return { success: true, data: resultado.data };
      } else {
        console.error("Error al cargar brigadas:", resultado.error);
        return { success: false, data: [] };
      }
    } catch (error) {
      console.error("Error al cargar brigadas:", error);
      return { success: false, data: [] };
    }
  }

  /**
   * Asignar reporte a brigada
   */
  static async asignarBrigadaReporte(reporteId, brigadaId) {
    if (!brigadaId || brigadaId === '') {
      return { success: true }; // No hacer nada si no hay brigada seleccionada
    }

    try {
      const usuarioActual = localStorage.getItem('username') || 'Sistema';
      
      const resultado = await BrigadaController.asignarReporte(
        brigadaId,
        reporteId,
        usuarioActual
      );

      return resultado;
    } catch (error) {
      console.error("Error al asignar reporte:", error);
      return {
        success: false,
        error: "Error al asignar el reporte a la brigada"
      };
    }
  }

  /**
   * Desasignar reporte de brigada
   */
  static async desasignarReporte(brigadaId, reporteId) {
    if (!brigadaId) {
      return {
        success: false,
        error: "Este reporte no tiene brigada asignada"
      };
    }

    try {
      const resultado = await BrigadaController.desasignarReporte(brigadaId, reporteId);
      return resultado;
    } catch (error) {
      console.error("Error al desasignar reporte:", error);
      return {
        success: false,
        error: "Error al desasignar el reporte"
      };
    }
  }

  /**
   * Actualizar estado del reporte
   */
  static async actualizarEstadoReporte(reporteId, nuevoEstado) {
    if (!reporteId) {
      return { success: false, error: "No hay un reporte seleccionado válido" };
    }
    
    try {
      const reporteRef = doc(db, "reportes", reporteId);
      const datosActualizacion = { estado: nuevoEstado };
      
      if (nuevoEstado === 'resuelto' || nuevoEstado === 'completado') {
        datosActualizacion.fechaResolucion = new Date();
      }
      
      await updateDoc(reporteRef, datosActualizacion);
      
      return {
        success: true,
        data: {
          nuevoEstado,
          fechaResolucion: datosActualizacion.fechaResolucion || null
        }
      };
    } catch (error) {
      console.error("Error al actualizar estado del reporte:", error);
      return {
        success: false,
        error: "Ocurrió un error al actualizar el estado del reporte. Intente nuevamente."
      };
    }
  }

  /**
   * Generar PDF del reporte
   */
  static async generarPDF(reporte) {
    if (!reporte) {
      return { success: false, error: "No se proporcionó un reporte válido" };
    }
    
    try {
      const pdf = new jsPDF();
      
      // Configuración de página
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      
      // Título
      pdf.text(`Reporte de Bacheo - Folio: ${reporte.folio || 'N/A'}`, 15, 20);
      
      // Detalles del reporte
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      
      let yPos = 40;
      const lineHeight = 10;
      
      // Información del reporte
      pdf.text(`Fecha de reporte: ${this.formatearFecha(reporte.fecha)}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Estado: ${reporte.estado ? reporte.estado.charAt(0).toUpperCase() + reporte.estado.slice(1) : 'Pendiente'}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Dirección: ${reporte.direccion || 'No especificada'}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Colonia: ${reporte.colonia || 'No especificada'}`, 15, yPos);
      yPos += lineHeight;
      
      // Fecha de resolución si existe
      if (reporte.fechaResolucion) {
        pdf.text(`Fecha de resolución: ${this.formatearFecha(reporte.fechaResolucion)}`, 15, yPos);
        yPos += lineHeight;
      }
      
      // Brigada asignada si existe
      if (reporte.brigadaAsignada) {
        pdf.text(`Brigada asignada: ${reporte.brigadaAsignada.nombre}`, 15, yPos);
        yPos += lineHeight;
      }
      
      // Comentarios si existen
      if (reporte.comentario) {
        yPos += lineHeight;
        pdf.setFont("helvetica", "bold");
        pdf.text('Comentarios:', 15, yPos);
        yPos += lineHeight;
        
        pdf.setFont("helvetica", "normal");
        const commentLines = pdf.splitTextToSize(reporte.comentario, 180);
        pdf.text(commentLines, 15, yPos);
        yPos += (lineHeight * commentLines.length);
      }
      
      // Agregar imagen si existe (usando la nueva función)
      const imagenPrincipal = this.obtenerImagenPrincipal(reporte);
      if (imagenPrincipal) {
        try {
          yPos += lineHeight * 2;
          
          pdf.setFont("helvetica", "bold");
          pdf.text('Imagen del reporte:', 15, yPos);
          yPos += lineHeight;
          
          if (yPos > 180) {
            pdf.addPage();
            yPos = 30;
          }
          
          // Usar la imagen principal
          pdf.addImage(imagenPrincipal, 'JPEG', 15, yPos, 180, 100);
        } catch (imgError) {
          console.error("Error al agregar imagen al PDF:", imgError);
          pdf.setFont("helvetica", "normal");
          pdf.text("No se pudo cargar la imagen del reporte.", 15, yPos + 10);
        }
      }
      
      // Agregar pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.text(`Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      
      // Guardar el PDF
      pdf.save(`Reporte_Bacheo_${reporte.folio || reporte.id}.pdf`);
      
      return { success: true };
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      return {
        success: false,
        error: "Ocurrió un error al generar el PDF. Intente nuevamente."
      };
    }
  }

  /**
   * Verificar si una fecha está dentro del rango especificado
   */
  static estaEnRangoFecha(fechaReporte, fechaInicio, fechaFin) {
    if (!fechaInicio && !fechaFin) {
      return true; // Sin filtro de fecha
    }
    
    const fecha = this.parsearFecha(fechaReporte);
    
    // Convertir fechas de filtro a objetos Date
    const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
    const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;
    
    // Aplicar filtros
    if (inicio && fecha < inicio) {
      return false;
    }
    
    if (fin && fecha > fin) {
      return false;
    }
    
    return true;
  }

  /**
   * Filtrar reportes según estado y fechas
   */
  static filtrarReportes(reportes, filtroEstado, fechaInicio = '', fechaFin = '') {
    return reportes.filter(reporte => {
      // Filtro por estado
      if (filtroEstado !== 'todos' && reporte.estado !== filtroEstado) {
        return false;
      }
      
      // Filtro por fecha
      if (!this.estaEnRangoFecha(reporte.fecha, fechaInicio, fechaFin)) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Asegurar que los reportes estén ordenados por fecha descendente
      const fechaA = this.parsearFecha(a.fecha);
      const fechaB = this.parsearFecha(b.fecha);
      return fechaB - fechaA;
    });
  }

  /**
   * Calcular estadísticas de los reportes filtrados
   */
  static calcularEstadisticas(reportes) {
    return {
      total: reportes.length,
      pendientes: reportes.filter(r => r.estado === 'pendiente').length,
      enRevision: reportes.filter(r => r.estado === 'en revisión').length,
      asignados: reportes.filter(r => r.estado === 'asignado').length,
      enProceso: reportes.filter(r => r.estado === 'en_proceso' || r.estado === 'en proceso').length,
      resueltos: reportes.filter(r => r.estado === 'completado' || r.estado === 'resuelto').length
    };
  }

  /**
   * Obtener reportes por rango de fechas (función auxiliar para análisis)
   */
  static obtenerReportesPorRango(reportes, diasAtras = 30) {
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(hoy.getDate() - diasAtras);
    
    return reportes.filter(reporte => {
      const fechaReporte = this.parsearFecha(reporte.fecha);
      return fechaReporte >= fechaInicio && fechaReporte <= hoy;
    });
  }

  /**
   * Obtener tendencias de reportes por período
   */
  static obtenerTendencias(reportes, periodo = 'semana') {
    const grupos = {};
    const hoy = new Date();
    
    reportes.forEach(reporte => {
      const fecha = this.parsearFecha(reporte.fecha);
      let clave;
      
      switch(periodo) {
        case 'dia':
          clave = fecha.toISOString().split('T')[0];
          break;
        case 'semana':
          const inicioSemana = new Date(fecha);
          inicioSemana.setDate(fecha.getDate() - fecha.getDay());
          clave = inicioSemana.toISOString().split('T')[0];
          break;
        case 'mes':
          clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          clave = fecha.toISOString().split('T')[0];
      }
      
      if (!grupos[clave]) {
        grupos[clave] = {
          fecha: clave,
          total: 0,
          pendientes: 0,
          resueltos: 0,
          enProceso: 0
        };
      }
      
      grupos[clave].total++;
      
      switch(reporte.estado) {
        case 'pendiente':
          grupos[clave].pendientes++;
          break;
        case 'completado':
        case 'resuelto':
          grupos[clave].resueltos++;
          break;
        case 'en_proceso':
        case 'en proceso':
          grupos[clave].enProceso++;
          break;
      }
    });
    
    return Object.values(grupos).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Formatear fecha para mostrar
   */
  static formatearFecha(fechaData) {
    try {
      const fecha = this.parsearFecha(fechaData);
      
      if (fecha.getTime() === 0) {
        return 'Fecha no disponible';
      }
      
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return 'Fecha no disponible';
    }
  }

  /**
   * Formatear fecha corta (solo día/mes/año)
   */
  static formatearFechaCorta(fechaData) {
    try {
      const fecha = this.parsearFecha(fechaData);
      
      if (fecha.getTime() === 0) {
        return 'N/A';
      }
      
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      console.error("Error al formatear fecha corta:", e);
      return 'N/A';
    }
  }

  /**
   * Exportar reportes filtrados a CSV
   */
  static exportarCSV(reportes, nombreArchivo = 'reportes_bacheo') {
    try {
      const headers = [
        'Folio',
        'Fecha',
        'Estado', 
        'Dirección',
        'Colonia',
        'Brigada Asignada',
        'Fecha Resolución',
        'Comentarios'
      ];
      
      const csvContent = [
        headers.join(','),
        ...reportes.map(reporte => [
          reporte.folio || '',
          this.formatearFechaCorta(reporte.fecha),
          reporte.estado || 'pendiente',
          `"${(reporte.direccion || '').replace(/"/g, '""')}"`,
          `"${(reporte.colonia || '').replace(/"/g, '""')}"`,
          reporte.brigadaAsignada?.nombre || '',
          reporte.fechaResolucion ? this.formatearFechaCorta(reporte.fechaResolucion) : '',
          `"${(reporte.comentario || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      return {
        success: false,
        error: "Error al exportar los datos a CSV"
      };
    }
  }
}