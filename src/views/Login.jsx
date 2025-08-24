import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithUsernamePassword } from "../controllers/Login";
import LumvidaLogo from "../assets/Lumvida.png";
import FondoImage from "../assets/Fondo.png";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();
    const isSubmitting = useRef(false);

    // Verificar si ya hay sesión al cargar el componente
    useEffect(() => {
        const verificarSesion = () => {
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
            
            if (isAuthenticated) {
                navigate("/PanelLateral");
            }
        };
        
        verificarSesion();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        
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
            setTimeout(() => {
                isSubmitting.current = false;
            }, 500);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                backgroundImage: `url(${FondoImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header con logo */}
                    <div className="bg-white px-8 py-10 text-center border-b border-gray-100">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 p-2">
                            <img 
                                src={LumvidaLogo} 
                                alt="Lumvida Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Sistema Web
                        </h1>
                        <p className="text-gray-600 text-sm font-medium">
                            Sistema de Administración de Reportes Urbanos
                        </p>
                    </div>

                    {/* Formulario */}
                    <div className="px-8 py-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Campo Email/Usuario */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    User
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200 text-gray-800"
                                        placeholder="Administrador"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Campo Contraseña */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200 text-gray-800 pr-12"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Checkbox Recordar */}
                            <div className="flex items-center">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500 focus:ring-2"
                                />
                                <label htmlFor="remember" className="ml-3 text-sm text-gray-600">
                                    Recordar email
                                </label>
                            </div>

                            {/* Mensaje de error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600 text-center">{error}</p>
                                </div>
                            )}

                            {/* Botón de inicio de sesión */}
                            <button
                                type="submit"
                                disabled={loading || isSubmitting.current}
                                className="w-full bg-indigo-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Iniciando Sesión...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 relative">
                                        <svg className="w-4 h-4 absolute left-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="ml-2">Iniciar Sesión</span>
                                    </div>
                                )}
                            </button>
                        </form>

                        {/* Mensaje de autorización */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Solo administradores autorizados
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;