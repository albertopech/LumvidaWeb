// src/views/RegistroUsuarios.jsx
import { useState, useEffect } from "react";
import { UsuarioController } from "../controllers/registroUsuarios";
import "./Styles/registroUsuarios.css";

const RegistroUsuarios = () => {
    // Estado para el formulario (Vista)
    const [formData, setFormData] = useState({
        usuario: "",
        contrasena: "",
        confirmarContrasena: "",
        rol: "",
        email: "",
        nombre: "",
        apellidos: "",
        telefono: ""
    });
    
    // Estados de la interfaz (Vista)
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [usuariosSistema, setUsuariosSistema] = useState([]);

    // Lista de roles disponibles (Modelo de presentación)
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

    // Cargar usuarios existentes para la validación (Controlador)
    useEffect(() => {
        const fetchUsuarios = async () => {
            const response = await UsuarioController.obtenerUsuarios();
            if (response.success) {
                setUsuariosSistema(response.data);
            } else {
                setError(response.error);
            }
        };

        fetchUsuarios();
    }, []);

    // Manejador de cambios en el formulario (Vista)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Manejador de envío del formulario (Controlador)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validar el formulario usando el controlador
        const validacion = UsuarioController.validarFormularioUsuario(formData, usuariosSistema);
        if (!validacion.isValid) {
            setError(validacion.error);
            return;
        }

        setLoading(true);
        try {
            // Registrar usuario usando el controlador
            const resultado = await UsuarioController.registrarUsuario(formData);
            
            if (resultado.success) {
                setSuccess(`Usuario ${formData.usuario} registrado correctamente con el rol de ${roles.find(r => r.id === formData.rol)?.nombre}`);
                
                // Limpiar formulario
                setFormData({
                    usuario: "",
                    contrasena: "",
                    confirmarContrasena: "",
                    rol: "",
                    email: "",
                    nombre: "",
                    apellidos: "",
                    telefono: ""
                });
                
                // Actualizar lista de usuarios
                setUsuariosSistema([...usuariosSistema, resultado.usuario]);
            } else {
                setError(resultado.error);
            }
        } catch (error) {
            console.error("Error en la vista:", error);
            setError("Ocurrió un error al registrar el usuario. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    // Componente de Vista con diseño formal (utilizando campos sin iconos)
    return (
        <div className="registro-component">
            <div className="registro-container">
                <div className="registro-card">
                    <div className="registro-header">
                        <h2 className="registro-title">Registro de Usuarios</h2>
                        <p className="registro-subtitle">Sistema de Administración de Reportes Urbanos</p>
                    </div>
                    
                    <form className="registro-form" onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h3>Información de Cuenta</h3>
                            <div className="form-group">
                                <label htmlFor="usuario">Nombre de Usuario *</label>
                                <input
                                    id="usuario"
                                    name="usuario"
                                    type="text"
                                    required
                                    className="full-input-field"
                                    placeholder="Ingrese nombre de usuario"
                                    value={formData.usuario}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="contrasena">Contraseña *</label>
                                    <input
                                        id="contrasena"
                                        name="contrasena"
                                        type="password"
                                        required
                                        className="full-input-field"
                                        placeholder="Ingrese contraseña"
                                        value={formData.contrasena}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirmarContrasena">Confirmar Contraseña *</label>
                                    <input
                                        id="confirmarContrasena"
                                        name="confirmarContrasena"
                                        type="password"
                                        required
                                        className="full-input-field"
                                        placeholder="Confirme contraseña"
                                        value={formData.confirmarContrasena}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="rol">Rol del Usuario *</label>
                                <select
                                    id="rol"
                                    name="rol"
                                    required
                                    className="full-input-field"
                                    value={formData.rol}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccione un rol</option>
                                    {roles.map(rol => (
                                        <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-section">
                            <h3>Información Personal</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="nombre">Nombre(s) *</label>
                                    <input
                                        id="nombre"
                                        name="nombre"
                                        type="text"
                                        required
                                        className="full-input-field"
                                        placeholder="Ingrese nombre(s)"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="apellidos">Apellidos *</label>
                                    <input
                                        id="apellidos"
                                        name="apellidos"
                                        type="text"
                                        required
                                        className="full-input-field"
                                        placeholder="Ingrese apellidos"
                                        value={formData.apellidos}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="email">Correo Electrónico</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className="full-input-field"
                                        placeholder="correo@ejemplo.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="telefono">Teléfono</label>
                                    <input
                                        id="telefono"
                                        name="telefono"
                                        type="tel"
                                        className="full-input-field"
                                        placeholder="10 dígitos"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="error-container">
                                <div className="error-content">
                                    <div className="error-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="error-message">
                                        <p>{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="success-container">
                                <div className="success-content">
                                    <div className="success-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="success-message">
                                        <p>{success}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="button-container">
                            <button
                                type="submit"
                                disabled={loading}
                                className="registro-button"
                            >
                                {loading ? (
                                    <svg className="loading-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="loading-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="loading-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <span className="button-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                                {loading ? "Registrando..." : "Registrar Usuario"}
                            </button>
                        </div>
                    </form>
                    
                    <div className="registro-footer">
                        <p>© 2025 Sistema de Reportes Municipales</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegistroUsuarios;