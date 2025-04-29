// src/views/DashboardJefeDepartamento.jsx
import React, { useState, useEffect } from "react";
import EstadisticasController from "../controllers/EstadisticasController";
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar
} from 'recharts';
import "./Styles/dashboardJefe.css";

const DashboardJefeDepartamento = () => {
  // Estado para la ciudad actual
  const [ciudadActual, setCiudadActual] = useState("Chetumal");
  
  // Estados para almacenar datos
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para los filtros
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  
  // Estados para datos procesados
  const [resumenesDepartamentos, setResumenesDepartamentos] = useState([]);
  const [tiemposResolucion, setTiemposResolucion] = useState([]);
  const [rendimientoEmpleados, setRendimientoEmpleados] = useState([]);
  const [tendenciasSemanal, setTendenciasSemanal] = useState([]);
  const [comparativoDepartamentos, setComparativoDepartamentos] = useState([]);
  const [vistaActual, setVistaActual] = useState('general');
  
  // Configuraciones adicionales
  const departamentos = [
    { id: 'todos', nombre: 'Todos los departamentos' },
    { id: 'basura', nombre: 'Basura Acumulada' },
    { id: 'alumbrado', nombre: 'Alumbrado Público' },
    { id: 'drenaje', nombre: 'Drenajes Obstruidos' },
    { id: 'bacheo', nombre: 'Bacheo' }
  ];
  
  const estatus = [
    { id: 'todos', nombre: 'Todos los estatus' },
    { id: 'pendiente', nombre: 'Pendiente' },
    { id: 'en_proceso', nombre: 'En proceso' },
    { id: 'resuelto', nombre: 'Resuelto' },
    { id: 'cancelado', nombre: 'Cancelado' }
  ];

  const colores = {
    basura: '#4361ee',
    alumbrado: '#3a0ca3',
    drenaje: '#7209b7',
    bacheo: '#f72585',
    pendiente: '#ff9e00',
    en_proceso: '#38b000',
    resuelto: '#3a86ff',
    cancelado: '#d90429'
  };
  
  // Cargar datos al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Configurar fechas por defecto si no están definidas
        if (!filtroFechaInicio) {
          const fechaInicio = new Date();
          fechaInicio.setMonth(fechaInicio.getMonth() - 3); // 3 meses atrás
          setFiltroFechaInicio(fechaInicio.toISOString().split('T')[0]);
        }
        
        if (!filtroFechaFin) {
          const fechaFin = new Date();
          setFiltroFechaFin(fechaFin.toISOString().split('T')[0]);
        }
        
        // Obtener reportes para la ciudad actual
        const resultado = await EstadisticasController.obtenerReportesPorCiudad(ciudadActual);
        
        if (resultado.success) {
          setReportes(resultado.data);
          procesarDatos(resultado.data);
        } else {
          setError(resultado.error);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Ocurrió un error al cargar los datos. Por favor intente nuevamente.");
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [ciudadActual, filtroFechaInicio, filtroFechaFin]);
  
  // Procesar datos cuando cambian los filtros
  useEffect(() => {
    if (reportes.length > 0) {
      procesarDatos(reportes);
    }
  }, [filtroDepartamento, filtroEstatus, reportes]);
  
  // Función principal para procesar datos
  const procesarDatos = (datos) => {
    // Filtrar datos según criterios
    let reportesFiltrados = [...datos];
    
    // Filtro por fechas
    if (filtroFechaInicio && filtroFechaFin) {
      const fechaInicio = new Date(filtroFechaInicio);
      const fechaFin = new Date(filtroFechaFin);
      fechaFin.setHours(23, 59, 59); // Hasta final del día
      
      reportesFiltrados = reportesFiltrados.filter(reporte => 
        reporte.fechaObj >= fechaInicio && reporte.fechaObj <= fechaFin
      );
    }
    
    // Filtro por departamento
    if (filtroDepartamento !== 'todos') {
      const mapeoCategoriasAValoresReales = {
        'basura': 'Basura Acumulada',
        'alumbrado': 'Alumbrado Público',
        'drenaje': 'Drenajes Obstruidos',
        'bacheo': 'Bacheo'
      };
      
      const categoriaABuscar = mapeoCategoriasAValoresReales[filtroDepartamento];
      reportesFiltrados = reportesFiltrados.filter(reporte => 
        reporte.categoria === categoriaABuscar
      );
    }
    
    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      reportesFiltrados = reportesFiltrados.filter(reporte => 
        reporte.estatus === filtroEstatus
      );
    }
    
    // Procesar datos para los diferentes cuadros y gráficas
    procesarResumenesDepartamentos(reportesFiltrados);
    procesarTiemposResolucion(reportesFiltrados);
    procesarRendimientoEmpleados(reportesFiltrados);
    procesarTendenciasSemanal(reportesFiltrados);
    procesarComparativoDepartamentos(reportesFiltrados);
  };
  
  // Resúmenes por departamento
  const procesarResumenesDepartamentos = (datos) => {
    const departamentos = {
      'Basura Acumulada': { 
        total: 0, 
        pendientes: 0, 
        en_proceso: 0, 
        resueltos: 0, 
        cancelados: 0,
        tiempoPromedio: 0,
        valoraciones: 0 
      },
      'Alumbrado Público': { 
        total: 0, 
        pendientes: 0, 
        en_proceso: 0, 
        resueltos: 0, 
        cancelados: 0,
        tiempoPromedio: 0,
        valoraciones: 0
      },
      'Drenajes Obstruidos': { 
        total: 0, 
        pendientes: 0, 
        en_proceso: 0, 
        resueltos: 0, 
        cancelados: 0,
        tiempoPromedio: 0,
        valoraciones: 0 
      },
      'Bacheo': { 
        total: 0, 
        pendientes: 0, 
        en_proceso: 0, 
        resueltos: 0, 
        cancelados: 0,
        tiempoPromedio: 0,
        valoraciones: 0 
      }
    };
    
    // Sumar datos por departamento
    datos.forEach(reporte => {
      if (!departamentos[reporte.categoria]) return;
      
      departamentos[reporte.categoria].total++;
      
      // Contar por estatus
      if (reporte.estatus === 'pendiente') {
        departamentos[reporte.categoria].pendientes++;
      } else if (reporte.estatus === 'en_proceso') {
        departamentos[reporte.categoria].en_proceso++;
      } else if (reporte.estatus === 'resuelto') {
        departamentos[reporte.categoria].resueltos++;
        
        // Calcular tiempo de resolución si hay fechas
        if (reporte.fechaResolucion && reporte.fechaCreacion) {
          const fechaResolucion = new Date(reporte.fechaResolucion.seconds * 1000);
          const fechaCreacion = new Date(reporte.fechaCreacion.seconds * 1000);
          const tiempoDias = (fechaResolucion - fechaCreacion) / (1000 * 60 * 60 * 24);
          
          departamentos[reporte.categoria].tiempoPromedio += tiempoDias;
        }
      } else if (reporte.estatus === 'cancelado') {
        departamentos[reporte.categoria].cancelados++;
      }
      
      // Sumar valoraciones
      if (reporte.valoracion && !isNaN(reporte.valoracion)) {
        departamentos[reporte.categoria].valoraciones += parseFloat(reporte.valoracion);
      }
    });
    
    // Calcular promedios
    Object.keys(departamentos).forEach(departamento => {
      const dept = departamentos[departamento];
      
      // Tiempo promedio de resolución
      if (dept.resueltos > 0) {
        dept.tiempoPromedio = (dept.tiempoPromedio / dept.resueltos).toFixed(1);
      }
      
      // Valoración promedio
      if (dept.total > 0) {
        dept.valoracionPromedio = (dept.valoraciones / dept.total).toFixed(1);
      } else {
        dept.valoracionPromedio = 0;
      }
      
      // Calcular porcentaje de eficiencia
      dept.eficiencia = dept.total > 0 ? 
        ((dept.resueltos / dept.total) * 100).toFixed(1) : 0;
    });
    
    // Convertir a array para renderizado
    const resumenes = Object.keys(departamentos).map(departamento => ({
      nombre: departamento,
      id: departamento.split(' ')[0].toLowerCase(),
      ...departamentos[departamento]
    }));
    
    setResumenesDepartamentos(resumenes);
  };
  
  // Procesar datos de tiempos de resolución
  const procesarTiemposResolucion = (datos) => {
    const reportesResueltos = datos.filter(reporte => 
      reporte.estatus === 'resuelto' && 
      reporte.fechaResolucion && 
      reporte.fechaCreacion
    );
    
    const tiemposPorDepartamento = {
      'Basura Acumulada': [],
      'Alumbrado Público': [],
      'Drenajes Obstruidos': [],
      'Bacheo': []
    };
    
    // Calcular tiempos de resolución
    reportesResueltos.forEach(reporte => {
      if (!tiemposPorDepartamento[reporte.categoria]) return;
      
      const fechaResolucion = new Date(reporte.fechaResolucion.seconds * 1000);
      const fechaCreacion = new Date(reporte.fechaCreacion.seconds * 1000);
      const tiempoDias = (fechaResolucion - fechaCreacion) / (1000 * 60 * 60 * 24);
      
      tiemposPorDepartamento[reporte.categoria].push({
        id: reporte.id,
        tiempo: tiempoDias
      });
    });
    
    // Calcular promedios por semana
    const ultimasSemanas = [];
    const fechaActual = new Date();
    
    // Generar últimas 10 semanas
    for (let i = 0; i < 10; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setDate(fechaActual.getDate() - (i * 7));
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - 7);
      
      const semana = {
        name: `Sem ${i+1}`,
        fechaInicio,
        fechaFin
      };
      
      // Obtener promedios por departamento
      Object.keys(tiemposPorDepartamento).forEach(departamento => {
        const reportesSemana = reportesResueltos.filter(reporte => {
          const fechaResol = new Date(reporte.fechaResolucion.seconds * 1000);
          return reporte.categoria === departamento && 
                 fechaResol >= fechaInicio && 
                 fechaResol <= fechaFin;
        });
        
        if (reportesSemana.length > 0) {
          const tiempoTotal = reportesSemana.reduce((sum, reporte) => {
            const fechaResol = new Date(reporte.fechaResolucion.seconds * 1000);
            const fechaCreac = new Date(reporte.fechaCreacion.seconds * 1000);
            return sum + ((fechaResol - fechaCreac) / (1000 * 60 * 60 * 24));
          }, 0);
          
          semana[departamento.split(' ')[0].toLowerCase()] = parseFloat((tiempoTotal / reportesSemana.length).toFixed(1));
        } else {
          semana[departamento.split(' ')[0].toLowerCase()] = 0;
        }
      });
      
      ultimasSemanas.push(semana);
    }
    
    setTiemposResolucion(ultimasSemanas.reverse());
  };
  
  // Procesar datos de rendimiento de empleados
  const procesarRendimientoEmpleados = (datos) => {
    const empleados = {};
    
    datos.forEach(reporte => {
      if (reporte.responsable) {
        if (!empleados[reporte.responsable]) {
          empleados[reporte.responsable] = {
            nombre: reporte.responsable,
            total: 0,
            resueltos: 0,
            pendientes: 0,
            en_proceso: 0,
            tiempoPromedio: 0,
            tiempoTotal: 0,
            valoracion: 0,
            totalValoraciones: 0
          };
        }
        
        const emp = empleados[reporte.responsable];
        emp.total++;
        
        if (reporte.estatus === 'resuelto') {
          emp.resueltos++;
          
          if (reporte.fechaResolucion && reporte.fechaCreacion) {
            const tiempoDias = (new Date(reporte.fechaResolucion.seconds * 1000) - 
                               new Date(reporte.fechaCreacion.seconds * 1000)) / 
                               (1000 * 60 * 60 * 24);
            emp.tiempoTotal += tiempoDias;
          }
        } else if (reporte.estatus === 'pendiente') {
          emp.pendientes++;
        } else if (reporte.estatus === 'en_proceso') {
          emp.en_proceso++;
        }
        
        if (reporte.valoracion && !isNaN(reporte.valoracion)) {
          emp.valoracion += parseFloat(reporte.valoracion);
          emp.totalValoraciones++;
        }
      }
    });
    
    // Calcular promedios
    Object.values(empleados).forEach(empleado => {
      empleado.eficiencia = empleado.total > 0 ? 
        ((empleado.resueltos / empleado.total) * 100).toFixed(1) : 0;
      
      empleado.tiempoPromedio = empleado.resueltos > 0 ? 
        (empleado.tiempoTotal / empleado.resueltos).toFixed(1) : 0;
      
      empleado.valoracionPromedio = empleado.totalValoraciones > 0 ? 
        (empleado.valoracion / empleado.totalValoraciones).toFixed(1) : 0;
    });
    
    // Convertir a array y ordenar por eficiencia
    const rendimiento = Object.values(empleados)
      .filter(emp => emp.total > 0)
      .sort((a, b) => b.eficiencia - a.eficiencia);
    
    setRendimientoEmpleados(rendimiento);
  };
  
  // Procesar tendencias semanales 
  const procesarTendenciasSemanal = (datos) => {
    const ultimasSemanas = [];
    const fechaActual = new Date();
    
    // Generar últimas 10 semanas
    for (let i = 0; i < 10; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setDate(fechaActual.getDate() - (i * 7));
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - 7);
      
      const semana = {
        name: `Sem ${i+1}`,
        fechaInicio,
        fechaFin,
        total: 0,
        resueltos: 0,
        basura: 0,
        alumbrado: 0,
        drenaje: 0,
        bacheo: 0
      };
      
      // Filtrar reportes de esta semana
      const reportesSemana = datos.filter(reporte => {
        const fechaReporte = reporte.fechaObj;
        return fechaReporte >= fechaInicio && fechaReporte <= fechaFin;
      });
      
      // Contar totales
      semana.total = reportesSemana.length;
      
      // Conteo por categoría
      reportesSemana.forEach(reporte => {
        if (reporte.categoria === 'Basura Acumulada') {
          semana.basura++;
        } else if (reporte.categoria === 'Alumbrado Público') {
          semana.alumbrado++;
        } else if (reporte.categoria === 'Drenajes Obstruidos') {
          semana.drenaje++;
        } else if (reporte.categoria === 'Bacheo') {
          semana.bacheo++;
        }
        
        if (reporte.estatus === 'resuelto') {
          semana.resueltos++;
        }
      });
      
      ultimasSemanas.push(semana);
    }
    
    setTendenciasSemanal(ultimasSemanas.reverse());
  };
  
  // Procesar comparativo de departamentos
  const procesarComparativoDepartamentos = (datos) => {
    const departamentos = [
      { name: 'Basura', categoria: 'Basura Acumulada' },
      { name: 'Alumbrado', categoria: 'Alumbrado Público' },
      { name: 'Drenaje', categoria: 'Drenajes Obstruidos' },
      { name: 'Bacheo', categoria: 'Bacheo' }
    ];
    
    departamentos.forEach(depto => {
      const reportesDepto = datos.filter(rep => rep.categoria === depto.categoria);
      
      // Total de reportes
      depto.reportes = reportesDepto.length;
      
      // Reportes resueltos
      const resueltos = reportesDepto.filter(rep => rep.estatus === 'resuelto');
      depto.resueltos = resueltos.length;
      
      // Porcentaje de resolución
      depto.porcentaje = depto.reportes > 0 ? 
        ((depto.resueltos / depto.reportes) * 100).toFixed(1) : 0;
      
      // Tiempo promedio 
      let tiempoTotal = 0;
      resueltos.forEach(rep => {
        if (rep.fechaResolucion && rep.fechaCreacion) {
          tiempoTotal += (new Date(rep.fechaResolucion.seconds * 1000) - 
                          new Date(rep.fechaCreacion.seconds * 1000)) / 
                          (1000 * 60 * 60 * 24);
        }
      });
      
      depto.tiempoPromedio = resueltos.length > 0 ? 
        (tiempoTotal / resueltos.length).toFixed(1) : 0;
        
      // Valoración promedio
      let valoracionTotal = 0;
      let reportesValorados = 0;
      
      reportesDepto.forEach(rep => {
        if (rep.valoracion && !isNaN(rep.valoracion)) {
          valoracionTotal += parseFloat(rep.valoracion);
          reportesValorados++;
        }
      });
      
      depto.valoracion = reportesValorados > 0 ? 
        (valoracionTotal / reportesValorados).toFixed(1) : 0;
    });
    
    setComparativoDepartamentos(departamentos);
  };
  
  // Cambiar entre diferentes vistas de estadísticas
  const cambiarVista = (vista) => {
    setVistaActual(vista);
  };
  
  // Función para exportar reportes a Excel
  const exportarReportes = () => {
    alert("Función de exportación a Excel se implementará próximamente");
  };
  
  // RENDERIZADO DE COMPONENTES
  
  // Render de comparativo de radar
  const renderRadarComparativo = () => {
    const dataRadar = comparativoDepartamentos.map(dept => ({
      subject: dept.name,
      eficiencia: parseFloat(dept.porcentaje) || 0,
      tiempoPromedio: parseFloat(dept.tiempoPromedio) || 0,
      valoracion: parseFloat(dept.valoracion) * 20 || 0, // Multiplicar por 20 para escalar de 0-5 a 0-100
    }));
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={dataRadar}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar 
            name="Eficiencia (%)" 
            dataKey="eficiencia" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.6} 
          />
          <Radar 
            name="Valoración Usuario" 
            dataKey="valoracion" 
            stroke="#82ca9d" 
            fill="#82ca9d" 
            fillOpacity={0.6} 
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render de gráfico de tiempos de resolución
  const renderGraficoTiempos = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={tiemposResolucion}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Días', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="basura" stroke={colores.basura} name="Basura" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="alumbrado" stroke={colores.alumbrado} name="Alumbrado" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="drenaje" stroke={colores.drenaje} name="Drenaje" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="bacheo" stroke={colores.bacheo} name="Bacheo" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  // Render de gráfico de tendencias por departamento
  const renderGraficoTendencias = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={tendenciasSemanal}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="basura" stackId="1" stroke={colores.basura} fill={colores.basura} name="Basura" />
          <Area type="monotone" dataKey="alumbrado" stackId="1" stroke={colores.alumbrado} fill={colores.alumbrado} name="Alumbrado" />
          <Area type="monotone" dataKey="drenaje" stackId="1" stroke={colores.drenaje} fill={colores.drenaje} name="Drenaje" />
          <Area type="monotone" dataKey="bacheo" stackId="1" stroke={colores.bacheo} fill={colores.bacheo} name="Bacheo" />
        </AreaChart>
      </ResponsiveContainer>
    );
  };
  
  // Render de tabla de rendimiento de empleados
  const renderTablaEmpleados = () => {
    return (
      <div className="tabla-container">
        <table className="tabla-rendimiento">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Total</th>
              <th>Resueltos</th>
              <th>Eficiencia</th>
              <th>Tiempo Prom.</th>
              <th>Valoración</th>
            </tr>
          </thead>
          <tbody>
            {rendimientoEmpleados.slice(0, 10).map((empleado, index) => (
              <tr key={index} className={index < 3 ? "destacado" : ""}>
                <td>{empleado.nombre}</td>
                <td>{empleado.total}</td>
                <td>{empleado.resueltos}</td>
                <td>{empleado.eficiencia}%</td>
                <td>{empleado.tiempoPromedio} días</td>
                <td>
                  <div className="valoracion-estrellas">
                    <span className="valor">{empleado.valoracionPromedio}</span>
                    <span className="estrellas">
                      {'★'.repeat(Math.round(empleado.valoracionPromedio))}
                      {'☆'.repeat(5 - Math.round(empleado.valoracionPromedio))}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render de vista general con tarjetas de departamentos
  const renderVistaGeneral = () => {
    return (
      <div className="departamentos-container">
        {resumenesDepartamentos.map((depto, index) => (
          <div className="tarjeta-departamento" key={index}>
            <div className="tarjeta-header" style={{ backgroundColor: colores[depto.id] }}>
              <h3>{depto.nombre}</h3>
              <div className="total-reportes">{depto.total} reportes</div>
            </div>
            <div className="tarjeta-body">
              <div className="estadisticas-row">
                <div className="estadistica-item">
                  <div className="item-valor">{depto.eficiencia}%</div>
                  <div className="item-etiqueta">Eficiencia</div>
                </div>
                <div className="estadistica-item">
                  <div className="item-valor">{depto.tiempoPromedio}</div>
                  <div className="item-etiqueta">Días Promedio</div>
                </div>
                <div className="estadistica-item">
                  <div className="item-valor">{depto.valoracionPromedio}</div>
                  <div className="item-etiqueta">Valoración</div>
                </div>
              </div>
              
              <div className="progreso-container">
                <div className="progreso-label">
                  <span>Estatus</span>
                  <span>{depto.resueltos} de {depto.total} resueltos</span>
                </div>
                <div className="barra-progreso">
                  <div 
                    className="progreso-completado" 
                    style={{ 
                      width: `${depto.total > 0 ? (depto.resueltos / depto.total) * 100 : 0}%`,
                      backgroundColor: colores[depto.id]
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="estatus-counts">
                <div className="estatus-item">
                  <span className="estatus-count">{depto.pendientes}</span>
                  <span className="estatus-label">Pendientes</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count">{depto.en_proceso}</span>
                  <span className="estatus-label">En Proceso</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count">{depto.resueltos}</span>
                  <span className="estatus-label">Resueltos</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count">{depto.cancelados}</span>
                  <span className="estatus-label">Cancelados</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="dashboard-jefe-container">
      <div className="dashboard-header">
        <h1>Dashboard de Departamentos</h1>
        <p>Monitoreo de desempeño y estadísticas de servicios municipales</p>
      </div>
      
      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtro-grupo">
          <label>Departamento:</label>
          <select 
            value={filtroDepartamento} 
            onChange={(e) => setFiltroDepartamento(e.target.value)}
          >
            {departamentos.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.nombre}</option>
            ))}
          </select>
        </div>
        
        <div className="filtro-grupo">
          <label>Desde:</label>
          <input 
            type="date" 
            value={filtroFechaInicio}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
          />
        </div>
        
        <div className="filtro-grupo">
          <label>Hasta:</label>
          <input 
            type="date" 
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
          />
        </div>
        
        <div className="filtro-grupo">
          <label>Estatus:</label>
          <select 
            value={filtroEstatus} 
            onChange={(e) => setFiltroEstatus(e.target.value)}
          >
            {estatus.map(est => (
              <option key={est.id} value={est.id}>{est.nombre}</option>
            ))}
          </select>
        </div>
        
        <button className="btn-exportar" onClick={exportarReportes}>
          Exportar a Excel
        </button>
      </div>
      
      {/* Navegación entre vistas */}
      <div className="nav-vistas">
        <button 
          className={vistaActual === 'general' ? 'active' : ''} 
          onClick={() => cambiarVista('general')}
        >
          Vista General
        </button>
        <button 
          className={vistaActual === 'rendimiento' ? 'active' : ''} 
          onClick={() => cambiarVista('rendimiento')}
        >
          Rendimiento
        </button>
        <button 
          className={vistaActual === 'tiempos' ? 'active' : ''} 
          onClick={() => cambiarVista('tiempos')}
        >
          Tiempos de Resolución
        </button>
        <button 
          className={vistaActual === 'tendencias' ? 'active' : ''} 
          onClick={() => cambiarVista('tendencias')}
        >
          Tendencias
        </button>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando datos estadísticos...</p>
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
        <div className="dashboard-content">
          {/* Vista General */}
          {vistaActual === 'general' && (
            <>
              {/* Resumen comparativo de departamentos */}
              <div className="seccion-dashboard">
                <h2>Comparativo de Departamentos</h2>
                <div className="grafico-comparativo">
                  {renderRadarComparativo()}
                </div>
              </div>
              
              {/* Tarjetas de departamentos */}
              <div className="seccion-dashboard">
                <h2>Desempeño por Departamento</h2>
                {renderVistaGeneral()}
              </div>
            </>
          )}
          
          {/* Vista de Rendimiento */}
          {vistaActual === 'rendimiento' && (
            <div className="seccion-dashboard">
              <h2>Rendimiento de Empleados</h2>
              {renderTablaEmpleados()}
              
              <div className="grafico-container">
                <h3>Top 5 Empleados por Eficiencia</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={rendimientoEmpleados.slice(0, 5)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      tick={{ angle: -45, textAnchor: 'end', dominantBaseline: 'ideographic' }}
                      height={70} 
                    />
                    <YAxis label={{ value: 'Eficiencia (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="eficiencia" name="Eficiencia" fill="#4361ee" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Vista de Tiempos de Resolución */}
          {vistaActual === 'tiempos' && (
            <div className="seccion-dashboard">
              <h2>Tiempos de Resolución por Departamento</h2>
              <p className="descripcion-grafico">
                Este gráfico muestra el tiempo promedio (en días) que cada departamento tarda en resolver reportes.
              </p>
              {renderGraficoTiempos()}
              
              <div className="comparativo-container">
                <h3>Comparativo de Tiempos Promedio</h3>
                <div className="tabla-container">
                  <table className="tabla-comparativo">
                    <thead>
                      <tr>
                        <th>Departamento</th>
                        <th>Reportes Totales</th>
                        <th>Reportes Resueltos</th>
                        <th>Tiempo Promedio</th>
                        <th>Resolución (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativoDepartamentos.map((dept, index) => (
                        <tr key={index}>
                          <td>{dept.name}</td>
                          <td>{dept.reportes}</td>
                          <td>{dept.resueltos}</td>
                          <td>{dept.tiempoPromedio} días</td>
                          <td>{dept.porcentaje}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Vista de Tendencias */}
          {vistaActual === 'tendencias' && (
            <div className="seccion-dashboard">
              <h2>Tendencias de Reportes por Semana</h2>
              <p className="descripcion-grafico">
                Este gráfico muestra la evolución en el volumen de reportes por departamento en las últimas semanas.
              </p>
              {renderGraficoTendencias()}
              
              <div className="grafico-container">
                <h3>Eficiencia de Resolución Semanal</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={tendenciasSemanal}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="resueltos" 
                      stroke="#38b000" 
                      name="Reportes Resueltos" 
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#ff9e00" 
                      name="Reportes Totales" 
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardJefeDepartamento;