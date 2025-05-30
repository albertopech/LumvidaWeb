// src/views/Login.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithUsernamePassword } from "../controllers/Login";
import "./Styles/Login.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const isSubmitting = useRef(false);

    // Verificar si ya hay sesión al cargar el componente
    useEffect(() => {
        const verificarSesion = () => {
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
            
            if (isAuthenticated) {
                // Si ya hay sesión activa, redirigir al panel
                navigate("/PanelLateral");
            }
        };
        
        verificarSesion();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        // Prevenir múltiples envíos
        if (isSubmitting.current || loading) return;
        
        isSubmitting.current = true;
        setError("");
        setLoading(true);

        try {
            console.log("Intentando iniciar sesión con:", username);
            // Llamar a la función de autenticación del controlador
            const result = await loginWithUsernamePassword(username, password);
            
            if (result.success) {
                console.log("Inicio de sesión exitoso:", result);
                // Guardar datos en localStorage
                localStorage.setItem("userRole", result.rol);
                localStorage.setItem("username", result.usuario);
                localStorage.setItem("userId", result.id); 
                localStorage.setItem("isAuthenticated", "true");
                
                // Guardar nombre si está disponible
                if (result.nombre) {
                    localStorage.setItem("userNombre", result.nombre);
                }
                
                // Redirigir al usuario
                navigate("/PanelLateral");
            } else {
                console.error("Error en login:", result.error);
                setError(result.error);
            }
        } catch (err) {
            console.error("Error de autenticación:", err);
            setError("Ocurrió un error durante la autenticación. Intente nuevamente.");
        } finally {
            setLoading(false);
            // Permitir envíos futuros después de un breve retraso
            setTimeout(() => {
                isSubmitting.current = false;
            }, 500);
        }
    };

    // Simplificamos el mensaje de error para evitar duplicación visual
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2 className="login-title">Bienvenido</h2>
                    <p className="login-subtitle">Sistema de Administración de Reportes Urbanos</p>
                </div>
                
                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-fields">
                        <div className="input-group">
                            <label htmlFor="username" className="sr-only">Usuario</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="password" className="sr-only">Contraseña</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="input-field"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Simplificamos el mensaje de error */}
                    {error && (
                        <div className="error-container-simple">
                            {error}
                        </div>
                    )}

                    <div className="button-container">
                        <button
                            type="submit"
                            disabled={loading || isSubmitting.current}
                            className="login-button"
                        >
                            {loading ? (
                                <svg className="loading-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="loading-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="loading-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span className="button-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                        </button>
                    </div>
                </form>
                
                <div className="login-footer">
                    <p>© 2025 Sistema de Reportes Municipales</p>
                </div>
            </div>
        </div>
    );
};

export default Login;