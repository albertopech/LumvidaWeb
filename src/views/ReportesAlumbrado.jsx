// src/views/ReportesAlumbrado.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../models/firebase';
import { CATEGORIAS } from '../models/reporteModel';
import './Styles/reportes.css';
import { jsPDF } from 'jspdf'; // Corrección: Importar como un objeto nombrado

// Componente de etiqueta de estado
const EstadoTag = ({ estado }) => {
  const getEstadoClass = () => {
    switch(estado?.toLowerCase()) {
      case 'completado':
      case 'resuelto':
        return 'resuelto';
      case 'en_proceso':
      case 'en proceso':
      case 'en progreso':
        return 'en-proceso';
      case 'en revisión':
        return 'en-revision';
      case 'asignado':
        return 'asignado';
      default:
        return 'pendiente';
    }
  };
  
  const getEstadoIcon = () => {
    switch(estado?.toLowerCase()) {
      case 'completado':
      case 'resuelto':
        return 'fas fa-check-circle';
      case 'en_proceso':
      case 'en proceso':
      case 'en progreso':
        return 'fas fa-sync-alt';
      case 'en revisión':
        return 'fas fa-search';
      case 'asignado':
        return 'fas fa-user-check';
      default:
        return 'fas fa-clock';
    }
  };

  const getEstadoText = () => {
    switch(estado?.toLowerCase()) {
      case 'completado':
        return 'Resuelto';
      case 'en_proceso':
        return 'En proceso';
      default:
        return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Pendiente';
    }
  };
  
  return (
    <span className={`estado-tag ${getEstadoClass()}`}>
      <i className={getEstadoIcon()}></i>
      <span>{getEstadoText()}</span>
    </span>
  );
};

