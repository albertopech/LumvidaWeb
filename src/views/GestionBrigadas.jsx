// src/views/GestionBrigadas.jsx
import React, { useState, useEffect } from 'react';
import { BrigadaController } from '../controllers/BrigadaController';
import { TIPOS_BRIGADA, ESTADOS_BRIGADA, ROLES_BRIGADA } from '../models/brigadaModel';
import './Styles/gestionBrigadas.css';

const GestionBrigadas = () => {
  // Estados principales
  const [brigadas, setBrigadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados del modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [brigadaEditando, setBrigadaEditando] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: '',
    miembros: [],
    zonasCobertura: [],
    equipamiento: []
  });

  // Cargar brigadas al montar el componente
  useEffect(() => {
    cargarBrigadas();
  }, []);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    aplicarFiltros();
  }, [filtroTipo, filtroEstado]);

  // Cargar todas las brigadas
  const cargarBrigadas = async () => {
    setLoading(true);
    setError('');
    
    try {
      const resultado = await BrigadaController.obtenerBrigadas({ activa: true });
      
      if (resultado.success) {
        setBrigadas(resultado.data);
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      console.error("Error al cargar brigadas:", error);
      setError("Error al cargar las brigadas");
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros a las brigadas
  const aplicarFiltros = async () => {
    setLoading(true);
    
    const filtros = { activa: true };
    if (filtroTipo) filtros.tipo = filtroTipo;
    if (filtroEstado) filtros.estado = filtroEstado;
    
    try {
      const resultado = await BrigadaController.obtenerBrigadas(filtros);
      
      if (resultado.success) {
        setBrigadas(resultado.data);
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      setError("Error al filtrar brigadas");
    } finally {
      setLoading(false);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      let resultado;
      
      if (modoEdicion && brigadaEditando) {
        // Actualizar brigada existente
        resultado = await BrigadaController.actualizarBrigada(brigadaEditando.id, formData);
      } else {
        // Crear nueva brigada
        resultado = await BrigadaController.crearBrigada(formData);
      }
      
      if (resultado.success) {
        setSuccess(resultado.message);
        cerrarModal();
        cargarBrigadas();
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      console.error("Error al guardar brigada:", error);
      setError("Error al guardar la brigada");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para nueva brigada
  const abrirModalNueva = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo: '',
      miembros: [],
      zonasCobertura: [],
      equipamiento: []
    });
    setBrigadaEditando(null);
    setModoEdicion(false);
    setMostrarModal(true);
  };

  // Abrir modal para editar brigada
  const abrirModalEdicion = (brigada) => {
    setFormData({
      nombre: brigada.nombre || '',
      descripcion: brigada.descripcion || '',
      tipo: brigada.tipo || '',
      miembros: brigada.miembros || [],
      zonasCobertura: brigada.zonasCobertura || [],
      equipamiento: brigada.equipamiento || []
    });
    setBrigadaEditando(brigada);
    setModoEdicion(true);
    setMostrarModal(true);
  };

  // Cerrar modal
  const cerrarModal = () => {
    setMostrarModal(false);
    setBrigadaEditando(null);
    setModoEdicion(false);
    setError('');
  };

  // Agregar nuevo miembro
  const agregarMiembro = () => {
    setFormData(prev => ({
      ...prev,
      miembros: [...prev.miembros, {
        nombre: '',
                            rol: ROLES_BRIGADA.OPERARIO,
        telefono: '',
        email: '',
        esLider: false
      }]
    }));
  };

  // Actualizar miembro
  const actualizarMiembro = (index, campo, valor) => {
    const nuevosMiembros = [...formData.miembros];
    nuevosMiembros[index] = {
      ...nuevosMiembros[index],
      [campo]: valor
    };
    setFormData(prev => ({
      ...prev,
      miembros: nuevosMiembros
    }));
  };

  // Eliminar miembro
  const eliminarMiembro = (index) => {
    setFormData(prev => ({
      ...prev,
      miembros: prev.miembros.filter((_, i) => i !== index)
    }));
  };

  // Cambiar estado de brigada
  const cambiarEstado = async (brigadaId, nuevoEstado) => {
    try {
      const resultado = await BrigadaController.cambiarEstadoBrigada(brigadaId, nuevoEstado);
      
      if (resultado.success) {
        setSuccess("Estado actualizado correctamente");
        cargarBrigadas();
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      setError("Error al cambiar estado");
    }
  };

  // Eliminar brigada
  const eliminarBrigada = async (brigadaId, nombreBrigada) => {
    if (!window.confirm(`¿Está seguro de eliminar la brigada "${nombreBrigada}"?`)) {
      return;
    }
    
    try {
      const resultado = await BrigadaController.eliminarBrigada(brigadaId);
      
      if (resultado.success) {
        setSuccess("Brigada eliminada correctamente");
        cargarBrigadas();
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      setError("Error al eliminar brigada");
    }
  };

  // Limpiar mensajes después de 3 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Funciones auxiliares para obtener nombres legibles
  const obtenerNombreTipo = (tipo) => {
    const tipos = {
      [TIPOS_BRIGADA.BASURA]: 'Basura Acumulada',
      [TIPOS_BRIGADA.ALUMBRADO]: 'Alumbrado Público',
      [TIPOS_BRIGADA.DRENAJE]: 'Drenajes Obstruidos',
      [TIPOS_BRIGADA.BACHEO]: 'Bacheo',
      [TIPOS_BRIGADA.MIXTA]: 'Brigada Mixta'
    };
    return tipos[tipo] || tipo;
  };

  const obtenerNombreEstado = (estado) => {
    const estados = {
      [ESTADOS_BRIGADA.ACTIVA]: 'Activa',
      [ESTADOS_BRIGADA.INACTIVA]: 'Inactiva',
      [ESTADOS_BRIGADA.EN_MISION]: 'En Misión',
      [ESTADOS_BRIGADA.MANTENIMIENTO]: 'Mantenimiento'
    };
    return estados[estado] || estado;
  };

  const obtenerNombreRol = (rol) => {
    const roles = {
      [ROLES_BRIGADA.SUPERVISOR]: 'Supervisor',
      [ROLES_BRIGADA.TECNICO]: 'Técnico',
      [ROLES_BRIGADA.OPERARIO]: 'Operario',
      [ROLES_BRIGADA.CONDUCTOR]: 'Conductor'
    };
    return roles[rol] || rol;
  };

  // Obtener clase CSS para el estado
  const getEstadoClass = (estado) => {
    switch(estado) {
      case ESTADOS_BRIGADA.ACTIVA: return 'activa';
      case ESTADOS_BRIGADA.EN_MISION: return 'en-mision';
      case ESTADOS_BRIGADA.INACTIVA: return 'inactiva';
      case ESTADOS_BRIGADA.MANTENIMIENTO: return 'mantenimiento';
      default: return 'activa';
    }
  };

  return (
    <div className="gestion-brigadas-container">
      {/* Header */}
      <div className="brigadas-header">
        <h2>Gestión de Brigadas</h2>
        <button 
          className="btn-nueva-brigada"
          onClick={abrirModalNueva}
        >
          <i className="fas fa-plus"></i> Nueva Brigada
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mensaje error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mensaje success">
          <i className="fas fa-check-circle"></i>
          <span>{success}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtros-form">
          <div className="filtro-grupo">
            <label>Tipo de Brigada:</label>
            <select 
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value={TIPOS_BRIGADA.BASURA}>Basura Acumulada</option>
              <option value={TIPOS_BRIGADA.ALUMBRADO}>Alumbrado Público</option>
              <option value={TIPOS_BRIGADA.DRENAJE}>Drenajes Obstruidos</option>
              <option value={TIPOS_BRIGADA.BACHEO}>Bacheo</option>
              <option value={TIPOS_BRIGADA.MIXTA}>Brigada Mixta</option>
            </select>
          </div>
          
          <div className="filtro-grupo">
            <label>Estado:</label>
            <select 
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value={ESTADOS_BRIGADA.ACTIVA}>Activa</option>
              <option value={ESTADOS_BRIGADA.INACTIVA}>Inactiva</option>
              <option value={ESTADOS_BRIGADA.EN_MISION}>En Misión</option>
              <option value={ESTADOS_BRIGADA.MANTENIMIENTO}>Mantenimiento</option>
            </select>
          </div>
          
          <button 
            className="btn-limpiar-filtros"
            onClick={() => {
              setFiltroTipo('');
              setFiltroEstado('');
            }}
          >
            <i className="fas fa-times"></i> Limpiar
          </button>
        </div>
      </div>

      {/* Lista de brigadas */}
      <div className="brigadas-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando brigadas...</p>
          </div>
        ) : brigadas.length === 0 ? (
          <div className="no-brigadas">
            <div className="no-brigadas-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3>No hay brigadas registradas</h3>
            <p>Comience creando su primera brigada para asignar reportes.</p>
            <button className="btn-crear-primera" onClick={abrirModalNueva}>
              <i className="fas fa-plus"></i> Crear Primera Brigada
            </button>
          </div>
        ) : (
          <div className="brigadas-grid">
            {brigadas.map(brigada => (
              <div key={brigada.id} className="brigada-card">
                <div className="brigada-card-header">
                  <h3 className="brigada-nombre">{brigada.nombre}</h3>
                  <span className={`estado-badge ${getEstadoClass(brigada.estado)}`}>
                    {obtenerNombreEstado(brigada.estado)}
                  </span>
                </div>

                <div className="brigada-card-body">
                  <div className="brigada-info">
                    <div className="info-item">
                      <i className="fas fa-tag"></i>
                      <span>Tipo: {obtenerNombreTipo(brigada.tipo)}</span>
                    </div>
                    
                    <div className="info-item">
                      <i className="fas fa-users"></i>
                      <span>Miembros: {brigada.miembros?.length || 0}</span>
                    </div>
                    
                    <div className="info-item">
                      <i className="fas fa-clipboard-list"></i>
                      <span>Reportes activos: {brigada.reportesAsignados?.length || 0}</span>
                    </div>
                    
                    <div className="info-item">
                      <i className="fas fa-check-circle"></i>
                      <span>Completados: {brigada.estadisticas?.reportesCompletados || 0}</span>
                    </div>
                  </div>

                  {brigada.descripcion && (
                    <div className="brigada-descripcion">
                      <p>{brigada.descripcion}</p>
                    </div>
                  )}

                  {/* Lista de miembros */}
                  {brigada.miembros && brigada.miembros.length > 0 && (
                    <div className="brigada-miembros">
                      <h4>Miembros:</h4>
                      <div className="miembros-lista">
                        {brigada.miembros.slice(0, 3).map((miembro, index) => (
                          <div key={index} className="miembro-item">
                            <span className="miembro-nombre">{miembro.nombre}</span>
                            <span className="miembro-rol">({obtenerNombreRol(miembro.rol)})</span>
                            {miembro.esLider && <span className="lider-badge">Líder</span>}
                          </div>
                        ))}
                        {brigada.miembros.length > 3 && (
                          <div className="miembros-mas">
                            +{brigada.miembros.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="brigada-card-footer">
                  <div className="acciones-principales">
                    <button 
                      className="btn-editar"
                      onClick={() => abrirModalEdicion(brigada)}
                    >
                      <i className="fas fa-edit"></i> Editar
                    </button>
                    
                    <button className="btn-ver-reportes">
                      <i className="fas fa-list"></i> Reportes
                    </button>
                  </div>
                  
                  <div className="acciones-secundarias">
                    <select 
                      className="estado-selector"
                      value={brigada.estado}
                      onChange={(e) => cambiarEstado(brigada.id, e.target.value)}
                    >
                      <option value={ESTADOS_BRIGADA.ACTIVA}>Activa</option>
                      <option value={ESTADOS_BRIGADA.INACTIVA}>Inactiva</option>
                      <option value={ESTADOS_BRIGADA.EN_MISION}>En Misión</option>
                      <option value={ESTADOS_BRIGADA.MANTENIMIENTO}>Mantenimiento</option>
                    </select>
                    
                    <button 
                      className="btn-eliminar"
                      onClick={() => eliminarBrigada(brigada.id, brigada.nombre)}
                      title="Eliminar brigada"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar brigada */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modoEdicion ? 'Editar Brigada' : 'Nueva Brigada'}
              </h3>
              <button className="btn-cerrar" onClick={cerrarModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="brigada-form">
              <div className="modal-body">
                {/* Información básica */}
                <div className="form-section">
                  <h4>Información Básica</h4>
                  
                  <div className="form-group">
                    <label>Nombre de la Brigada *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({...prev, nombre: e.target.value}))}
                      required
                      placeholder="Ej: Brigada Alumbrado Norte"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo de Brigada *</label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => setFormData(prev => ({...prev, tipo: e.target.value}))}
                        required
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value={TIPOS_BRIGADA.BASURA}>Basura Acumulada</option>
                        <option value={TIPOS_BRIGADA.ALUMBRADO}>Alumbrado Público</option>
                        <option value={TIPOS_BRIGADA.DRENAJE}>Drenajes Obstruidos</option>
                        <option value={TIPOS_BRIGADA.BACHEO}>Bacheo</option>
                        <option value={TIPOS_BRIGADA.MIXTA}>Brigada Mixta</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({...prev, descripcion: e.target.value}))}
                      placeholder="Descripción opcional de la brigada"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Miembros de la brigada */}
                <div className="form-section">
                  <div className="section-header">
                    <h4>Miembros de la Brigada</h4>
                    <button 
                      type="button"
                      className="btn-agregar-miembro"
                      onClick={agregarMiembro}
                    >
                      <i className="fas fa-plus"></i> Agregar Miembro
                    </button>
                  </div>

                  {formData.miembros.length === 0 ? (
                    <div className="sin-miembros">
                      <p>No hay miembros agregados. Haga clic en "Agregar Miembro" para comenzar.</p>
                    </div>
                  ) : (
                    <div className="miembros-form-lista">
                      {formData.miembros.map((miembro, index) => (
                        <div key={index} className="miembro-form-item">
                          <div className="miembro-form-header">
                            <span className="miembro-numero">Miembro {index + 1}</span>
                            <button
                              type="button"
                              className="btn-eliminar-miembro"
                              onClick={() => eliminarMiembro(index)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-group">
                              <label>Nombre completo *</label>
                              <input
                                type="text"
                                value={miembro.nombre}
                                onChange={(e) => actualizarMiembro(index, 'nombre', e.target.value)}
                                required
                                placeholder="Nombre completo del miembro"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Rol</label>
                              <select
                                value={miembro.rol}
                                onChange={(e) => actualizarMiembro(index, 'rol', e.target.value)}
                              >
                                <option value={ROLES_BRIGADA.OPERARIO}>Operario</option>
                                <option value={ROLES_BRIGADA.TECNICO}>Técnico</option>
                                <option value={ROLES_BRIGADA.SUPERVISOR}>Supervisor</option>
                                <option value={ROLES_BRIGADA.CONDUCTOR}>Conductor</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-group">
                              <label>Teléfono</label>
                              <input
                                type="tel"
                                value={miembro.telefono}
                                onChange={(e) => actualizarMiembro(index, 'telefono', e.target.value)}
                                placeholder="Número de teléfono"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Email</label>
                              <input
                                type="email"
                                value={miembro.email}
                                onChange={(e) => actualizarMiembro(index, 'email', e.target.value)}
                                placeholder="Correo electrónico"
                              />
                            </div>
                          </div>
                          
                          <div className="form-group">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={miembro.esLider}
                                onChange={(e) => actualizarMiembro(index, 'esLider', e.target.checked)}
                              />
                              <span className="checkmark"></span>
                              Es líder de brigada
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-guardar"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i> {modoEdicion ? 'Actualizar' : 'Crear'} Brigada
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionBrigadas;