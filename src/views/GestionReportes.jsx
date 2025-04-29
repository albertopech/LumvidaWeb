// src/views/GestionReportes.jsx
import { useState, useEffect, useRef } from "react";
import ReporteController from "../controllers/agregarReporte";
import "./Styles/gestionReportes.css";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Arreglo para íconos de Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para manejar eventos del mapa
function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    }
  });
  return null;
}

// Componente para actualizar la vista del mapa cuando cambian las coordenadas
function MapView({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, {
        animate: true,
        duration: 1
      });
    }
  }, [center, map]);
  
  return null;
}

const GestionReportes = () => {
  // Estados para gestionar reportes
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verDetallesId, setVerDetallesId] = useState(null);
  const [reporteEditar, setReporteEditar] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: "",
    busqueda: ""
  });
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const mapRef = useRef(null);
  
  // Estado para determinar si el usuario es administrador
  const [esAdmin, setEsAdmin] = useState(false);

  // Lista de categorías disponibles con iconos
  const categorias = [
    { id: "basura", nombre: "Basura Acumulada", icon: "📦" },
    { id: "alumbrado", nombre: "Alumbrado Público", icon: "💡" },
    { id: "drenaje", nombre: "Drenaje Obstruido", icon: "🚿" },
    { id: "bacheo", nombre: "Bacheo", icon: "🛣️" },
  ];

  // Lista de estados para los reportes
  const estados = [
    { id: "pendiente", nombre: "Pendiente", color: "#3498db" },
    { id: "en_revision", nombre: "En Revisión", color: "#f39c12" },
    { id: "en_proceso", nombre: "En Proceso", color: "#9b59b6" },
    { id: "resuelto", nombre: "Resuelto", color: "#2ecc71" },
    { id: "cancelado", nombre: "Cancelado", color: "#e74c3c" }
  ];

  // Verificar si el usuario es administrador
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    const rolesAdmin = ['jefe_ayuntatel', 'jefe_departamento', 'admin', 'auditor'];
    
    setEsAdmin(rolesAdmin.includes(userRole));
  }, []);

  // Cargar reportes al iniciar
  useEffect(() => {
    cargarReportes();
  }, [esAdmin]);

  // Función para cargar reportes
  const cargarReportes = async () => {
    setLoading(true);
    setError("");
    try {
      // Si es admin, cargar todos los reportes, sino solo los del usuario
      const resultado = esAdmin 
        ? await ReporteController.obtenerTodosReportes()
        : await ReporteController.obtenerReportes();
        
      if (resultado.success) {
        setReportes(resultado.data);
      } else {
        setError(resultado.error || "Error al cargar reportes");
      }
    } catch (error) {
      console.error("Error al cargar reportes:", error);
      setError("Error al cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros a los reportes
  const reportesFiltrados = () => {
    return reportes.filter(reporte => {
      const coincideCategoria = filtros.categoria === "" || reporte.categoria === filtros.categoria;
      
      const terminoBusqueda = filtros.busqueda.toLowerCase();
      const coincideBusqueda = terminoBusqueda === "" || 
                              reporte.folio.toLowerCase().includes(terminoBusqueda) ||
                              reporte.direccion.toLowerCase().includes(terminoBusqueda) ||
                              (reporte.comentario && reporte.comentario.toLowerCase().includes(terminoBusqueda));
      
      return coincideCategoria && coincideBusqueda;
    });
  };

  // Manejar cambios en los filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      categoria: "",
      busqueda: ""
    });
  };

  // Obtener nombre de categoría
  const getNombreCategoria = (id) => {
    const categoria = categorias.find(cat => cat.id === id);
    return categoria ? categoria.nombre : id;
  };

  // Obtener información del estado
  const getEstadoInfo = (id) => {
    const estado = estados.find(est => est.id === id);
    return estado || { id, nombre: id, color: "#999" };
  };

  // Ver detalles de un reporte
  const verDetalles = (id) => {
    setVerDetallesId(id);
    setReporteEditar(null);
  };

  // Cerrar vista de detalles
  const cerrarDetalles = () => {
    setVerDetallesId(null);
  };

  // Iniciar edición de un reporte
  const iniciarEdicion = (reporte) => {
    setReporteEditar({
      ...reporte,
      fecha: reporte.fecha || new Date().toISOString().split("T")[0]
    });
    setVerDetallesId(null);
  };

  // Cancelar edición
  const cancelarEdicion = () => {
    setReporteEditar(null);
  };

  // Manejar cambios en el formulario de edición
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setReporteEditar({
      ...reporteEditar,
      [name]: value
    });
  };

  // Manejar click en el mapa durante la edición
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    
    setReporteEditar(prev => ({
      ...prev,
      ubicacion: { lat, lng }
    }));
    
    // Actualizar dirección basada en las nuevas coordenadas
    obtenerDireccionDesdeCoordenadas(lat, lng);
  };
  
  // Función para obtener dirección desde coordenadas
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        let direccionFormateada = '';
        const addr = data.address;
        
        if (addr.road) {
          direccionFormateada += addr.road;
          if (addr.house_number) direccionFormateada += ' ' + addr.house_number;
        }
        
        if (addr.suburb || addr.neighbourhood) {
          if (direccionFormateada) direccionFormateada += ', ';
          direccionFormateada += (addr.suburb || addr.neighbourhood);
        }
        
        if (direccionFormateada) direccionFormateada += ', ';
        direccionFormateada += 'Chetumal';
        
        if (!direccionFormateada) {
          direccionFormateada = data.display_name;
        }
        
        setReporteEditar(prev => ({
          ...prev,
          direccion: direccionFormateada
        }));
      }
    } catch (error) {
      console.error("Error en geocodificación inversa:", error);
    }
  };
  
  // Buscar coordenadas a partir de una dirección
  const buscarCoordenadas = async (direccion) => {
    if (!direccion || direccion.length < 3) return;
    
    setAddressSearchLoading(true);
    
    try {
      let direccionCompleta = direccion;
      
      if (!direccion.toLowerCase().includes('chetumal')) {
        direccionCompleta = `${direccion}, Chetumal, Quintana Roo, México`;
      }
      
      const viewbox = "-88.3500,18.4500,-88.2500,18.5500";
      const queryParams = new URLSearchParams({
        format: 'json',
        q: direccionCompleta,
        limit: 5,
        countrycodes: 'mx',
        'accept-language': 'es',
        viewbox: viewbox,
        bounded: 1,
        addressdetails: 1
      });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${queryParams.toString()}`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        
        setReporteEditar(prev => ({
          ...prev,
          ubicacion: {
            lat: parseFloat(lat),
            lng: parseFloat(lon)
          }
        }));
        
        return;
      }
      
      // Intentar con variaciones
      const variaciones = [
        `Calle ${direccion}, Chetumal`,
        `Colonia ${direccion}, Chetumal`,
        `Avenida ${direccion}, Chetumal`
      ];
      
      for (const variacion of variaciones) {
        const params = new URLSearchParams({
          format: 'json',
          q: variacion,
          limit: 1,
          countrycodes: 'mx',
          'accept-language': 'es'
        });
        
        const respVariacion = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`
        );
        
        const dataVariacion = await respVariacion.json();
        
        if (dataVariacion && dataVariacion.length > 0) {
          const { lat, lon } = dataVariacion[0];
          
          setReporteEditar(prev => ({
            ...prev,
            ubicacion: {
              lat: parseFloat(lat),
              lng: parseFloat(lon)
            }
          }));
          
          break;
        }
      }
    } catch (error) {
      console.error("Error en geocoding:", error);
    } finally {
      setAddressSearchLoading(false);
    }
  };

  // Guardar cambios del reporte
  const guardarCambios = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      // Validar datos básicos
      if (!reporteEditar.folio || !reporteEditar.categoria || !reporteEditar.direccion) {
        setError("Por favor complete todos los campos obligatorios");
        return;
      }
      
      // Actualizar reporte
      const resultado = await ReporteController.actualizarReporte(reporteEditar);
      
      if (resultado.success) {
        setSuccess(`Reporte ${reporteEditar.folio} actualizado correctamente`);
        setReporteEditar(null);
        cargarReportes();
      } else {
        setError(resultado.error || "Error al actualizar reporte");
      }
    } catch (error) {
      console.error("Error al actualizar reporte:", error);
      setError("Ocurrió un error al actualizar el reporte");
    }
  };

  // Renderizar la vista de detalles de un reporte
  const renderDetallesReporte = () => {
    const reporte = reportes.find(r => r.id === verDetallesId);
    if (!reporte) return null;
    
    const estadoInfo = getEstadoInfo(reporte.estado);
    
    return (
      <div className="modal-overlay">
        <div className="modal-container detalles-reporte">
          <div className="modal-header">
            <h3>Detalles del Reporte</h3>
            <button className="close-modal" onClick={cerrarDetalles}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="detalles-grid">
              <div className="detalle-item">
                <span className="detalle-label">Folio:</span>
                <span className="detalle-valor">{reporte.folio}</span>
              </div>
              
              <div className="detalle-item">
                <span className="detalle-label">Categoría:</span>
                <span className="detalle-valor">
                  {categorias.find(c => c.id === reporte.categoria)?.icon || ''} {getNombreCategoria(reporte.categoria)}
                </span>
              </div>
              
              <div className="detalle-item">
                <span className="detalle-label">Estado:</span>
                <span className="detalle-estado" style={{backgroundColor: estadoInfo.color}}>
                  {estadoInfo.nombre}
                </span>
              </div>
              
              <div className="detalle-item">
                <span className="detalle-label">Fecha:</span>
                <span className="detalle-valor">{reporte.fecha || 'No disponible'}</span>
              </div>
              
              {/* Mostrar información del creador solo para administradores */}
              {esAdmin && reporte.nombreUsuario && (
                <div className="detalle-item">
                  <span className="detalle-label">Creado por:</span>
                  <span className="detalle-valor">{reporte.nombreUsuario}</span>
                </div>
              )}
              
              <div className="detalle-item full-width">
                <span className="detalle-label">Dirección:</span>
                <span className="detalle-valor">{reporte.direccion}</span>
              </div>
              
              <div className="detalle-item full-width">
                <span className="detalle-label">Comentario:</span>
                <div className="detalle-comentario">
                  {reporte.comentario || 'Sin comentarios adicionales'}
                </div>
              </div>
            </div>
            
            {reporte.ubicacion && (
              <div className="detalle-mapa">
                <h4>Ubicación</h4>
                <MapContainer 
                  center={[reporte.ubicacion.lat, reporte.ubicacion.lng]} 
                  zoom={15} 
                  style={{ height: "300px", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[reporte.ubicacion.lat, reporte.ubicacion.lng]}>
                    <Popup>
                      {reporte.direccion}
                    </Popup>
                  </Marker>
                </MapContainer>
                <div className="coordenadas-texto">
                  Latitud: {reporte.ubicacion.lat.toFixed(6)}, Longitud: {reporte.ubicacion.lng.toFixed(6)}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn-secundario" 
              onClick={cerrarDetalles}
            >
              Cerrar
            </button>
            <button 
              className="btn-primario" 
              onClick={() => iniciarEdicion(reporte)}
            >
              Editar Reporte
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar el formulario de edición
  const renderFormularioEdicion = () => {
    if (!reporteEditar) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-container edicion-reporte">
          <div className="modal-header">
            <h3>Editar Reporte</h3>
            <button className="close-modal" onClick={cancelarEdicion}>×</button>
          </div>
          
          <form onSubmit={guardarCambios}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="folio">Folio</label>
                  <input
                    type="text"
                    id="folio"
                    name="folio"
                    value={reporteEditar.folio}
                    readOnly
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    type="date"
                    id="fecha"
                    name="fecha"
                    value={reporteEditar.fecha}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Categoría</label>
                <div className="categoria-opciones">
                  {categorias.map(cat => (
                    <div 
                      key={cat.id}
                      className={`categoria-opcion ${reporteEditar.categoria === cat.id ? 'seleccionada' : ''}`}
                      onClick={() => setReporteEditar({...reporteEditar, categoria: cat.id})}
                    >
                      <span className="categoria-icono">{cat.icon}</span>
                      <span>{cat.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="direccion">Dirección</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={reporteEditar.direccion}
                    onChange={(e) => {
                      handleEditChange(e);
                      
                      // Configurar la búsqueda de coordenadas con debounce
                      if (searchTimeout) clearTimeout(searchTimeout);
                      setSearchTimeout(
                        setTimeout(() => {
                          if (e.target.value.length >= 3) {
                            buscarCoordenadas(e.target.value);
                          }
                        }, 800)
                      );
                    }}
                    className="form-control"
                    required
                    placeholder="Ingrese calle y colonia (ej: Av. Insurgentes, Centro)"
                  />
                  {addressSearchLoading && (
                    <span className="search-loading-indicator">⟳</span>
                  )}
                </div>
                <p className="form-help-text">
                  Puede escribir una dirección o hacer clic en el mapa para actualizar la ubicación
                </p>
              </div>
              
              {/* Mapa para editar ubicación */}
              {reporteEditar.ubicacion && (
                <div className="edicion-mapa-container">
                  <label>Ubicación en el Mapa</label>
                  <MapContainer 
                    center={[reporteEditar.ubicacion.lat, reporteEditar.ubicacion.lng]} 
                    zoom={15} 
                    style={{ height: "300px", width: "100%" }}
                    whenCreated={mapInstance => {
                      mapRef.current = mapInstance;
                    }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[reporteEditar.ubicacion.lat, reporteEditar.ubicacion.lng]} />
                    <MapEvents onMapClick={handleMapClick} />
                    <MapView center={[reporteEditar.ubicacion.lat, reporteEditar.ubicacion.lng]} />
                  </MapContainer>
                  <div className="coordenadas-texto">
                    Latitud: {reporteEditar.ubicacion.lat.toFixed(6)}, Longitud: {reporteEditar.ubicacion.lng.toFixed(6)}
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label>Estado del reporte</label>
                <div className="estado-opciones">
                  {estados.map(est => (
                    <div 
                      key={est.id}
                      className={`estado-opcion ${reporteEditar.estado === est.id ? 'seleccionada' : ''}`}
                      onClick={() => setReporteEditar({...reporteEditar, estado: est.id})}
                      style={{borderColor: reporteEditar.estado === est.id ? est.color : undefined}}
                    >
                      <span className="estado-indicador" style={{backgroundColor: est.color}}></span>
                      <span>{est.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="comentario">Comentario</label>
                <textarea
                  id="comentario"
                  name="comentario"
                  value={reporteEditar.comentario || ''}
                  onChange={handleEditChange}
                  className="form-control"
                  rows="4"
                  placeholder="Describa el problema reportado..."
                ></textarea>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secundario" 
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primario"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="gestion-reportes-container">
      <div className="gestion-header">
        <h2>{esAdmin ? "Gestión de Todos los Reportes" : "Mis Reportes"}</h2>
        <p>{esAdmin ? "Administra y revisa todos los reportes del sistema" : "Administra y revisa tus reportes de incidencias"}</p>
      </div>
      
      {/* Filtros y búsqueda */}
      <div className="filtros-container">
        <div className="filtros-form">
          <div className="filtro-grupo">
            <label htmlFor="busqueda">Buscar:</label>
            <input
              type="text"
              id="busqueda"
              name="busqueda"
              placeholder="Folio, dirección o comentario"
              value={filtros.busqueda}
              onChange={handleFiltroChange}
            />
          </div>
          
          <div className="filtro-grupo">
            <label htmlFor="categoria">Categoría:</label>
            <select
              id="categoria"
              name="categoria"
              value={filtros.categoria}
              onChange={handleFiltroChange}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          
          <button className="filtro-reset" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>
      
      {/* Mensajes de éxito o error */}
      {error && (
        <div className="mensaje error">
          <div className="mensaje-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mensaje success">
          <div className="mensaje-icon">✅</div>
          <p>{success}</p>
        </div>
      )}
      
      {/* Tabla de reportes */}
      <div className="tabla-reportes-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando reportes...</p>
          </div>
        ) : (
          <>
            <p className="total-reportes">
              {reportesFiltrados().length} reportes encontrados
            </p>
            <div className="tabla-scroll">
              <table className="tabla-reportes">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Categoría</th>
                    <th>Dirección</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    {esAdmin && <th>Usuario</th>}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reportesFiltrados().length > 0 ? (
                    reportesFiltrados().map(reporte => {
                      const estadoInfo = getEstadoInfo(reporte.estado);
                      return (
                        <tr key={reporte.id}>
                          <td>{reporte.folio}</td>
                          <td>
                            <span className="categoria-celda">
                              <span className="categoria-icono">
                                {categorias.find(c => c.id === reporte.categoria)?.icon || ''}
                              </span>
                              {getNombreCategoria(reporte.categoria)}
                            </span>
                          </td>
                          <td className="direccion-celda">{reporte.direccion}</td>
                          <td>{reporte.fecha || 'N/A'}</td>
                          <td>
                            <span 
                              className="estado-badge"
                              style={{backgroundColor: estadoInfo.color}}
                            >
                              {estadoInfo.nombre}
                            </span>
                          </td>
                          {esAdmin && (
                            <td>{reporte.nombreUsuario || 'Desconocido'}</td>
                          )}
                          <td className="acciones-celda">
                            <button 
                              className="btn-ver"
                              onClick={() => verDetalles(reporte.id)}
                              title="Ver detalles"
                            >
                              <span>👁️</span>
                            </button>
                            <button 
                              className="btn-editar"
                              onClick={() => iniciarEdicion(reporte)}
                              title="Editar reporte"
                            >
                              <span>✏️</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={esAdmin ? "7" : "6"} className="no-resultados">
                        No se encontraron reportes con los filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      
      {/* Modal de detalles de reporte */}
      {verDetallesId && renderDetallesReporte()}
      
      {/* Modal de edición de reporte */}
      {reporteEditar && renderFormularioEdicion()}
    </div>
  );
};

export default GestionReportes;