// src/views/PanelLateral.jsx - Versión corregida
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Styles/PanelLateral.css";
// Importar componentes
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
// Nuevos componentes para el jefe de departamento
import DashboardJefeDepartamento from '../views/DashboardJefeDepartamento';

// Importar controlador de permisos
import { PermisosController } from '../controllers/PermisosController';

const PanelLateral = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(true);
  const [, ] = useState({ category: '', search: '' });
  const [currentUser, setCurrentUser] = useState({
    nombre: 'Cargando...',
    email: '...',
    iniciales: '...',
    rol: '',
    id: null
  });
  
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
    analytics: '📊',
    report: '📝',  // Icono para reportes
    bell: '🔔',
    search: '🔍',
    logout: '🚪',
    menu: '☰',
    permisos: '🔑',  // Icono para gestión de permisos
    dashboard: '📉',  // Icono para dashboard avanzado
    map: '🗺️',       // Icono para mapa
    message: '✉️',    // Icono para mensajes
    advanced: '📋'    // Icono para reportes avanzados
  };

  // Cargar información del usuario y sus permisos al iniciar
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Verificar si el usuario está autenticado
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuthenticated) {
          navigate('/login');
          return;
        }
        
        // Obtener ID del usuario actual
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.error("No se encontró ID de usuario en localStorage");
          navigate('/login');
          return;
        }
        
        // Obtener nombre de usuario y nombre completo si existe
        const username = localStorage.getItem('username') || 'Usuario';
        const nombreCompleto = localStorage.getItem('userNombre') || username;
        
        // Obtener email (si existe)
        const email = localStorage.getItem('userEmail') || '';
        
        // Obtener rol del usuario - Adaptado a tu implementación actual
        const rol = localStorage.getItem('userRole') || 'capturista'; // Por defecto rol mínimo
        
        // Obtener iniciales para avatar
        const obtenerIniciales = (nombre) => {
          if (!nombre) return '?';
          
          const partes = nombre.split(' ');
          if (partes.length > 1) {
            return (partes[0][0] + partes[1][0]).toUpperCase();
          }
          
          return (nombre[0] || '?').toUpperCase();
        };
        
        // Actualizar el estado del usuario actual
        setCurrentUser({
          nombre: nombreCompleto,
          iniciales: obtenerIniciales(nombreCompleto),
          rol: rol,
          id: userId
        });

        // Cargar los permisos del usuario
        try {
          // Intentamos obtener los permisos personalizados
          const permisosResponse = await PermisosController.obtenerPermisosUsuario(userId);
          
          if (permisosResponse.success) {
            setModulosPermitidos(permisosResponse.data || []);
            
            // CORRECCIÓN: Solo establecer el activeItem por primera vez
            // Usamos la bandera usuarioYaInicializado para evitar cambiar el activeItem
            // cada vez que se recarga el componente
            if (!usuarioYaInicializado) {
              // Para jefes de departamento, iniciar en el dashboard de jefe si está disponible
              if (rol === 'jefe_departamento' && permisosResponse.data.includes('dashboard_jefe')) {
                setActiveItem('dashboard_jefe');
              }
              // Si el usuario no tiene acceso al dashboard pero intenta acceder a él,
              // redirigir a la primera opción disponible
              else if (activeItem === 'dashboard' && !permisosResponse.data.includes('dashboard')) {
                // Usar el primer módulo permitido
                if (permisosResponse.data.length > 0) {
                  setActiveItem(permisosResponse.data[0]);
                }
              }
              setUsuarioYaInicializado(true);
            }
          } else {
            console.error("Error al cargar permisos:", permisosResponse.error);
            // Si hay error, usar los predeterminados del rol
            const permisosRol = PermisosController.obtenerPermisosModulos(rol);
            setModulosPermitidos(permisosRol);
            
            // Redirigir si es necesario y no se ha inicializado
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
          // En caso de error crítico, utilizamos los permisos básicos del rol
          const permisosRol = PermisosController.obtenerPermisosModulos(rol);
          setModulosPermitidos(permisosRol);
          if (!usuarioYaInicializado) {
            setUsuarioYaInicializado(true);
          }
        }
        
      } catch (error) {
        console.error("Error al cargar información del usuario:", error);
        // En caso de error general, usamos datos básicos
        const username = localStorage.getItem('username') || 'Usuario';
        const rol = localStorage.getItem('userRole') || 'capturista';
        
        setCurrentUser({
          nombre: username,
          email: username,
          iniciales: username.charAt(0).toUpperCase() || 'U',
          rol: rol,
          id: null
        });
        
        // Cargar permisos predeterminados
        const permisosBasicos = PermisosController.obtenerPermisosModulos(rol);
        setModulosPermitidos(permisosBasicos);
      } finally {
        setLoading(false);
      }
    };
    
    cargarUsuario();
  }, [navigate, activeItem, usuarioYaInicializado]);

  const handleItemClick = (id) => {
    // CORRECCIÓN: Verificar que el módulo esté disponible antes de cambiar
    if (modulosPermitidos.includes(id)) {
      setActiveItem(id);
      // Añadir un console.log para debug
      console.log("Cambiando a módulo:", id);
    } else {
      console.warn("Módulo no disponible:", id);
    }
  };

  const toggleMobileSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      // Mostrar confirmación antes de cerrar sesión
      const confirmar = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (!confirmar) return;
      
      // Limpiar localStorage para cerrar sesión
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userNombre');
      localStorage.removeItem('userEmail');
      
      // Redireccionar a la página de inicio de sesión
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Hubo un problema al cerrar sesión. Por favor, intenta nuevamente.");
    }
  };

  // Items del menú completo
  const allMenuItems = [
    { id: 'dashboard', icon: icons.home, label: 'Panel Administrativo' },
    { id: 'dashboard_jefe', icon: icons.dashboard, label: 'Dashboard Departamentos' },
    { id: 'users', icon: icons.users, label: 'Registrar Usuario' },
    { id: 'reports', icon: icons.report, label: 'Registrar Reporte' },
    { id: 'admin_reports', icon: icons.report, label: 'Gestión de Reportes' },
    { id: 'analytics', icon: icons.analytics, label: 'Estadísticas' },
    { id: 'admin_users', icon: icons.users, label: 'Admin. Usuarios' },
    { id: 'admin_permisos', icon: icons.permisos, label: 'Gestión de Permisos' },
  ];

  // Filtrar menú según los módulos permitidos
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

  // Renderiza el contenido según la opción seleccionada y el rol del usuario
  const renderContent = () => {
    // CORRECCIÓN: Agregar un console.log para ver qué opción está activa
    console.log("Renderizando contenido con activeItem:", activeItem);
    
    // Verificar si el usuario tiene permiso para ver esta sección
    if (!modulosPermitidos.includes(activeItem)) {
      // Redirigir a la primera opción disponible para su rol
      if (modulosPermitidos.length > 0) {
        setActiveItem(modulosPermitidos[0]);
      }
      return (
        <div className="unauthorized-message">
          <h3>Acceso no autorizado</h3>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      );
    }

    // Si estamos en el dashboard, mostrar la vista según el rol del usuario
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
          // Para otros roles (admin, jefe_departamento, etc.) mostrar el panel de basura como predeterminado
          // o puedes implementar un dashboard general con resumen de todos los reportes
          return <ReportesBasura />;
      }
    }

    // Para las otras opciones del menú, seguir con el comportamiento normal
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
      // Nuevas vistas para el Jefe de Departamento
      case 'dashboard_jefe':
        return <DashboardJefeDepartamento />;
      case 'mapa_reportes':
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

      <div className={`notifications-container ${expanded ? '' : 'hidden'}`}>
        <div className="notifications-box">
          <div className="notifications-title">
            <span className="notification-icon">{icons.bell}</span>
            <span className="notification-label">Notificaciones</span>
          </div>
          <div className="notification-badge">5</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {loading ? (
          <div className="loading-menu">
            <div className="loading-spinner"></div>
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

// Función auxiliar para obtener el nombre del rol utilizando el controlador
function getRoleName(rolId) {
return PermisosController.obtenerNombreRol(rolId);
}

export default PanelLateral;