const ReportesAlumbrado = () => {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  
  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [ubicacion, setUbicacion] = useState({
    ciudad: 'Chetumal, Q. Roo'
  });

  // Cargar reportes
  const cargarReportes = async () => {
    try {
      setLoading(true);
      
      // Consulta directa a Firestore por categoría
      const reportesRef = collection(db, "reportes");
      const q = query(reportesRef, where("categoria", "==", CATEGORIAS.ALUMBRADO));
      const querySnapshot = await getDocs(q);
      
      const reportesData = [];
      querySnapshot.forEach((doc) => {
        reportesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log("Reportes de alumbrado cargados:", reportesData.length);
      setReportes(reportesData);
      setError(null);
    } catch (error) {
      console.error("Error al cargar reportes:", error);
      setError("Error al cargar los reportes. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar reportes al iniciar el componente
  useEffect(() => {
    cargarReportes();
  }, []);

  // Filtrar reportes según estado
  const reportesFiltrados = reportes.filter(reporte => {
    // Filtrar por estado
    if (filtroEstado !== 'todos' && reporte.estado !== filtroEstado) {
      return false;
    }
    
    return true;
  });

  // Calcular estadísticas
  const totalReportes = reportes.length;
  const reportesPendientes = reportes.filter(r => r.estado === 'pendiente').length;
  const reportesEnRevision = reportes.filter(r => r.estado === 'en revisión').length;
  const reportesAsignados = reportes.filter(r => r.estado === 'asignado').length;
  const reportesEnProceso = reportes.filter(r => r.estado === 'en_proceso' || r.estado === 'en proceso').length;
  const reportesResueltos = reportes.filter(r => r.estado === 'completado' || r.estado === 'resuelto').length;

  // Mostrar detalle de reporte
  const mostrarDetalle = (reporte) => {
    setReporteSeleccionado(reporte);
  };

  // Cerrar modal de detalle
  const cerrarDetalle = () => {
    setReporteSeleccionado(null);
    setMensajeExito(null);
  };

  // Actualizar estado del reporte
  const actualizarEstadoReporte = async (nuevoEstado) => {
    if (!reporteSeleccionado || !reporteSeleccionado.id) {
      console.error("No hay un reporte seleccionado válido");
      return;
    }
    
    try {
      setActualizandoEstado(true);
      
      // Referencia al documento del reporte
      const reporteRef = doc(db, "reportes", reporteSeleccionado.id);
      
      // Si el estado es "resuelto" o "completado", añadir fecha de resolución
      const datosActualizacion = { 
        estado: nuevoEstado 
      };
      
      if (nuevoEstado === 'resuelto' || nuevoEstado === 'completado') {
        datosActualizacion.fechaResolucion = new Date();
      }
      
      // Actualizar en Firestore
      await updateDoc(reporteRef, datosActualizacion);
      
      // Actualizar el reporte seleccionado localmente
      setReporteSeleccionado({
        ...reporteSeleccionado,
        estado: nuevoEstado,
        ...(nuevoEstado === 'resuelto' || nuevoEstado === 'completado' ? { fechaResolucion: { seconds: Math.floor(Date.now() / 1000) } } : {})
      });
      
      // Actualizar la lista de reportes
      setReportes(reportes.map(reporte => 
        reporte.id === reporteSeleccionado.id ? 
        {
          ...reporte,
          estado: nuevoEstado,
          ...(nuevoEstado === 'resuelto' || nuevoEstado === 'completado' ? { fechaResolucion: { seconds: Math.floor(Date.now() / 1000) } } : {})
        } : 
        reporte
      ));
      
      // Mostrar mensaje de éxito
      setMensajeExito(`El estado del reporte ha sido actualizado a "${nuevoEstado}".`);
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setMensajeExito(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error al actualizar estado del reporte:", error);
      setError("Ocurrió un error al actualizar el estado del reporte. Intente nuevamente.");
    } finally {
      setActualizandoEstado(false);
    }
  };
  
  // Generar PDF del reporte - Versión simplificada sin autoTable
  const generarPDF = async () => {
    if (!reporteSeleccionado) return;
    
    try {
      setGenerandoPDF(true);
      
      // Crear nuevo documento PDF
      const pdf = new jsPDF();
      
      // Configuración de página
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      
      // Título
      pdf.text(`Reporte de Alumbrado Público - Folio: ${reporteSeleccionado.folio || 'N/A'}`, 15, 20);
      
      // Detalles del reporte
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      
      let yPos = 40; // Posición Y inicial
      const lineHeight = 10; // Altura de línea
      
      // Información del reporte
      pdf.text(`Fecha de reporte: ${formatearFecha(reporteSeleccionado.fecha)}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Estado: ${reporteSeleccionado.estado ? reporteSeleccionado.estado.charAt(0).toUpperCase() + reporteSeleccionado.estado.slice(1) : 'Pendiente'}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Dirección: ${reporteSeleccionado.direccion || 'No especificada'}`, 15, yPos);
      yPos += lineHeight;
      
      pdf.text(`Colonia: ${reporteSeleccionado.colonia || 'No especificada'}`, 15, yPos);
      yPos += lineHeight;
      
      // Fecha de resolución si existe
      if (reporteSeleccionado.fechaResolucion) {
        pdf.text(`Fecha de resolución: ${formatearFecha(reporteSeleccionado.fechaResolucion)}`, 15, yPos);
        yPos += lineHeight;
      }
      
      // Asignación si existe
      if (reporteSeleccionado.asignadoA) {
        pdf.text(`Asignado a: ${reporteSeleccionado.asignadoA}`, 15, yPos);
        yPos += lineHeight;
      }
      
      // Comentarios si existen
      if (reporteSeleccionado.comentario) {
        yPos += lineHeight; // Espacio adicional
        pdf.setFont("helvetica", "bold");
        pdf.text('Comentarios:', 15, yPos);
        yPos += lineHeight;
        
        pdf.setFont("helvetica", "normal");
        // Partir el comentario en varias líneas si es largo
        const commentLines = pdf.splitTextToSize(reporteSeleccionado.comentario, 180);
        pdf.text(commentLines, 15, yPos);
        yPos += (lineHeight * commentLines.length);
      }
      
      // Agregar imagen si existe
      if (reporteSeleccionado.foto) {
        try {
          yPos += lineHeight * 2; // Espacio adicional
          
          pdf.setFont("helvetica", "bold");
          pdf.text('Imagen del reporte:', 15, yPos);
          yPos += lineHeight;
          
          // Comprobar si es necesario agregar una nueva página para la imagen
          if (yPos > 180) {
            pdf.addPage();
            yPos = 30;
          }
          
          // Intenta cargar la imagen
          pdf.addImage(reporteSeleccionado.foto, 'JPEG', 15, yPos, 180, 100);
        } catch (imgError) {
          console.error("Error al agregar imagen al PDF:", imgError);
          // Si falla la imagen, agregar un texto indicando el error
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
      pdf.save(`Reporte_Alumbrado_${reporteSeleccionado.folio || reporteSeleccionado.id}.pdf`);
      
      // Mostrar mensaje de éxito
      setMensajeExito("El PDF se ha generado correctamente.");
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setMensajeExito(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      setError("Ocurrió un error al generar el PDF. Intente nuevamente.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaData) => {
    try {
      let fecha;
      if (fechaData && fechaData.seconds) {
        fecha = new Date(fechaData.seconds * 1000);
      } else if (fechaData instanceof Date) {
        fecha = fechaData;
      } else if (fechaData) {
        fecha = new Date(fechaData);
      } else {
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
  };

  // Renderizado condicional según el estado
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando reportes de alumbrado público...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <p className="error-message">{error}</p>
        <button className="btn-retry" onClick={cargarReportes}>
          <i className="fas fa-sync"></i> Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="reportes-app">
      {/* Header con título */}
      <header className="app-header">
        <h1>Reportes de Alumbrado Público</h1>
        <p className="ubicacion-actual">
          <i className="fas fa-map-marker-alt"></i> {ubicacion.ciudad}
        </p>
      </header>

      {/* Panel Administrativo */}
      <div className="panel-admin">
        <h2 className="panel-admin-title">
          <i className="fas fa-tachometer-alt"></i> Panel Administrativo
        </h2>
        
        <div className="panel-admin-controls">
          <button 
            className={`panel-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            <i className="fas fa-list"></i> Todos
          </button>
          <button 
            className={`panel-btn ${filtroEstado === 'pendiente' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('pendiente')}
          >
            <i className="fas fa-clock"></i> Pendientes
          </button>
          <button 
            className={`panel-btn ${filtroEstado === 'en_proceso' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('en_proceso')}
          >
            <i className="fas fa-sync-alt"></i> En proceso
          </button>
          <button 
            className={`panel-btn ${filtroEstado === 'completado' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('completado')}
          >
            <i className="fas fa-check-circle"></i> Resueltos
          </button>
        </div>
        
        <div className="panel-admin-cards">
          <div className="panel-admin-card total">
            <div className="panel-card-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">Total Reportes</div>
              <div className="panel-card-value">{totalReportes}</div>
            </div>
          </div>
          
          <div className="panel-admin-card pendientes">
            <div className="panel-card-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">Pendientes</div>
              <div className="panel-card-value">{reportesPendientes}</div>
            </div>
          </div>
          
          <div className="panel-admin-card en-revision">
            <div className="panel-card-icon">
              <i className="fas fa-search"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">En Revisión</div>
              <div className="panel-card-value">{reportesEnRevision}</div>
            </div>
          </div>
          
          <div className="panel-admin-card asignados">
            <div className="panel-card-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">Asignados</div>
              <div className="panel-card-value">{reportesAsignados}</div>
            </div>
          </div>
          
          <div className="panel-admin-card en-proceso">
            <div className="panel-card-icon">
              <i className="fas fa-sync-alt"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">En Proceso</div>
              <div className="panel-card-value">{reportesEnProceso}</div>
            </div>
          </div>
          
          <div className="panel-admin-card resueltos">
            <div className="panel-card-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="panel-card-content">
              <div className="panel-card-title">Resueltos</div>
              <div className="panel-card-value">{reportesResueltos}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Vista de reportes */}
      <div className="reportes-content">
        {reportesFiltrados.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-icon">
              <i className="fas fa-lightbulb"></i>
            </div>
            <h3>No hay reportes de alumbrado público</h3>
            <p>No se encontraron reportes con los filtros seleccionados.</p>
            {filtroEstado !== 'todos' && (
              <button className="btn-reset-inline" onClick={() => setFiltroEstado('todos')}>
                Ver todos los reportes
              </button>
            )}
          </div>
        ) : (
          <div className="report-list">
            {reportesFiltrados.map((reporte) => (
              <div 
                key={reporte.id || reporte.folio} 
                className={`report-card ${reporte.estado?.toLowerCase().replace('_', '-') || 'pendiente'}`}
                onClick={() => mostrarDetalle(reporte)}
              >
                <div className="report-card-header">
                  <div className="report-category">
                    <i className="fas fa-lightbulb"></i>
                    <span>Alumbrado Público</span>
                  </div>
                  <div className="report-folio">
                    Folio: <strong>{reporte.folio}</strong>
                  </div>
                </div>
                
                <div className="report-card-body">
                  <div className="report-estado">
                    <EstadoTag estado={reporte.estado || 'pendiente'} />
                  </div>
                  
                  <div className="report-direccion">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{reporte.direccion || 'Sin dirección'}</span>
                  </div>
                  
                  <div className="report-fecha">
                    <i className="far fa-calendar-alt"></i>
                    <span>{formatearFecha(reporte.fecha)}</span>
                  </div>
                </div>
                
                <div className="report-card-footer">
                  <button className="btn-ver-detalle">
                    <i className="fas fa-eye"></i> Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal de detalle de reporte */}
      {reporteSeleccionado && (
        <div className="reporte-modal">
          <div className="reporte-modal-content">
            <div className="reporte-modal-header">
              <h2>
                Alumbrado Público - Folio: {reporteSeleccionado.folio}
              </h2>
              <button className="btn-cerrar" onClick={cerrarDetalle}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Mensaje de éxito */}
            {mensajeExito && (
              <div className="mensaje-exito">
                <i className="fas fa-check-circle"></i> {mensajeExito}
              </div>
            )}
            
            <div className="reporte-modal-body">
              <div className="reporte-detalles">
                <div className="reporte-campo">
                  <div className="reporte-campo-label">Fecha:</div>
                  <div className="reporte-campo-valor">{formatearFecha(reporteSeleccionado.fecha)}</div>
                </div>
                
                <div className="reporte-campo">
                  <div className="reporte-campo-label">Dirección:</div>
                  <div className="reporte-campo-valor">{reporteSeleccionado.direccion || 'Sin dirección'}</div>
                </div>
                
                <div className="reporte-campo">
                  <div className="reporte-campo-label">Colonia:</div>
                  <div className="reporte-campo-valor">{reporteSeleccionado.colonia || 'No especificada'}</div>
                </div>
                
                <div className="reporte-campo">
                  <div className="reporte-campo-label">Estado:</div>
                  <div className="reporte-campo-valor">
                    <EstadoTag estado={reporteSeleccionado.estado || 'pendiente'} />
                    
                    {/* Selector de estado (con funcionalidad real) */}
                    <select 
                      className="estado-selector"
                      value={reporteSeleccionado.estado || 'pendiente'}
                      onChange={(e) => actualizarEstadoReporte(e.target.value)}
                      disabled={actualizandoEstado}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en revisión">En revisión</option>
                      <option value="asignado">Asignado</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                    
                    {actualizandoEstado && (
                      <span className="estado-cargando">
                        <i className="fas fa-spinner fa-spin"></i> Actualizando...
                      </span>
                    )}
                  </div>
                </div>
                
                {reporteSeleccionado.asignadoA && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Asignado a:</div>
                    <div className="reporte-campo-valor">
                      <i className="fas fa-user-check"></i> {reporteSeleccionado.asignadoA}
                    </div>
                  </div>
                )}
                
                {/* Mostrar fecha de resolución si el reporte está resuelto */}
                {(reporteSeleccionado.estado === 'resuelto' || reporteSeleccionado.estado === 'completado') && reporteSeleccionado.fechaResolucion && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Fecha de resolución:</div>
                    <div className="reporte-campo-valor">
                      <i className="fas fa-calendar-check"></i> {formatearFecha(reporteSeleccionado.fechaResolucion)}
                    </div>
                  </div>
                )}
                
                {reporteSeleccionado.ubicacionObj && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Ubicación:</div>
                    <div className="reporte-campo-valor reporte-ubicacion">
                      <i className="fas fa-map-marker-alt"></i>
                      {reporteSeleccionado.ubicacionObj.lat}, {reporteSeleccionado.ubicacionObj.lng}
                    </div>
                  </div>
                )}
                
                {reporteSeleccionado.comentario && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Comentarios:</div>
                    <div className="reporte-campo-valor comentario">
                      {reporteSeleccionado.comentario}
                    </div>
                  </div>
                )}
              </div>
              
              {reporteSeleccionado.foto && (
                <div className="reporte-foto">
                  <h3>Imagen del reporte</h3>
                  <div className="foto-container">
                    <img src={reporteSeleccionado.foto} alt="Imagen del reporte" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="reporte-modal-footer">
              <button 
                className="btn-generar-pdf" 
                onClick={generarPDF}
                disabled={generandoPDF}
              >
                {generandoPDF ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Generando PDF...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-pdf"></i> Generar PDF
                  </>
                )}
              </button>
              <button className="btn-cerrar-modal" onClick={cerrarDetalle}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Estilos para el mensaje de éxito */}
      <style jsx>
        {`
          .mensaje-exito {
            background-color: #d4edda;
            color: #155724;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 10px 0;
            display: flex;
            align-items: center;
            font-weight: 500;
          }
          
          .mensaje-exito i {
            margin-right: 8px;
            font-size: 18px;
          }
          
          .estado-cargando {
            margin-left: 10px;
            font-size: 14px;
            color: #666;
          }
          
          .estado-cargando i {
            margin-right: 5px;
          }
        `}
      </style>
    </div>
  );
};

export default ReportesAlumbrado;