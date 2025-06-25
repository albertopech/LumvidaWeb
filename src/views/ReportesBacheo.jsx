// src/views/ReportesBacheo.jsx - FRONTEND COMPONENT
import React, { useState, useEffect } from 'react';
import { ReportesBacheoController } from '../controllers/ReportesBacheoController';
import './Styles/reportes.css';

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

const ReportesBacheo = () => {
  // Estados del componente
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [ubicacion] = useState({ ciudad: 'Chetumal, Q. Roo' });
  const [brigadasDisponibles, setBrigadasDisponibles] = useState([]);
  const [asignandoBrigada, setAsignandoBrigada] = useState(false);
  
  // Estados para filtro de fechas
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [mostrarFiltroFechas, setMostrarFiltroFechas] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    
    // Cargar reportes
    const resultadoReportes = await ReportesBacheoController.cargarReportes();
    if (resultadoReportes.success) {
      setReportes(resultadoReportes.data);
      setError(null);
    } else {
      setError(resultadoReportes.error);
    }
    
    // Cargar brigadas
    const resultadoBrigadas = await ReportesBacheoController.cargarBrigadasDisponibles();
    if (resultadoBrigadas.success) {
      setBrigadasDisponibles(resultadoBrigadas.data);
    }
    
    setLoading(false);
  };

  // Limpiar filtros de fecha
  const limpiarFiltrosFecha = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
  };

  // Aplicar filtros preestablecidos
  const aplicarFiltroPreestablecido = (tipo) => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth();
    
    switch(tipo) {
      case 'hoy':
        const hoyStr = hoy.toISOString().split('T')[0];
        setFiltroFechaInicio(hoyStr);
        setFiltroFechaFin(hoyStr);
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        setFiltroFechaInicio(inicioSemana.toISOString().split('T')[0]);
        setFiltroFechaFin(finSemana.toISOString().split('T')[0]);
        break;
      case 'mes':
        const inicioMes = new Date(año, mes, 1);
        const finMes = new Date(año, mes + 1, 0);
        setFiltroFechaInicio(inicioMes.toISOString().split('T')[0]);
        setFiltroFechaFin(finMes.toISOString().split('T')[0]);
        break;
      case 'ultimos30':
        const hace30Dias = new Date(hoy);
        hace30Dias.setDate(hoy.getDate() - 30);
        setFiltroFechaInicio(hace30Dias.toISOString().split('T')[0]);
        setFiltroFechaFin(hoy.toISOString().split('T')[0]);
        break;
    }
  };

  // Asignar brigada a reporte
  const asignarBrigadaReporte = async (reporteId, brigadaId) => {
    setAsignandoBrigada(true);

    const resultado = await ReportesBacheoController.asignarBrigadaReporte(reporteId, brigadaId);

    if (resultado.success) {
      setMensajeExito(`Reporte asignado exitosamente a ${resultado.data.brigadaNombre}`);
      
      // Actualizar el reporte seleccionado localmente
      if (reporteSeleccionado && reporteSeleccionado.id === reporteId) {
        const brigadaAsignada = brigadasDisponibles.find(b => b.id === brigadaId);
        setReporteSeleccionado({
          ...reporteSeleccionado,
          estado: 'asignado',
          brigadaAsignada: {
            id: brigadaId,
            nombre: brigadaAsignada?.nombre || 'Brigada',
            tipo: brigadaAsignada?.tipo || '',
            fechaAsignacion: new Date()
          }
        });
      }
      
      // Actualizar la lista de reportes
      setReportes(reportes.map(reporte => 
        reporte.id === reporteId ? 
        {
          ...reporte,
          estado: 'asignado',
          brigadaAsignada: {
            id: brigadaId,
            nombre: resultado.data.brigadaNombre,
            fechaAsignacion: new Date()
          }
        } : 
        reporte
      ));
      
      setTimeout(() => setMensajeExito(null), 3000);
    } else {
      setError(resultado.error);
    }
    
    setAsignandoBrigada(false);
  };

  // Desasignar reporte de brigada
  const desasignarReporte = async (reporte) => {
    if (!reporte.brigadaAsignada?.id) {
      setError("Este reporte no tiene brigada asignada");
      return;
    }

    if (!window.confirm(`¿Está seguro de desasignar este reporte de la brigada "${reporte.brigadaAsignada.nombre}"?`)) {
      return;
    }

    const resultado = await ReportesBacheoController.desasignarReporte(
      reporte.brigadaAsignada.id,
      reporte.id
    );

    if (resultado.success) {
      setMensajeExito("Reporte desasignado correctamente");
      
      // Actualizar localmente
      if (reporteSeleccionado && reporteSeleccionado.id === reporte.id) {
        setReporteSeleccionado({
          ...reporteSeleccionado,
          estado: 'pendiente',
          brigadaAsignada: null
        });
      }
      
      setReportes(reportes.map(r => 
        r.id === reporte.id ? 
        { ...r, estado: 'pendiente', brigadaAsignada: null } : 
        r
      ));
      
      setTimeout(() => setMensajeExito(null), 3000);
    } else {
      setError(resultado.error);
    }
  };

  // Actualizar estado del reporte
  const actualizarEstadoReporte = async (nuevoEstado) => {
    setActualizandoEstado(true);
    
    const resultado = await ReportesBacheoController.actualizarEstadoReporte(
      reporteSeleccionado.id, 
      nuevoEstado
    );
    
    if (resultado.success) {
      // Actualizar el reporte seleccionado
      setReporteSeleccionado({
        ...reporteSeleccionado,
        estado: nuevoEstado,
        ...(resultado.data.fechaResolucion ? { fechaResolucion: { seconds: Math.floor(Date.now() / 1000) } } : {})
      });
      
      // Actualizar la lista de reportes
      setReportes(reportes.map(reporte => 
        reporte.id === reporteSeleccionado.id ? 
        {
          ...reporte,
          estado: nuevoEstado,
          ...(resultado.data.fechaResolucion ? { fechaResolucion: { seconds: Math.floor(Date.now() / 1000) } } : {})
        } : 
        reporte
      ));
      
      setMensajeExito(`El estado del reporte ha sido actualizado a "${nuevoEstado}".`);
      setTimeout(() => setMensajeExito(null), 3000);
    } else {
      setError(resultado.error);
    }
    
    setActualizandoEstado(false);
  };
  
  // Generar PDF del reporte
  const generarPDF = async () => {
    setGenerandoPDF(true);
    
    const resultado = await ReportesBacheoController.generarPDF(reporteSeleccionado);
    
    if (resultado.success) {
      setMensajeExito("El PDF se ha generado correctamente.");
      setTimeout(() => setMensajeExito(null), 3000);
    } else {
      setError(resultado.error);
    }
    
    setGenerandoPDF(false);
  };

  // Limpiar mensajes automáticamente
  useEffect(() => {
    if (mensajeExito) {
      const timer = setTimeout(() => setMensajeExito(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensajeExito]);

  // Calcular datos para mostrar (con filtros aplicados)
  const reportesFiltrados = ReportesBacheoController.filtrarReportes(
    reportes, 
    filtroEstado, 
    filtroFechaInicio, 
    filtroFechaFin
  );
  const estadisticas = ReportesBacheoController.calcularEstadisticas(reportesFiltrados);

  // Renderizado condicional según el estado
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando reportes de bacheo...</p>
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
        <button className="btn-retry" onClick={cargarDatosIniciales}>
          <i className="fas fa-sync"></i> Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="reportes-app">
      {/* Header */}
      <header className="app-header">
        <h1>Reportes de Bacheo</h1>
        <p className="ubicacion-actual">
          <i className="fas fa-map-marker-alt"></i> {ubicacion.ciudad}
        </p>
      </header>

      {/* Mensaje de éxito */}
      {mensajeExito && (
        <div className="mensaje-exito-global">
          <i className="fas fa-check-circle"></i> {mensajeExito}
        </div>
      )}

      {/* Panel Administrativo */}
      <div className="panel-admin">
        <h2 className="panel-admin-title">
          <i className="fas fa-tachometer-alt"></i> Panel Administrativo
        </h2>
        
        {/* Filtros de Estado */}
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
          
          {/* Botón para mostrar filtros de fecha */}
          <button 
            className={`panel-btn filtro-fecha-btn ${mostrarFiltroFechas ? 'active' : ''}`}
            onClick={() => setMostrarFiltroFechas(!mostrarFiltroFechas)}
          >
            <i className="fas fa-calendar-alt"></i> Filtrar por fecha
          </button>
        </div>

        {/* Panel de Filtros de Fecha */}
        {mostrarFiltroFechas && (
          <div className="filtros-fecha-panel">
            <div className="filtros-fecha-header">
              <h3><i className="fas fa-calendar-alt"></i> Filtrar por período</h3>
            </div>
            
            {/* Filtros rápidos */}
            <div className="filtros-rapidos">
              <button 
                className="btn-filtro-rapido"
                onClick={() => aplicarFiltroPreestablecido('hoy')}
              >
                Hoy
              </button>
              <button 
                className="btn-filtro-rapido"
                onClick={() => aplicarFiltroPreestablecido('semana')}
              >
                Esta semana
              </button>
              <button 
                className="btn-filtro-rapido"
                onClick={() => aplicarFiltroPreestablecido('mes')}
              >
                Este mes
              </button>
              <button 
                className="btn-filtro-rapido"
                onClick={() => aplicarFiltroPreestablecido('ultimos30')}
              >
                Últimos 30 días
              </button>
            </div>
            
            {/* Filtro personalizado */}
            <div className="filtro-personalizado">
              <div className="fecha-input-group">
                <div className="fecha-input">
                  <label>Fecha inicio:</label>
                  <input
                    type="date"
                    value={filtroFechaInicio}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className="input-fecha"
                  />
                </div>
                <div className="fecha-input">
                  <label>Fecha fin:</label>
                  <input
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className="input-fecha"
                  />
                </div>
              </div>
              
              <div className="filtro-acciones">
                <button 
                  className="btn-limpiar-filtro"
                  onClick={limpiarFiltrosFecha}
                  disabled={!filtroFechaInicio && !filtroFechaFin}
                >
                  <i className="fas fa-eraser"></i> Limpiar filtros
                </button>
              </div>
            </div>
            
            {/* Indicador de filtro activo */}
            {(filtroFechaInicio || filtroFechaFin) && (
              <div className="filtro-activo-indicator">
                <i className="fas fa-filter"></i>
                <span>
                  Mostrando reportes del {filtroFechaInicio || '...'} al {filtroFechaFin || '...'}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Estadísticas */}
        <div className="panel-admin-cards">
          <div className="panel-admin-card total">
            <div className="panel-card-icon"><i className="fas fa-clipboard-list"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">Total Reportes</div>
              <div className="panel-card-value">{estadisticas.total}</div>
            </div>
          </div>
          
          <div className="panel-admin-card pendientes">
            <div className="panel-card-icon"><i className="fas fa-clock"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">Pendientes</div>
              <div className="panel-card-value">{estadisticas.pendientes}</div>
            </div>
          </div>
          
          <div className="panel-admin-card en-revision">
            <div className="panel-card-icon"><i className="fas fa-search"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">En Revisión</div>
              <div className="panel-card-value">{estadisticas.enRevision}</div>
            </div>
          </div>
          
          <div className="panel-admin-card asignados">
            <div className="panel-card-icon"><i className="fas fa-user-check"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">Asignados</div>
              <div className="panel-card-value">{estadisticas.asignados}</div>
            </div>
          </div>
          
          <div className="panel-admin-card en-proceso">
            <div className="panel-card-icon"><i className="fas fa-sync-alt"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">En Proceso</div>
              <div className="panel-card-value">{estadisticas.enProceso}</div>
            </div>
          </div>
          
          <div className="panel-admin-card resueltos">
            <div className="panel-card-icon"><i className="fas fa-check-circle"></i></div>
            <div className="panel-card-content">
              <div className="panel-card-title">Resueltos</div>
              <div className="panel-card-value">{estadisticas.resueltos}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de reportes */}
      <div className="reportes-content">
        {reportesFiltrados.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-icon"><i className="fas fa-road"></i></div>
            <h3>No hay reportes de bacheo</h3>
            <p>No se encontraron reportes con los filtros seleccionados.</p>
            {(filtroEstado !== 'todos' || filtroFechaInicio || filtroFechaFin) && (
              <div className="no-reports-actions">
                <button className="btn-reset-inline" onClick={() => setFiltroEstado('todos')}>
                  Ver todos los reportes
                </button>
                {(filtroFechaInicio || filtroFechaFin) && (
                  <button className="btn-reset-inline" onClick={limpiarFiltrosFecha}>
                    Limpiar filtros de fecha
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="report-list">
            {reportesFiltrados.map((reporte) => (
              <div 
                key={reporte.id || reporte.folio} 
                className={`report-card ${reporte.estado?.toLowerCase().replace('_', '-') || 'pendiente'}`}
                onClick={() => setReporteSeleccionado(reporte)}
              >
                <div className="report-card-header">
                  <div className="report-category">
                    <i className="fas fa-road"></i>
                    <span>Bacheo</span>
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
                    <span>{ReportesBacheoController.formatearFecha(reporte.fecha)}</span>
                  </div>

                  {reporte.brigadaAsignada && (
                    <div className="report-brigada-asignada">
                      <i className="fas fa-users"></i>
                      <span>Brigada: <strong>{reporte.brigadaAsignada.nombre}</strong></span>
                      <button 
                        className="btn-desasignar-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          desasignarReporte(reporte);
                        }}
                        title="Desasignar brigada"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
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
      
      {/* Modal de detalle */}
      {reporteSeleccionado && (
        <div className="reporte-modal">
          <div className="reporte-modal-content">
            <div className="reporte-modal-header">
              <h2>Bacheo - Folio: {reporteSeleccionado.folio}</h2>
              <button className="btn-cerrar" onClick={() => setReporteSeleccionado(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {mensajeExito && (
              <div className="mensaje-exito">
                <i className="fas fa-check-circle"></i> {mensajeExito}
              </div>
            )}
            
            <div className="reporte-modal-body">
              <div className="reporte-detalles">
                <div className="reporte-campo">
                  <div className="reporte-campo-label">Fecha:</div>
                  <div className="reporte-campo-valor">{ReportesBacheoController.formatearFecha(reporteSeleccionado.fecha)}</div>
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
                
                {/* Sección de brigada para reportes asignados */}
                {reporteSeleccionado.estado === 'asignado' && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Brigada Asignada:</div>
                    <div className="reporte-campo-valor">
                      {reporteSeleccionado.brigadaAsignada && (
                        <div className="brigada-asignada-info">
                          <i className="fas fa-users"></i>
                          <span>{reporteSeleccionado.brigadaAsignada.nombre}</span>
                          <small className="fecha-asignacion">
                            Asignado el: {ReportesBacheoController.formatearFecha(reporteSeleccionado.brigadaAsignada.fechaAsignacion)}
                          </small>
                        </div>
                      )}
                      
                      <select 
                        className="brigada-selector"
                        value={reporteSeleccionado.brigadaAsignada?.id || ''}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            if (reporteSeleccionado.brigadaAsignada) {
                              desasignarReporte(reporteSeleccionado);
                            }
                          } else {
                            asignarBrigadaReporte(reporteSeleccionado.id, e.target.value);
                          }
                        }}
                        disabled={asignandoBrigada}
                      >
                        <option value="">Sin asignar</option>
                        {brigadasDisponibles.map(brigada => (
                          <option key={brigada.id} value={brigada.id}>
                            {brigada.nombre} ({brigada.tipo === 'bacheo' ? 'Bacheo' : 'Mixta'})
                          </option>
                        ))}
                      </select>
                      
                      {asignandoBrigada && (
                        <span className="brigada-cargando">
                          <i className="fas fa-spinner fa-spin"></i> Actualizando brigada...
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Fecha de resolución */}
                {(reporteSeleccionado.estado === 'resuelto' || reporteSeleccionado.estado === 'completado') && reporteSeleccionado.fechaResolucion && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Fecha de resolución:</div>
                    <div className="reporte-campo-valor">
                      <i className="fas fa-calendar-check"></i> {ReportesBacheoController.formatearFecha(reporteSeleccionado.fechaResolucion)}
                    </div>
                  </div>
                )}
                
                {reporteSeleccionado.ubicacionObj && (
                  <div className="reporte-campo">
                    <div className="reporte-campo-label">Ubicación:</div>
                    <div className="reporte-campo-valor reporte-ubicacion">
                      <i className="fas fa-map-marker-alt"></i>
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
              <button className="btn-cerrar-modal" onClick={() => setReporteSeleccionado(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesBacheo;