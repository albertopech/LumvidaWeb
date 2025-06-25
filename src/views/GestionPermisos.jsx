// src/views/GestionPermisos.jsx
import { useState, useEffect } from "react";
import { UsuarioController } from "../controllers/registroUsuarios";
import { PermisosController } from "../controllers/PermisosController";
import "./Styles/gestionPermisos.css";

const GestionPermisos = () => {
  // Estados para la gestión de usuarios y permisos
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [permisosEditando, setPermisosEditando] = useState({});
  const [filtro, setFiltro] = useState("");

  // Lista de módulos disponibles en el sistema
  const modulos = [
    { id: 'dashboard', nombre: 'Panel Administrativo', descripcion: 'Vista general del sistema y estadísticas básicas' },
    { id: 'users', nombre: 'Registrar Usuario', descripcion: 'Permite registrar nuevos usuarios en el sistema' },
    { id: 'reports', nombre: 'Registrar Reporte', descripcion: 'Creación de nuevos reportes de incidencias' },
    { id: 'admin_reports', nombre: 'Gestión de Reportes', descripcion: 'Administración y edición de reportes existentes' },
    { id: 'analytics', nombre: 'Estadísticas', descripcion: 'Visualización de estadísticas y gráficos del sistema' },
    { id: 'admin_users', nombre: 'Admin. Usuarios', descripcion: 'Administración avanzada de usuarios existentes' },
    { id: 'reportes_alumbrado', nombre: 'Reportes de Alumbrado', descripcion: 'Gestión específica de reportes de alumbrado público' },
    { id: 'reportes_bacheo', nombre: 'Reportes de Bacheo', descripcion: 'Gestión específica de reportes de bacheo de calles' },
    { id: 'reportes_basura', nombre: 'Reportes de Basura', descripcion: 'Gestión específica de reportes de basura acumulada' },
    { id: 'reportes_drenaje', nombre: 'Reportes de Drenaje', descripcion: 'Gestión específica de reportes de drenajes obstruidos' },
  ];

  // Cargar la lista de usuarios al iniciar
  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Función para cargar la lista de usuarios
  const cargarUsuarios = async () => {
    setLoading(true);
    setError("");
    try {
      const respuesta = await UsuarioController.obtenerUsuarios();
      if (respuesta.success) {
        setUsuarios(respuesta.data);
      } else {
        setError(respuesta.error || "Error al cargar usuarios");
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setError("Error al cargar la lista de usuarios");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios según el término de búsqueda
  const usuariosFiltrados = () => {
    if (!filtro) return usuarios;
    
    const terminoBusqueda = filtro.toLowerCase();
    return usuarios.filter(usuario => 
      usuario.usuario.toLowerCase().includes(terminoBusqueda) ||
      (usuario.nombre && usuario.nombre.toLowerCase().includes(terminoBusqueda)) ||
      (usuario.apellidos && usuario.apellidos.toLowerCase().includes(terminoBusqueda)) ||
      (usuario.email && usuario.email.toLowerCase().includes(terminoBusqueda))
    );
  };

  // Seleccionar un usuario para editar sus permisos
  const seleccionarUsuario = (usuario) => {
    setUsuarioSeleccionado(usuario);
    
    // Cargar los permisos actuales del usuario
    cargarPermisosUsuario(usuario);
  };

  // Cargar los permisos actuales del usuario
  const cargarPermisosUsuario = async (usuario) => {
    setLoading(true);
    try {
      // Obtenemos los permisos personalizados del usuario o los permisos predeterminados de su rol
      const permisos = await PermisosController.obtenerPermisosUsuario(usuario.id);
      
      if (permisos.success) {
        // Establecemos los permisos para edición
        const modulosPermitidos = permisos.data;
        
        // Crear objeto de permisos para edición
        const permisosObj = {};
        modulos.forEach(modulo => {
          permisosObj[modulo.id] = modulosPermitidos.includes(modulo.id);
        });
        
        setPermisosEditando(permisosObj);
      } else {
        setError("Error al cargar permisos del usuario");
        
        // Si hay error, establecer todos los permisos como falsos
        const permisosVacios = {};
        modulos.forEach(modulo => {
          permisosVacios[modulo.id] = false;
        });
        setPermisosEditando(permisosVacios);
      }
    } catch (error) {
      console.error("Error al cargar permisos:", error);
      setError("Error al cargar los permisos del usuario");
      
      // Si hay error, establecer todos los permisos como falsos
      const permisosVacios = {};
      modulos.forEach(modulo => {
        permisosVacios[modulo.id] = false;
      });
      setPermisosEditando(permisosVacios);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de permisos
  const handlePermisoChange = (moduloId) => {
    setPermisosEditando(prev => ({
      ...prev,
      [moduloId]: !prev[moduloId]
    }));
  };

  // Guardar los permisos del usuario
  const guardarPermisos = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      if (!usuarioSeleccionado) {
        setError("No hay usuario seleccionado");
        return;
      }
      
      // Convertir objeto de permisos a array de módulos permitidos
      const modulosPermitidos = Object.entries(permisosEditando)
        .filter(([_, permitido]) => permitido)
        .map(([moduloId, _]) => moduloId);
      
      // Guardar los permisos personalizados
      const resultado = await PermisosController.guardarPermisosUsuario(
        usuarioSeleccionado.id,
        modulosPermitidos
      );
      
      if (resultado.success) {
        setSuccess(`Permisos actualizados correctamente para ${usuarioSeleccionado.usuario}`);
        // Actualizar la lista de usuarios
        cargarUsuarios();
      } else {
        setError(resultado.error || "Error al guardar permisos");
      }
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      setError("Error al guardar los permisos del usuario");
    } finally {
      setLoading(false);
    }
  };

  // Restablecer permisos predeterminados según el rol
  const restablecerPermisosRol = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      if (!usuarioSeleccionado) {
        setError("No hay usuario seleccionado");
        return;
      }
      
      // Eliminar permisos personalizados
      const resultado = await PermisosController.eliminarPermisosPersonalizados(usuarioSeleccionado.id);
      
      if (resultado.success) {
        setSuccess(`Permisos restablecidos a los predeterminados del rol para ${usuarioSeleccionado.usuario}`);
        // Volver a cargar los permisos actualizados
        cargarPermisosUsuario(usuarioSeleccionado);
      } else {
        setError(resultado.error || "Error al restablecer permisos");
      }
    } catch (error) {
      console.error("Error al restablecer permisos:", error);
      setError("Error al restablecer los permisos del usuario");
    } finally {
      setLoading(false);
    }
  };

  // Obtener el nombre del rol
  const obtenerNombreRol = (rolId) => {
    return PermisosController.obtenerNombreRol(rolId);
  };

  return (
    <div className="gestion-permisos-container">
      <div className="permisos-header">
        <h2>Gestión de Permisos de Usuarios</h2>
        <p>Asigne pantallas y módulos a los usuarios del sistema</p>
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
      
      <div className="permisos-layout">
        {/* Panel izquierdo - Lista de usuarios */}
        <div className="usuarios-panel">
          <div className="panel-header">
            <h3>Usuarios del Sistema</h3>
            <div className="busqueda-usuarios">
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
              {filtro && (
                <button 
                  className="btn-limpiar-busqueda"
                  onClick={() => setFiltro("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          <div className="lista-usuarios">
            {loading && !usuarioSeleccionado ? (
              <div className="cargando-usuarios">
                <div className="loading-spinner"></div>
                <p>Cargando usuarios...</p>
              </div>
            ) : (
              <>
                {usuariosFiltrados().length > 0 ? (
                  usuariosFiltrados().map(usuario => (
                    <div 
                      key={usuario.id}
                      className={`usuario-item ${usuarioSeleccionado?.id === usuario.id ? 'seleccionado' : ''}`}
                      onClick={() => seleccionarUsuario(usuario)}
                    >
                      <div className="usuario-avatar">
                        {usuario.nombre && usuario.apellidos ? 
                          `${usuario.nombre[0]}${usuario.apellidos[0]}`.toUpperCase() : 
                          usuario.usuario[0].toUpperCase()
                        }
                      </div>
                      <div className="usuario-info">
                        <div className="usuario-nombre">{usuario.usuario}</div>
                        <div className="usuario-detalles">
                          <span className="usuario-rol">{obtenerNombreRol(usuario.rol)}</span>
                          {usuario.tienePermisosPersonalizados && (
                            <span className="badge-personalizado">Permisos personalizados</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-resultados">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Panel derecho - Edición de permisos */}
        <div className="permisos-panel">
          {!usuarioSeleccionado ? (
            <div className="seleccionar-usuario-msg">
              <div className="icon-seleccionar">👈</div>
              <h3>Seleccione un usuario</h3>
              <p>Elija un usuario de la lista para gestionar sus permisos de acceso.</p>
            </div>
          ) : loading ? (
            <div className="cargando-permisos">
              <div className="loading-spinner"></div>
              <p>Cargando permisos...</p>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <h3>Permisos de {usuarioSeleccionado.usuario}</h3>
                <div className="usuario-meta">
                  <div className="usuario-rol-info">
                    Rol: <span className="rol-badge">{obtenerNombreRol(usuarioSeleccionado.rol)}</span>
                  </div>
                  {usuarioSeleccionado.tienePermisosPersonalizados && (
                    <div className="permisos-personalizados-info">
                      Este usuario tiene permisos personalizados
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modulos-permisos">
                <p className="instrucciones">
                  Seleccione los módulos a los que tendrá acceso este usuario:
                </p>
                
                {modulos.map(modulo => (
                  <div key={modulo.id} className="modulo-permiso-item">
                    <label className="permiso-toggle">
                      <input
                        type="checkbox"
                        checked={permisosEditando[modulo.id] || false}
                        onChange={() => handlePermisoChange(modulo.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <div className="modulo-info">
                      <div className="modulo-nombre">{modulo.nombre}</div>
                      <div className="modulo-descripcion">{modulo.descripcion}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="acciones-permisos">
                <button 
                  className="btn-secundario" 
                  onClick={restablecerPermisosRol}
                  disabled={loading}
                >
                  Restablecer permisos predeterminados
                </button>
                <button 
                  className="btn-primario" 
                  onClick={guardarPermisos}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionPermisos;