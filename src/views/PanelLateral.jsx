// src/views/PanelLateral.jsx - Con sistema de notificaciones específico por tipo
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Styles/PanelLateral.css";
// Importar componentes existentes
import RegistroUsuarios from '../views/RegistroUsuarios';
import AgregarReporte from '../views/AgregarReporte';
import Estadisticas from '../views/Estadisticas';
import ReportesBasura from '../views/ReportesBasura';
import ReportesAlumbrado from '../views/ReportesAlumbrado';
import ReportesBacheo from '../views/ReportesBacheo';
import ReportesDrenaje from '../views/ReportesDrenaje';
import AdminUsuarios from '../views/AdminUsuarios';
import GestionReportes from '../views/GestionReportes';
import GestionPermisos from '../views/GestionPermisos';
import DashboardJefeDepartamento from '../views/DashboardJefeDepartamento';
import GestionBrigadas from '../views/GestionBrigadas';

// Importar controladores
import { PermisosController } from '../controllers/PermisosController';
import { NotificacionesController } from '../controllers/NotificacionesController';

const PanelLateral = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    nombre: 'Cargando...',
    email: '...',
    iniciales: '...',
    rol: '',
    id: null
  });
  
  // Estados para notificaciones - SIMPLIFICADOS
  const [contadorNotificaciones, setContadorNotificaciones] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  
  // Estado para almacenar los módulos permitidos para el usuario actual
  const [modulosPermitidos, setModulosPermitidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioYaInicializado, setUsuarioYaInicializado] = useState(false);
  
  const navigate = useNavigate();

  const icons = {
    chevronLeft: '←',
    chevronRight: '→',
    home: '🏠',
    users: '👥',
    user: '👤',
    analytics: '📊',
    report: '📝',
    bell: '🔔',
    search: '🔍',
    logout: '🚪',
    menu: '☰',
    permisos: '🔑',
    dashboard: '📉',
    map: '🗺️',
    message: '✉️',
    advanced: '📋',
    brigadas: '👷‍♂️',
    // ICONOS PARA REPORTES ESPECÍFICOS
    alumbrado: '💡',
    bacheo: '🛣️',
    basura: '🗑️',
    drenaje: '💧'
  };

  // Callback SIMPLIFICADO para manejar nuevas notificaciones
  const manejarNuevaNotificacion = (notificacion, evento) => {
    if (evento && evento.tipo === 'actualizar_contador') {
      setContadorNotificaciones(NotificacionesController.obtenerContadorNoLeidas());
      setNotificaciones(NotificacionesController.obtenerNotificaciones());
      return;
    }

    if (notificacion) {
      console.log('🔔 Nueva notificación:', notificacion);
      setContadorNotificaciones(NotificacionesController.obtenerContadorNoLeidas());
      setNotificaciones(NotificacionesController.obtenerNotificaciones());
    }
  };

  // Cargar información del usuario y configurar notificaciones
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Verificar autenticación
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuthenticated) {
          navigate('/login');
          return;
        }
        
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.error("No se encontró ID de usuario en localStorage");
          navigate('/login');
          return;
        }
        
        // Obtener datos del usuario
        const username = localStorage.getItem('username') || 'Usuario';
        const nombreCompleto = localStorage.getItem('userNombre') || username;
        const email = localStorage.getItem('userEmail') || '';
        const rol = localStorage.getItem('userRole') || 'capturista';
        
        const obtenerIniciales = (nombre) => {
          if (!nombre) return '?';
          const partes = nombre.split(' ');
          if (partes.length > 1) {
            return (partes[0][0] + partes[1][0]).toUpperCase();
          }
          return (nombre[0] || '?').toUpperCase();
        };
        
        // Actualizar estado del usuario
        setCurrentUser({
          nombre: nombreCompleto,
          iniciales: obtenerIniciales(nombreCompleto),
          rol: rol,
          id: userId
        });

        // Cargar permisos
        try {
          const permisosResponse = await PermisosController.obtenerPermisosUsuario(userId);
          
          if (permisosResponse.success) {
            setModulosPermitidos(permisosResponse.data || []);
            
            if (!usuarioYaInicializado) {
              if (rol === 'jefe_departamento' && permisosResponse.data.includes('dashboard_jefe')) {
                setActiveItem('dashboard_jefe');
              } else if (activeItem === 'dashboard' && !permisosResponse.data.includes('dashboard')) {
                if (permisosResponse.data.length > 0) {
                  setActiveItem(permisosResponse.data[0]);
                }
              }
              setUsuarioYaInicializado(true);
            }
          } else {
            console.error("Error al cargar permisos:", permisosResponse.error);
            const permisosRol = PermisosController.obtenerPermisosModulos(rol);
            setModulosPermitidos(permisosRol);
            
            if (!usuarioYaInicializado) {
              if (activeItem === 'dashboard' && !permisosRol.includes('dashboard')) {
                if (permisosRol.length > 0) {
                  setActiveItem(permisosRol[0]);
                }
              }
              setUsuarioYaInicializado(true);
            }
          }
        } catch (permisosError) {
          console.error("Error grave al cargar permisos:", permisosError);
          const permisosRol = PermisosController.obtenerPermisosModulos(rol);
          setModulosPermitidos(permisosRol);
          if (!usuarioYaInicializado) {
            setUsuarioYaInicializado(true);
          }
        }

        // 🔔 CONFIGURAR NOTIFICACIONES SIMPLIFICADAS
        try {
          await NotificacionesController.solicitarPermisosNotificacion();
          
          console.log('🔔 Inicializando notificaciones con rol:', rol);
          const resultado = NotificacionesController.inicializar(manejarNuevaNotificacion, rol);
          
          if (resultado.success) {
            setNotificaciones(NotificacionesController.obtenerNotificaciones());
            setContadorNotificaciones(NotificacionesController.obtenerContadorNoLeidas());
            console.log('✅ Notificaciones configuradas');
            
            // DEBUGGING: Mostrar estado del sistema
            console.log('🔍 Estado del sistema:', NotificacionesController.obtenerEstado());
          }
        } catch (notifError) {
          console.error('Error al configurar notificaciones:', notifError);
        }
        
      } catch (error) {
        console.error("Error al cargar información del usuario:", error);
        const username = localStorage.getItem('username') || 'Usuario';
        const rol = localStorage.getItem('userRole') || 'capturista';
        
        setCurrentUser({
          nombre: username,
          email: username,
          iniciales: username.charAt(0).toUpperCase() || 'U',
          rol: rol,
          id: null
        });
        
        const permisosBasicos = PermisosController.obtenerPermisosModulos(rol);
        setModulosPermitidos(permisosBasicos);
      } finally {
        setLoading(false);
      }
    };
    
    cargarUsuario();
    
    // Cleanup al desmontar el componente
    return () => {
      NotificacionesController.removerCallback(manejarNuevaNotificacion);
    };
  }, [navigate, activeItem, usuarioYaInicializado]);

  // Toggle notificaciones SIN auto-marcar
  const toggleNotificaciones = () => {
    setMostrarNotificaciones(!mostrarNotificaciones);
    
    // REMOVIDO: No marcar automáticamente como leídas
    // Solo abrir/cerrar el panel
  };

  const handleItemClick = (id) => {
    if (modulosPermitidos.includes(id)) {
      setActiveItem(id);
      console.log("Cambiando a módulo:", id);
    } else {
      console.warn("Módulo no disponible:", id);
    }
  };

  const toggleMobileSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  const handleLogout = async () => {
    try {
      const confirmar = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (!confirmar) return;
      
      // Destruir sistema de notificaciones
      NotificacionesController.destruir();
      
      // Limpiar localStorage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userNombre');
      localStorage.removeItem('userEmail');
      
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Hubo un problema al cerrar sesión. Por favor, intenta nuevamente.");
    }
  };

  // Items del menú
  const allMenuItems = [
    { id: 'dashboard', icon: icons.home, label: 'Panel Administrativo' },
    { id: 'dashboard_jefe', icon: icons.dashboard, label: 'Dashboard Departamentos' },
    { id: 'users', icon: icons.user, label: 'Registrar Usuario' },
    { id: 'reports', icon: icons.report, label: 'Registrar Reporte' },
    { id: 'admin_reports', icon: icons.report, label: 'Gestión de Reportes' },
    { id: 'analytics', icon: icons.analytics, label: 'Estadísticas' },
    { id: 'admin_users', icon: icons.users, label: 'Admin. Usuarios' },
    { id: 'admin_permisos', icon: icons.permisos, label: 'Gestión de Permisos' },
    { id: 'admin_brigadas', icon: icons.brigadas, label: 'Gestión de Brigadas' },
    { id: 'reportes_alumbrado', icon: icons.alumbrado, label: 'Reportes de Alumbrado' },
    { id: 'reportes_bacheo', icon: icons.bacheo, label: 'Reportes de Bacheo' },
    { id: 'reportes_basura', icon: icons.basura, label: 'Reportes de Basura' },
    { id: 'reportes_drenaje', icon: icons.drenaje, label: 'Reportes de Drenaje' },
  ];

  const menuItems = allMenuItems.filter(item => {
    return modulosPermitidos.includes(item.id);
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setExpanded(false);
      } else {
        setExpanded(true);
        setShowSidebar(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderContent = () => {
    console.log("Renderizando contenido con activeItem:", activeItem);
    
    if (!modulosPermitidos.includes(activeItem)) {
      if (modulosPermitidos.length > 0) {
        setActiveItem(modulosPermitidos[0]);
      }
      return (
        <div className="unauthorized-message">
          <div className="unauthorized-content">
          </div>
        </div>
      );
    }

    if (activeItem === 'dashboard') {
      switch (currentUser.rol) {
        case 'basura':
          return <ReportesBasura />;
        case 'alumbrado':
          return <ReportesAlumbrado />;
        case 'bacheo':
          return <ReportesBacheo />;
        case 'drenaje':
          return <ReportesDrenaje />;
        default:
          return <ReportesBasura />;
      }
    }

    switch (activeItem) {
      case 'users':
        return <RegistroUsuarios />;
      case 'reports':
        return <AgregarReporte />;
      case 'analytics':
        return <Estadisticas />;
      case 'admin_users':
        return <AdminUsuarios />;
      case 'admin_reports':
        return <GestionReportes />;
      case 'admin_permisos':
        return <GestionPermisos />;
      case 'admin_brigadas':
        return <GestionBrigadas />;
      case 'dashboard_jefe':
        return <DashboardJefeDepartamento />;
      case 'reportes_alumbrado':
        return <ReportesAlumbrado />;
      case 'reportes_bacheo':
        return <ReportesBacheo />;
      case 'reportes_basura':
        return <ReportesBasura />;
      case 'reportes_drenaje':
        return <ReportesDrenaje />;
      default:
        return (
          <div className="content-card">
            <h2>Seleccione una opción</h2>
            <p>Por favor, seleccione una opción del menú lateral.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-container light-mode">
      <button 
        className="mobile-toggle"
        onClick={toggleMobileSidebar}
      >
        {icons.menu}
      </button>

      <div 
        className={`sidebar ${expanded ? 'expanded' : 'collapsed'} ${showSidebar ? 'show' : 'hide'}`}
      >
        <div className="sidebar-header">
          {expanded && (
            <div className="app-title">
              ☀️ Panel Administrativo
            </div>
          )}
          <button 
            className="toggle-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? icons.chevronLeft : icons.chevronRight}
          </button>
        </div>

        {/* PANEL DE NOTIFICACIONES SIMPLIFICADO */}
        <div className={`notifications-container ${expanded ? '' : 'hidden'}`}>
          <div 
            className="notifications-box"
            onClick={toggleNotificaciones}
          >
            <div className="notifications-title">
              <span className="notification-icon">{icons.bell}</span>
              <span className="notification-label">Notificaciones</span>
            </div>
            {contadorNotificaciones > 0 && (
              <div className="notification-badge">
                {contadorNotificaciones > 99 ? '99+' : contadorNotificaciones}
              </div>
            )}
          </div>
          
          {/* PANEL DESPLEGABLE SIMPLIFICADO */}
          {mostrarNotificaciones && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h4>Notificaciones</h4>
                <button 
                  className="btn-cerrar-notif"
                  onClick={() => setMostrarNotificaciones(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="notifications-list">
                {notificaciones.length === 0 ? (
                  <div className="notification-empty">
                    <span>📭</span>
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  notificaciones.slice(0, 10).map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notification-item ${!notif.leida ? 'no-leida' : ''}`}
                    >
                      <div className="notif-icon">
                        {getIconoCategoria(notif.categoria || notif.reporte?.categoria)}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{notif.titulo}</div>
                        <div className="notif-message">
                          📍 {notif.mensaje}
                        </div>
                        <div className="notif-time">
                          {formatearTiempo(notif.fecha)}
                        </div>
                      </div>
                      
                      {/* LA PALOMITA QUE QUERÍAS */}
                      {!notif.leida && (
                        <button 
                          className="btn-marcar-leida"
                          onClick={(e) => {
                            e.stopPropagation();
                            NotificacionesController.marcarComoLeida(notif.id);
                          }}
                          title="Marcar como leída"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {notificaciones.length > 0 && (
                <div className="notifications-footer">
                  <button 
                    className="btn-marcar-todas"
                    onClick={() => {
                      NotificacionesController.marcarTodasComoLeidas();
                      setMostrarNotificaciones(false);
                    }}
                  >
                    Marcar todas como leídas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          {loading ? (
            <div className="loading-menu">
              <span>Cargando...</span>
            </div>
          ) : (
            <ul className="menu-list">
              {menuItems.map((item) => (
                <li key={item.id} className="menu-item">
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`menu-button ${activeItem === item.id ? 'active' : ''}`}
                  >
                    <span className="menu-icon">
                      {item.icon}
                    </span>
                    {expanded && <span className="menu-label">{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="user-profile">
          <div className="profile-container">
            <div className="profile-avatar">{currentUser.iniciales}</div>
            {expanded && (
              <div className="profile-info">
                <div className="profile-name">{currentUser.nombre}</div>
                <div className="profile-email">
                  {currentUser.email !== currentUser.nombre ? currentUser.email : ''}
                </div>
                <div className="profile-role">
                  {getRoleName(currentUser.rol)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          {expanded ? (
            <button className="logout-button with-text" onClick={handleLogout}>
              <span className="logout-icon">{icons.logout}</span>
              <span className="logout-text">Cerrar Sesión</span>
            </button>
          ) : (
            <button className="logout-button" onClick={handleLogout}>
              <span className="logout-icon">{icons.logout}</span>
            </button>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="content-container">
          {renderContent()}
        </div>
      </div>


    </div>
  );
};

// Función auxiliar para obtener icono de categoría
function getIconoCategoria(categoria) {
  const iconos = {
    // Alumbrado
    'Alumbrado Público': '💡',
    'Alumbrado': '💡',
    // Bacheo
    'Bacheo': '🛣️',
    'Baches': '🛣️',
    // Basura
    'Basura Acumulada': '🗑️',
    'Basura': '🗑️',
    // Drenaje (todas las variaciones)
    'Drenaje Obstruido': '💧',
    'Drenajes Obstruidos': '💧',
    'Drenaje': '💧',
    'Drenajes': '💧'
  };
  return iconos[categoria] || '📝';
}

// Función auxiliar para formatear tiempo relativo
function formatearTiempo(fecha) {
  const ahora = new Date();
  const tiempo = new Date(fecha);
  const diff = ahora - tiempo;
  
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  
  return tiempo.toLocaleDateString('es-MX', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Función auxiliar para obtener el nombre del rol
function getRoleName(rolId) {
  return PermisosController.obtenerNombreRol(rolId);
}

export default PanelLateral;