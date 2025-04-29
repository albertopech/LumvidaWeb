// src/views/AdminUsuarios.jsx
import { useState, useEffect } from "react";
import { UsuarioController } from "../controllers/registroUsuarios";
import "./Styles/AdminUsuarios.css";

const AdminUsuarios = () => {
    // Estados para la gestión de usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Estado para el usuario seleccionado para editar
    const [usuarioEditar, setUsuarioEditar] = useState(null);
    
    // Estado para el modal de confirmación de eliminación
    const [modalEliminar, setModalEliminar] = useState({
        visible: false,
        usuario: null
    });
    
    // Opciones de filtrado y búsqueda
    const [filtro, setFiltro] = useState({
        rol: "",
        busqueda: ""
    });
    
    // Estado para el formulario de edición
    const [formData, setFormData] = useState({
        usuario: "",
        rol: "",
        email: "",
        nombre: "",
        apellidos: "",
        telefono: ""
    });
    
    // Lista de roles disponibles
    const roles = [
        { id: "jefe_ayuntatel", nombre: "Jefe de Ayuntatel" },
        { id: "jefe_departamento", nombre: "Jefe de Departamento" },
        { id: "basura", nombre: "Departamento de Basura Acumulada" },
        { id: "alumbrado", nombre: "Departamento de Alumbrado Público" },
        { id: "drenaje", nombre: "Departamento de Drenaje Obstruido" },
        { id: "bacheo", nombre: "Departamento de Bacheo" },
        { id: "capturista", nombre: "Capturista" },
        { id: "auditor", nombre: "Auditor" }
    ];
    
    // Cargar la lista de usuarios al iniciar el componente
    useEffect(() => {
        cargarUsuarios();
    }, []);
    
    // Función para cargar la lista de usuarios
    const cargarUsuarios = async () => {
        setLoading(true);
        setError("");
        
        try {
            // Obtener usuarios desde el controlador
            const respuesta = await UsuarioController.obtenerUsuarios();
            
            if (respuesta.success) {
                setUsuarios(respuesta.data);
            } else {
                setError("Error al cargar usuarios: " + respuesta.error);
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            setError("Hubo un problema al cargar la lista de usuarios.");
        } finally {
            setLoading(false);
        }
    };
    
    // Función para filtrar usuarios
    const usuariosFiltrados = () => {
        return usuarios.filter(usuario => {
            // Filtrar por rol si hay un filtro seleccionado
            const pasaFiltroRol = filtro.rol === "" || usuario.rol === filtro.rol;
            
            // Filtrar por término de búsqueda
            const terminoBusqueda = filtro.busqueda.toLowerCase();
            const pasaFiltroBusqueda = terminoBusqueda === "" || 
                usuario.usuario.toLowerCase().includes(terminoBusqueda) ||
                (usuario.nombre || "").toLowerCase().includes(terminoBusqueda) ||
                (usuario.apellidos || "").toLowerCase().includes(terminoBusqueda) ||
                (usuario.email || "").toLowerCase().includes(terminoBusqueda);
                
            return pasaFiltroRol && pasaFiltroBusqueda;
        });
    };
    
    // Manejar cambios en el filtro
    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltro({
            ...filtro,
            [name]: value
        });
    };
    
    // Resetear filtros
    const resetearFiltros = () => {
        setFiltro({
            rol: "",
            busqueda: ""
        });
    };
    
    // Abrir el modal de edición para un usuario
    const abrirEditar = (usuario) => {
        setUsuarioEditar(usuario);
        setFormData({
            usuario: usuario.usuario,
            rol: usuario.rol,
            email: usuario.email || "",
            nombre: usuario.nombre || "",
            apellidos: usuario.apellidos || "",
            telefono: usuario.telefono || ""
        });
    };
    
    // Cerrar el modal de edición
    const cerrarEditar = () => {
        setUsuarioEditar(null);
        setFormData({
            usuario: "",
            rol: "",
            email: "",
            nombre: "",
            apellidos: "",
            telefono: ""
        });
    };
    
    // Manejar cambios en el formulario de edición
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    // Guardar cambios de edición
    const guardarCambios = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        
        try {
            // Validar datos del formulario
            if (!formData.usuario || !formData.rol || !formData.nombre || !formData.apellidos) {
                setError("Los campos marcados con * son obligatorios");
                return;
            }
            
            // Validar formato de email si se proporciona
            if (formData.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
                setError("El formato del correo electrónico es inválido");
                return;
            }

            // Validar formato de teléfono si se proporciona
            if (formData.telefono && !/^\d{10}$/.test(formData.telefono)) {
                setError("El teléfono debe tener 10 dígitos");
                return;
            }
            
            // Actualizar usuario
            const resultado = await UsuarioController.actualizarUsuario(usuarioEditar.id, formData);
            
            if (resultado.success) {
                setSuccess(`Usuario ${formData.usuario} actualizado correctamente`);
                cerrarEditar();
                cargarUsuarios();
            } else {
                setError(resultado.error || "Error al actualizar usuario");
            }
        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            setError("Hubo un problema al actualizar el usuario.");
        }
    };
    
    // Abrir modal de confirmación para eliminar
    const confirmarEliminar = (usuario) => {
        setModalEliminar({
            visible: true,
            usuario: usuario
        });
    };
    
    // Cerrar modal de confirmación
    const cerrarModalEliminar = () => {
        setModalEliminar({
            visible: false,
            usuario: null
        });
    };
    
    // Eliminar usuario
    const eliminarUsuario = async () => {
        setError("");
        setSuccess("");
        
        try {
            if (!modalEliminar.usuario) return;
            
            const resultado = await UsuarioController.eliminarUsuario(modalEliminar.usuario.id);
            
            if (resultado.success) {
                setSuccess(`Usuario ${modalEliminar.usuario.usuario} eliminado correctamente`);
                cerrarModalEliminar();
                cargarUsuarios();
            } else {
                setError(resultado.error || "Error al eliminar usuario");
                cerrarModalEliminar();
            }
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            setError("Hubo un problema al eliminar el usuario.");
            cerrarModalEliminar();
        }
    };
    
    // Obtener nombre del rol
    const obtenerNombreRol = (rolId) => {
        const rol = roles.find(r => r.id === rolId);
        return rol ? rol.nombre : rolId;
    };
    
    return (
        <div className="admin-usuarios-container">
            <div className="admin-header">
                <h2>Administración de Usuarios</h2>
                <p>Gestiona los usuarios del sistema</p>
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
                            placeholder="Nombre, usuario o email"
                            value={filtro.busqueda}
                            onChange={handleFiltroChange}
                        />
                    </div>
                    
                    <div className="filtro-grupo">
                        <label htmlFor="rol">Filtrar por rol:</label>
                        <select
                            id="rol"
                            name="rol"
                            value={filtro.rol}
                            onChange={handleFiltroChange}
                        >
                            <option value="">Todos los roles</option>
                            {roles.map(rol => (
                                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button className="filtro-reset" onClick={resetearFiltros}>
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
            
            {/* Tabla de usuarios */}
            <div className="tabla-usuarios-container">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Cargando usuarios...</p>
                    </div>
                ) : (
                    <>
                        <p className="total-usuarios">
                            {usuariosFiltrados().length} usuarios encontrados
                        </p>
                        <div className="tabla-scroll">
                            <table className="tabla-usuarios">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosFiltrados().length > 0 ? (
                                        usuariosFiltrados().map(usuario => (
                                            <tr key={usuario.id}>
                                                <td>{usuario.usuario}</td>
                                                <td>
                                                    {usuario.nombre} {usuario.apellidos}
                                                </td>
                                                <td>{usuario.email || "-"}</td>
                                                <td>
                                                    <span className="badge-rol">
                                                        {obtenerNombreRol(usuario.rol)}
                                                    </span>
                                                </td>
                                                <td className="acciones-celda">
                                                    <button 
                                                        className="btn-editar"
                                                        onClick={() => abrirEditar(usuario)}
                                                    >
                                                        <span>✏️</span>
                                                    </button>
                                                    <button 
                                                        className="btn-eliminar"
                                                        onClick={() => confirmarEliminar(usuario)}
                                                    >
                                                        <span>🗑️</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="no-resultados">
                                                No se encontraron usuarios con los filtros aplicados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            
            {/* Modal de edición de usuario */}
            {usuarioEditar && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Editar Usuario</h3>
                            <button className="close-modal" onClick={cerrarEditar}>×</button>
                        </div>
                        <form className="form-editar" onSubmit={guardarCambios}>
                            <div className="form-group">
                                <label htmlFor="usuario">Nombre de Usuario *</label>
                                <input
                                    type="text"
                                    id="usuario"
                                    name="usuario"
                                    value={formData.usuario}
                                    onChange={handleFormChange}
                                    required
                                    disabled
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="nombre">Nombre *</label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="apellidos">Apellidos *</label>
                                    <input
                                        type="text"
                                        id="apellidos"
                                        name="apellidos"
                                        value={formData.apellidos}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="telefono">Teléfono</label>
                                    <input
                                        type="text"
                                        id="telefono"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="edit-rol">Rol *</label>
                                <select
                                    id="edit-rol"
                                    name="rol"
                                    value={formData.rol}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="">Seleccione un rol</option>
                                    {roles.map(rol => (
                                        <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-buttons">
                                <button type="button" className="btn-cancelar" onClick={cerrarEditar}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-guardar">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal de confirmación para eliminar */}
            {modalEliminar.visible && (
                <div className="modal-overlay">
                    <div className="modal-container modal-confirmar">
                        <div className="modal-header">
                            <h3>Confirmar Eliminación</h3>
                            <button className="close-modal" onClick={cerrarModalEliminar}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="confirmacion-mensaje">
                                ¿Está seguro que desea eliminar al usuario <strong>{modalEliminar.usuario?.usuario}</strong>?
                            </p>
                            <p className="confirmacion-advertencia">
                                Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModalEliminar}>
                                Cancelar
                            </button>
                            <button className="btn-eliminar" onClick={eliminarUsuario}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsuarios;