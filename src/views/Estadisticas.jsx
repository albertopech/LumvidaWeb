// src/views/Estadisticas.jsx
import { useState, useEffect } from "react";
import EstadisticasController from "../controllers/EstadisticasController";
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import "./Styles/estadisticas.css";

const Estadisticas = () => {
  // Estado para la ciudad actual
  const [ciudadActual, setCiudadActual] = useState("Chetumal");
  
  // Estados para almacenar datos
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para los filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todo');
  const [filtroColonia, setFiltroColonia] = useState('todas');
  
  // Estados para datos procesados
  const [totalReportes, setTotalReportes] = useState(0);
  const [reportesPorCategoria, setReportesPorCategoria] = useState([]);
  const [reportesPorColonia, setReportesPorColonia] = useState([]);
  const [reportesPorCalle, setReportesPorCalle] = useState([]);
  const [resumenGeneral, setResumenGeneral] = useState({});
  const [coloniasUnicas, setColoniasUnicas] = useState([]);
  
  // Colores para gráficas
  const COLORS = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585'];
  
  // Categorías disponibles - CORREGIDO "Drenaje Obstruido" a "Drenajes Obstruidos"
  const categorias = [
    { id: 'todas', nombre: 'Todas las categorías' },
    { id: 'basura', nombre: 'Basura Acumulada' },
    { id: 'alumbrado', nombre: 'Alumbrado Público' },
    { id: 'drenaje', nombre: 'Drenajes Obstruidos' }, // Corregido a plural
    { id: 'bacheo', nombre: 'Bacheo' }
  ];
  
  // Periodos de tiempo disponibles
  const periodos = [
    { id: 'todo', nombre: 'Todo el tiempo' },
    { id: 'semana', nombre: 'Última semana' },
    { id: 'mes', nombre: 'Último mes' },
    { id: 'trimestre', nombre: 'Último trimestre' },
    { id: 'anio', nombre: 'Último año' }
  ];
  
  // Detectar la ciudad actual al montar el componente
  useEffect(() => {
    const detectarCiudad = async () => {
      const ciudad = await EstadisticasController.obtenerCiudadActual();
      setCiudadActual(ciudad);
    };
    
    detectarCiudad();
  }, []);
  
  // Cargar datos al montar el componente o cambiar la ciudad
  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setLoading(true);
        
        // Obtener reportes para la ciudad actual
        const resultado = await EstadisticasController.obtenerReportesPorCiudad(ciudadActual);
        
        if (resultado.success) {
          setReportes(resultado.data);
          // Obtener lista de colonias únicas para el filtro
          setColoniasUnicas(EstadisticasController.obtenerColonias(resultado.data));
          
          // Mostrar info de categorías para depuración
          const categoriasPresentes = new Set();
          resultado.data.forEach(reporte => {
            if (reporte.categoria) {
              categoriasPresentes.add(reporte.categoria);
            }
          });
          console.log("Categorías presentes en los datos cargados:", Array.from(categoriasPresentes));
        } else {
          setError(resultado.error);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar reportes:", err);
        setError(`Ocurrió un error al cargar los reportes de ${ciudadActual}. Por favor intente nuevamente.`);
        setLoading(false);
      }
    };
    
    cargarReportes();
  }, [ciudadActual]);
  
  // Procesar datos cuando cambian reportes o filtros
  useEffect(() => {
    if (reportes.length === 0) return;
    
    // Usar el controlador para procesar las estadísticas
    const filtros = {
      categoria: filtroCategoria,
      periodo: filtroPeriodo,
      colonia: filtroColonia
    };
    
    const estadisticas = EstadisticasController.procesarEstadisticas(reportes, filtros);
    
    // Actualizar los estados con los datos procesados
    setTotalReportes(estadisticas.totalReportes);
    setReportesPorCategoria(estadisticas.reportesPorCategoria);
    setReportesPorColonia(estadisticas.reportesPorColonia);
    setReportesPorCalle(estadisticas.reportesPorCalle);
    setResumenGeneral(estadisticas.resumenGeneral);
    
  }, [reportes, filtroCategoria, filtroPeriodo, filtroColonia]);
  
  // Función para renderizar la gráfica de pastel de categorías
  const renderGraficaPastelCategorias = () => {
    if (reportesPorCategoria.length === 0) {
      return <div className="empty-chart">No hay datos disponibles</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={reportesPorCategoria}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={130}
            fill="#3a7bd5"
            dataKey="value"
          >
            {reportesPorCategoria.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} reportes`, 'Cantidad']} />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  
  // Función para renderizar la gráfica de barras de colonias
  const renderGraficaBarrasColonias = () => {
    if (reportesPorColonia.length === 0) {
      return <div className="empty-chart">No hay datos disponibles</div>;
    }
    
    // Limitar a las 8 colonias con más reportes para mejor visualización
    const topColonias = reportesPorColonia.slice(0, 8);
    
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={topColonias}
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ angle: -45, textAnchor: 'end', dominantBaseline: 'ideographic' }}
            height={100} 
          />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} reportes`, 'Cantidad']} />
          <Bar dataKey="value" name="Reportes" fill="#4361ee">
            {topColonias.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Función para renderizar una gráfica de líneas (tendencias por mes)
  const renderGraficaTendencias = () => {
    if (reportes.length === 0) {
      return <div className="empty-chart">No hay datos disponibles</div>;
    }
    
    // Agrupar reportes por mes
    const reportesPorMes = {};
    
    reportes.forEach(reporte => {
      const fecha = reporte.fechaObj;
      const mesKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
      
      if (!reportesPorMes[mesKey]) {
        reportesPorMes[mesKey] = { 
          name: `${fecha.toLocaleString('default', { month: 'short' })} ${fecha.getFullYear()}`,
          total: 0 
        };
      }
      
      reportesPorMes[mesKey].total++;
    });
    
    // Convertir a array y ordenar por fecha
    const datosPorMes = Object.values(reportesPorMes)
      .sort((a, b) => new Date(a.name) - new Date(b.name))
      .slice(-6); // Mostrar solo los últimos 6 meses
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={datosPorMes}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} reportes`, 'Cantidad']} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total" 
            name="Reportes mensuales" 
            stroke="#4361ee" 
            strokeWidth={3}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  return (
    <div className="estadisticas-container">
      <div className="estadisticas-header">
        <h1>Estadísticas de Reportes</h1>
        <p>Análisis detallado de reportes de incidencias en {ciudadActual}</p>
      </div>
      
      {/* Sección de filtros */}
      <div className="filtros-container">
        <div className="filtro-grupo">
          <label>Categoría:</label>
          <select 
            value={filtroCategoria} 
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="filtro-select"
          >
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>
        
        <div className="filtro-grupo">
          <label>Período:</label>
          <select 
            value={filtroPeriodo} 
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="filtro-select"
          >
            {periodos.map(periodo => (
              <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>
            ))}
          </select>
        </div>
        
        <div className="filtro-grupo">
          <label>Colonia:</label>
          <select 
            value={filtroColonia} 
            onChange={(e) => setFiltroColonia(e.target.value)}
            className="filtro-select"
          >
            <option value="todas">Todas las colonias</option>
            {coloniasUnicas.map(colonia => (
              <option key={colonia} value={colonia}>{colonia}</option>
            ))}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando estadísticas de {ciudadActual}...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Resumen general */}
          <div className="resumen-general">
            <h2>Resumen General de {ciudadActual}</h2>
            <div className="resumen-cards">
              <div className="resumen-card">
                <div className="resumen-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-5-8h10v2H7v-2z" fill="#4361ee"/>
                  </svg>
                </div>
                <div className="resumen-valor">{resumenGeneral.totalIncidencias || 0}</div>
                <div className="resumen-titulo">Total de Incidencias</div>
              </div>
              
              <div className="resumen-card">
                <div className="resumen-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M3 19V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm8-10h-2v8h2V9zm4 2h-2v6h2v-6zm-8-2h-2v8h2v-8z" fill="#7209b7"/>
                  </svg>
                </div>
                <div className="resumen-valor">{resumenGeneral.coloniasAfectadas || 0}</div>
                <div className="resumen-titulo">Colonias Afectadas</div>
              </div>
              
              <div className="resumen-card">
                <div className="resumen-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M4 6.143v12.824l5.065-2.17 6 3L20 17.68V4.857l1.303-.558a.5.5 0 0 1 .697.46V19l-7 3-6-3-6.303 2.701a.5.5 0 0 1-.697-.46V7l2-.857zm12.243 5.1L12 15.485l-4.243-4.242a6 6 0 1 1 8.486 0zM12 12.657l2.828-2.829a4 4 0 1 0-5.656 0L12 12.657z" fill="#f72585"/>
                  </svg>
                </div>
                <div className="resumen-valor">{resumenGeneral.callesAfectadas || 0}</div>
                <div className="resumen-titulo">Calles Afectadas</div>
              </div>
              
              <div className="resumen-card">
                <div className="resumen-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M12.866 3l9.526 16.5a1 1 0 0 1-.866 1.5H2.474a1 1 0 0 1-.866-1.5L11.134 3a1 1 0 0 1 1.732 0zM11 16v2h2v-2h-2zm0-7v5h2V9h-2z" fill="#4cc9f0"/>
                  </svg>
                </div>
                <div className="resumen-valor principal">{resumenGeneral.coloniaMasAfectada || "Ninguna"}</div>
                <div className="resumen-titulo">Colonia Más Afectada</div>
              </div>
            </div>
          </div>
          
          <div className="estadisticas-grid">
            {/* Estadísticas por categoría */}
            <div className="seccion-estadisticas">
              <h2>Reportes por Categoría</h2>
              {renderGraficaPastelCategorias()}
            </div>
            
            {/* Estadísticas por colonia */}
            <div className="seccion-estadisticas">
              <h2>Reportes por Colonia</h2>
              {renderGraficaBarrasColonias()}
            </div>
          </div>
          
          {/* Tendencias temporales */}
          <div className="seccion-estadisticas">
            <h2>Tendencias Mensuales</h2>
            {renderGraficaTendencias()}
          </div>
          
          {/* Tabla de calles más afectadas */}
          <div className="seccion-estadisticas">
            <h2>Calles Más Afectadas</h2>
            {reportesPorCalle.length > 0 ? (
              <div className="tabla-container">
                <table className="tabla-estadisticas">
                  <thead>
                    <tr>
                      <th>Calle</th>
                      <th>Total de Reportes</th>
                      <th>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesPorCalle.slice(0, 10).map((calle, index) => (
                      <tr key={index} className={index < 3 ? "destacado" : ""}>
                        <td>{calle.name}</td>
                        <td>{calle.value}</td>
                        <td>{totalReportes ? ((calle.value / totalReportes) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-chart">No hay datos disponibles</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Estadisticas;