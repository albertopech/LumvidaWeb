// src/views/DashboardJefeDepartamento.jsx
import React, { useState, useEffect } from "react";
import EstadisticasControllerExtendido from "../controllers/EstadisticasControllerExtendido";
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer
} from 'recharts';
import "./Styles/dashboardJefe.css";

const DashboardJefeDepartamento = () => {
  // Estado para la ciudad actual
  const [ciudadActual, setCiudadActual] = useState("Chetumal");
  
  // Estados para almacenar datos
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  // Estados para los filtros
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  
  // Estados para datos procesados
  const [resumenesDepartamentos, setResumenesDepartamentos] = useState([]);
  const [tiemposResolucion, setTiemposResolucion] = useState([]);
  const [tendenciasSemanal, setTendenciasSemanal] = useState([]);
  const [tendenciasMensual, setTendenciasMensual] = useState([]);
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
    basura: '#4a90e2',
    alumbrado: '#3d38ea',
    drenaje: '#7c3aed',
    bacheo: '#e91e63',
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
        setCargando(true);
        
        // Configurar fechas por defecto
        if (!filtroFechaInicio) {
          const fechaInicio = new Date();
          fechaInicio.setMonth(fechaInicio.getMonth() - 6);
          setFiltroFechaInicio(fechaInicio.toISOString().split('T')[0]);
        }
        
        if (!filtroFechaFin) {
          const fechaFin = new Date();
          setFiltroFechaFin(fechaFin.toISOString().split('T')[0]);
        }
        
        console.log("Cargando datos para ciudad:", ciudadActual);
        
        const resultado = await EstadisticasControllerExtendido.obtenerReportesDetallados(ciudadActual);
        
        if (resultado.success) {
          console.log(`Reportes cargados exitosamente: ${resultado.data.length}`);
          const reportesNormalizados = normalizarDatos(resultado.data);
          setReportes(reportesNormalizados);
          procesarDatos(reportesNormalizados);
        } else {
          console.error("Error al obtener reportes:", resultado.error);
          setError(resultado.error || "Error al cargar los reportes");
        }
        
        setLoading(false);
        setCargando(false);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Ocurrió un error al cargar los datos. Por favor intente nuevamente.");
        setLoading(false);
        setCargando(false);
      }
    };
    
    cargarDatos();
  }, [ciudadActual]);
  
  // Normalizar datos para consistencia
  const normalizarDatos = (datos) => {
    return datos.map(reporte => {
      const estado = reporte.estado || reporte.estatus || 'pendiente';
      const estatus = reporte.estatus || reporte.estado || 'pendiente';
      
      let categoria = reporte.categoria;
      if (categoria === 'Basura') categoria = 'Basura Acumulada';
      if (categoria === 'Alumbrado') categoria = 'Alumbrado Público';
      if (categoria === 'Drenaje') categoria = 'Drenajes Obstruidos';
      
      let fechaObj = reporte.fechaObj || null;
      if (!fechaObj) {
        if (reporte.fechaCreacion && reporte.fechaCreacion.seconds) {
          fechaObj = new Date(reporte.fechaCreacion.seconds * 1000);
        } else if (reporte.fecha && reporte.fecha.seconds) {
          fechaObj = new Date(reporte.fecha.seconds * 1000);
        } else if (reporte.fechaCreacion) {
          fechaObj = new Date(reporte.fechaCreacion);
        } else if (reporte.fecha) {
          fechaObj = new Date(reporte.fecha);
        } else {
          fechaObj = new Date();
        }
      }
      
      return {
        ...reporte,
        estado,
        estatus,
        categoria,
        fechaObj
      };
    });
  };
  
  // Procesar datos cuando cambian los filtros
  useEffect(() => {
    if (reportes.length > 0) {
      procesarDatos(reportes);
    }
  }, [filtroDepartamento, filtroEstatus, filtroFechaInicio, filtroFechaFin]);
  
  // Función principal para procesar datos
  const procesarDatos = (datos) => {
    console.log("Procesando datos, total reportes:", datos.length);
    
    let reportesFiltrados = [...datos];
    
    // Filtro por fechas
    if (filtroFechaInicio && filtroFechaFin) {
      const fechaInicio = new Date(filtroFechaInicio);
      const fechaFin = new Date(filtroFechaFin);
      fechaFin.setHours(23, 59, 59);
      
      reportesFiltrados = reportesFiltrados.filter(reporte => {
        return reporte.fechaObj >= fechaInicio && reporte.fechaObj <= fechaFin;
      });
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
      reportesFiltrados = reportesFiltrados.filter(reporte => {
        const estadoReporte = reporte.estatus || reporte.estado || 'pendiente';
        
        if (filtroEstatus === 'en_proceso' && (estadoReporte === 'en proceso' || estadoReporte === 'en_proceso')) {
          return true;
        }
        
        if (filtroEstatus === 'resuelto' && (estadoReporte === 'resuelto' || estadoReporte === 'completado')) {
          return true;
        }
        
        return estadoReporte === filtroEstatus;
      });
    }
    
    // Procesar datos para gráficas
    procesarResumenesDepartamentos(reportesFiltrados);
    procesarTiemposResolucion(reportesFiltrados);
    procesarTendenciasSemanal(reportesFiltrados);
    procesarTendenciasMensual(reportesFiltrados);
    procesarComparativoDepartamentos(reportesFiltrados);
  };
  
  // Resúmenes por departamento
  const procesarResumenesDepartamentos = (datos) => {
    const departamentos = {
      'Basura Acumulada': { 
        id: 'basura', nombre: 'Basura Acumulada',
        total: 0, pendientes: 0, en_proceso: 0, resueltos: 0, cancelados: 0,
        tiempoPromedio: 0, tiempoTotal: 0, valoraciones: 0, totalValoraciones: 0
      },
      'Alumbrado Público': { 
        id: 'alumbrado', nombre: 'Alumbrado Público',
        total: 0, pendientes: 0, en_proceso: 0, resueltos: 0, cancelados: 0,
        tiempoPromedio: 0, tiempoTotal: 0, valoraciones: 0, totalValoraciones: 0
      },
      'Drenajes Obstruidos': { 
        id: 'drenaje', nombre: 'Drenajes Obstruidos',
        total: 0, pendientes: 0, en_proceso: 0, resueltos: 0, cancelados: 0,
        tiempoPromedio: 0, tiempoTotal: 0, valoraciones: 0, totalValoraciones: 0
      },
      'Bacheo': { 
        id: 'bacheo', nombre: 'Bacheo',
        total: 0, pendientes: 0, en_proceso: 0, resueltos: 0, cancelados: 0,
        tiempoPromedio: 0, tiempoTotal: 0, valoraciones: 0, totalValoraciones: 0
      }
    };
    
    datos.forEach(reporte => {
      let categoria = reporte.categoria;
      if (!departamentos[categoria]) {
        if (categoria === 'Basura') categoria = 'Basura Acumulada';
        if (categoria === 'Alumbrado') categoria = 'Alumbrado Público';
        if (categoria === 'Drenaje') categoria = 'Drenajes Obstruidos';
        
        if (!departamentos[categoria]) {
          console.log(`Categoría no reconocida: ${reporte.categoria}`);
          return;
        }
      }
      
      departamentos[categoria].total++;
      
      const estadoReporte = reporte.estatus || reporte.estado || 'pendiente';
      
      if (estadoReporte === 'pendiente') {
        departamentos[categoria].pendientes++;
      } else if (estadoReporte === 'en_proceso' || estadoReporte === 'en proceso') {
        departamentos[categoria].en_proceso++;
      } else if (estadoReporte === 'resuelto' || estadoReporte === 'completado') {
        departamentos[categoria].resueltos++;
        
        if (reporte.tiempoResolucion) {
          departamentos[categoria].tiempoTotal += reporte.tiempoResolucion;
        } else if (reporte.fechaResolucion && reporte.fechaObj) {
          try {
            const fechaResolucion = reporte.fechaResolucion.seconds ? 
              new Date(reporte.fechaResolucion.seconds * 1000) : 
              new Date(reporte.fechaResolucion);
            
            const tiempoDias = (fechaResolucion - reporte.fechaObj) / (1000 * 60 * 60 * 24);
            departamentos[categoria].tiempoTotal += tiempoDias;
          } catch (e) {
            console.error("Error al calcular tiempo de resolución:", e);
          }
        }
      } else if (estadoReporte === 'cancelado') {
        departamentos[categoria].cancelados++;
      }
      
      if (reporte.valoracion && !isNaN(reporte.valoracion)) {
        departamentos[categoria].valoraciones += parseFloat(reporte.valoracion);
        departamentos[categoria].totalValoraciones++;
      }
    });
    
    // Calcular promedios
    Object.keys(departamentos).forEach(departamento => {
      const dept = departamentos[departamento];
      
      if (dept.resueltos > 0) {
        dept.tiempoPromedio = (dept.tiempoTotal / dept.resueltos).toFixed(1);
      }
      
      if (dept.totalValoraciones > 0) {
        dept.valoracionPromedio = (dept.valoraciones / dept.totalValoraciones).toFixed(1);
      } else {
        dept.valoracionPromedio = 0;
      }
      
      dept.eficiencia = dept.total > 0 ? 
        ((dept.resueltos / dept.total) * 100).toFixed(1) : 0;
    });
    
    const resumenes = Object.keys(departamentos).map(departamento => ({
      ...departamentos[departamento]
    }));
    
    setResumenesDepartamentos(resumenes);
  };
  
  // Procesar datos de tiempos de resolución
  const procesarTiemposResolucion = (datos) => {
    const reportesResueltos = datos.filter(reporte => {
      const estadoReporte = reporte.estatus || reporte.estado || '';
      return (estadoReporte === 'resuelto' || estadoReporte === 'completado');
    });
    
    const tiemposPorDepartamento = {
      'Basura Acumulada': { tiempos: [], nombre: 'Basura' },
      'Alumbrado Público': { tiempos: [], nombre: 'Alumbrado' },
      'Drenajes Obstruidos': { tiempos: [], nombre: 'Drenaje' },
      'Bacheo': { tiempos: [], nombre: 'Bacheo' }
    };
    
    const ultimasSemanas = [];
    const fechaActual = new Date();
    
    for (let i = 0; i < 4; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setDate(fechaActual.getDate() - (i * 7));
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - 7);
      
      const opciones = { day: 'numeric', month: 'short' };
      const fechaInicioStr = fechaInicio.toLocaleDateString('es-ES', opciones);
      const fechaFinStr = fechaFin.toLocaleDateString('es-ES', opciones);
      
      const semana = {
        semana: `${fechaInicioStr} - ${fechaFinStr}`,
        fechaInicio,
        fechaFin
      };
      
      Object.keys(tiemposPorDepartamento).forEach(departamento => {
        const reportesSemana = reportesResueltos.filter(reporte => {
          if (reporte.categoria !== departamento) return false;
          
          let fechaResol;
          try {
            if (reporte.fechaResolucion) {
              fechaResol = reporte.fechaResolucion.seconds ? 
                new Date(reporte.fechaResolucion.seconds * 1000) : 
                new Date(reporte.fechaResolucion);
            } else {
              return false;
            }
          } catch (e) {
            return false;
          }
          
          return fechaResol >= fechaInicio && fechaResol <= fechaFin;
        });
        
        let tiempoPromedio = 0;
        if (reportesSemana.length > 0) {
          let tiempoTotal = 0;
          let reportesValidos = 0;
          
          reportesSemana.forEach(reporte => {
            if (reporte.tiempoResolucion) {
              tiempoTotal += reporte.tiempoResolucion;
              reportesValidos++;
            } else if (reporte.fechaResolucion && reporte.fechaObj) {
              try {
                const fechaResol = reporte.fechaResolucion.seconds ? 
                  new Date(reporte.fechaResolucion.seconds * 1000) : 
                  new Date(reporte.fechaResolucion);
                  
                const tiempoDias = (fechaResol - reporte.fechaObj) / (1000 * 60 * 60 * 24);
                tiempoTotal += tiempoDias;
                reportesValidos++;
              } catch (e) {
                console.error("Error en cálculo de tiempo:", e);
              }
            }
          });
          
          tiempoPromedio = reportesValidos > 0 ? tiempoTotal / reportesValidos : 0;
        }
        
        const deptName = tiemposPorDepartamento[departamento].nombre;
        semana[deptName] = parseFloat(tiempoPromedio.toFixed(1));
      });
      
      ultimasSemanas.push(semana);
    }
    
    setTiemposResolucion(ultimasSemanas.reverse());
  };
  
  // Procesar tendencias semanales
  const procesarTendenciasSemanal = (datos) => {
    const ultimasSemanas = [];
    const fechaActual = new Date();
    
    for (let i = 0; i < 4; i++) {
      const fechaFin = new Date(fechaActual);
      fechaFin.setDate(fechaActual.getDate() - (i * 7));
      
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - 7);
      
      const opciones = { day: 'numeric', month: 'short' };
      const fechaInicioStr = fechaInicio.toLocaleDateString('es-ES', opciones);
      const fechaFinStr = fechaFin.toLocaleDateString('es-ES', opciones);
      
      const semana = {
        semana: `${fechaInicioStr} - ${fechaFinStr}`,
        fechaInicio,
        fechaFin,
        total: 0,
        resueltos: 0,
        pendientes: 0,
        basura: 0,
        alumbrado: 0,
        drenaje: 0,
        bacheo: 0
      };
      
      const reportesSemana = datos.filter(reporte => {
        return reporte.fechaObj >= fechaInicio && reporte.fechaObj <= fechaFin;
      });
      
      semana.total = reportesSemana.length;
      
      reportesSemana.forEach(reporte => {
        const categoria = reporte.categoria;
        const estadoReporte = reporte.estatus || reporte.estado || '';
        
        if (categoria === 'Basura Acumulada' || categoria === 'Basura') {
          semana.basura++;
        } else if (categoria === 'Alumbrado Público' || categoria === 'Alumbrado') {
          semana.alumbrado++;
        } else if (categoria === 'Drenajes Obstruidos' || categoria === 'Drenaje') {
          semana.drenaje++;
        } else if (categoria === 'Bacheo') {
          semana.bacheo++;
        }
        
        if (estadoReporte === 'resuelto' || estadoReporte === 'completado') {
          semana.resueltos++;
        } else if (estadoReporte === 'pendiente') {
          semana.pendientes++;
        }
      });
      
      semana.eficiencia = semana.total > 0 ? 
        parseFloat(((semana.resueltos / semana.total) * 100).toFixed(1)) : 0;
      
      ultimasSemanas.push(semana);
    }
    
    setTendenciasSemanal(ultimasSemanas.reverse());
  };
  
  // Procesar tendencias mensuales
  const procesarTendenciasMensual = (datos) => {
    const ultimosMeses = [];
    const fechaActual = new Date();
    
    for (let i = 0; i < 6; i++) {
      const fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i + 1, 0);
      const fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      
      const opciones = { month: 'short', year: 'numeric' };
      const nombreMes = fechaInicio.toLocaleDateString('es-ES', opciones);
      
      const mes = {
        mes: nombreMes,
        fechaInicio,
        fechaFin,
        total: 0,
        resueltos: 0,
        pendientes: 0,
        basura: 0,
        alumbrado: 0,
        drenaje: 0,
        bacheo: 0,
        tiempoPromedioBasura: 0,
        tiempoPromedioAlumbrado: 0,
        tiempoPromedioDrenaje: 0,
        tiempoPromedioBacheo: 0
      };
      
      const reportesMes = datos.filter(reporte => {
        return reporte.fechaObj >= fechaInicio && reporte.fechaObj <= fechaFin;
      });
      
      mes.total = reportesMes.length;
      
      const reportesPorCategoria = {
        'Basura Acumulada': [],
        'Alumbrado Público': [],
        'Drenajes Obstruidos': [],
        'Bacheo': []
      };
      
      reportesMes.forEach(reporte => {
        const categoria = reporte.categoria;
        const estadoReporte = reporte.estatus || reporte.estado || '';
        
        if (categoria === 'Basura Acumulada' || categoria === 'Basura') {
          mes.basura++;
          reportesPorCategoria['Basura Acumulada'].push(reporte);
        } else if (categoria === 'Alumbrado Público' || categoria === 'Alumbrado') {
          mes.alumbrado++;
          reportesPorCategoria['Alumbrado Público'].push(reporte);
        } else if (categoria === 'Drenajes Obstruidos' || categoria === 'Drenaje') {
          mes.drenaje++;
          reportesPorCategoria['Drenajes Obstruidos'].push(reporte);
        } else if (categoria === 'Bacheo') {
          mes.bacheo++;
          reportesPorCategoria['Bacheo'].push(reporte);
        }
        
        if (estadoReporte === 'resuelto' || estadoReporte === 'completado') {
          mes.resueltos++;
        } else if (estadoReporte === 'pendiente') {
          mes.pendientes++;
        }
      });
      
      // Calcular tiempos promedio por departamento
      Object.keys(reportesPorCategoria).forEach(categoria => {
        const reportesCategoria = reportesPorCategoria[categoria];
        const reportesResueltos = reportesCategoria.filter(rep => {
          const estado = rep.estatus || rep.estado || '';
          return estado === 'resuelto' || estado === 'completado';
        });
        
        if (reportesResueltos.length > 0) {
          let tiempoTotal = 0;
          let reportesConTiempo = 0;
          
          reportesResueltos.forEach(reporte => {
            if (reporte.tiempoResolucion) {
              tiempoTotal += reporte.tiempoResolucion;
              reportesConTiempo++;
            } else if (reporte.fechaResolucion && reporte.fechaObj) {
              try {
                const fechaResolucion = reporte.fechaResolucion.seconds ? 
                  new Date(reporte.fechaResolucion.seconds * 1000) : 
                  new Date(reporte.fechaResolucion);
                
                const tiempoDias = (fechaResolucion - reporte.fechaObj) / (1000 * 60 * 60 * 24);
                tiempoTotal += tiempoDias;
                reportesConTiempo++;
              } catch (e) {
                console.error("Error al calcular tiempo mensual:", e);
              }
            }
          });
          
          const tiempoPromedio = reportesConTiempo > 0 ? tiempoTotal / reportesConTiempo : 0;
          
          if (categoria === 'Basura Acumulada') {
            mes.tiempoPromedioBasura = parseFloat(tiempoPromedio.toFixed(1));
          } else if (categoria === 'Alumbrado Público') {
            mes.tiempoPromedioAlumbrado = parseFloat(tiempoPromedio.toFixed(1));
          } else if (categoria === 'Drenajes Obstruidos') {
            mes.tiempoPromedioDrenaje = parseFloat(tiempoPromedio.toFixed(1));
          } else if (categoria === 'Bacheo') {
            mes.tiempoPromedioBacheo = parseFloat(tiempoPromedio.toFixed(1));
          }
        }
      });
      
      mes.eficiencia = mes.total > 0 ? 
        parseFloat(((mes.resueltos / mes.total) * 100).toFixed(1)) : 0;
      
      ultimosMeses.push(mes);
    }
    
    setTendenciasMensual(ultimosMeses.reverse());
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
      const reportesDepto = datos.filter(rep => {
        if (rep.categoria === depto.categoria) return true;
        if (depto.categoria === 'Basura Acumulada' && rep.categoria === 'Basura') return true;
        if (depto.categoria === 'Alumbrado Público' && rep.categoria === 'Alumbrado') return true;
        if (depto.categoria === 'Drenajes Obstruidos' && rep.categoria === 'Drenaje') return true;
        return false;
      });
      
      depto.reportes = reportesDepto.length;
      
      const resueltos = reportesDepto.filter(rep => {
        const estadoReporte = rep.estatus || rep.estado || '';
        return estadoReporte === 'resuelto' || estadoReporte === 'completado';
      });
      depto.resueltos = resueltos.length;
      
      depto.porcentaje = depto.reportes > 0 ? 
        ((depto.resueltos / depto.reportes) * 100).toFixed(1) : 0;
      
      let tiempoTotal = 0;
      let reportesConTiempo = 0;
      
      resueltos.forEach(rep => {
        if (rep.tiempoResolucion) {
          tiempoTotal += rep.tiempoResolucion;
          reportesConTiempo++;
        } else if (rep.fechaResolucion && rep.fechaObj) {
          try {
            const fechaResolucion = rep.fechaResolucion.seconds ? 
              new Date(rep.fechaResolucion.seconds * 1000) : 
              new Date(rep.fechaResolucion);
            
            const tiempoDias = (fechaResolucion - rep.fechaObj) / (1000 * 60 * 60 * 24);
            tiempoTotal += tiempoDias;
            reportesConTiempo++;
          } catch (e) {
            console.error("Error al calcular tiempo comparativo:", e);
          }
        }
      });
      
      depto.tiempoPromedio = reportesConTiempo > 0 ? 
        (tiempoTotal / reportesConTiempo).toFixed(1) : 0;
        
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
  
  // Cambiar entre diferentes vistas
  const cambiarVista = (vista) => {
    setVistaActual(vista);
  };
  
  // Función para exportar reportes
  const exportarReportes = () => {
    alert("Función de exportación a Excel se implementará próximamente");
  };
  
  // RENDERIZADO DE COMPONENTES
  
  // Render de comparativo de departamentos
  const renderComparativoDepartamentos = () => {
    if (!comparativoDepartamentos || comparativoDepartamentos.length === 0) {
      return <div className="sin-datos-mensaje">No hay suficientes datos para mostrar el comparativo de departamentos.</div>;
    }
    
    const maxReportes = Math.max(...comparativoDepartamentos.map(dept => dept.reportes));
    const maxPorcentaje = Math.max(...comparativoDepartamentos.map(dept => parseFloat(dept.porcentaje)));
    const maxTotal = Math.max(maxReportes, maxPorcentaje);
    
    const generarTicks = (max) => {
      const ticks = [];
      const step = Math.ceil(max / 10);
      for (let i = 0; i <= max + step; i += step) {
        ticks.push(i);
      }
      comparativoDepartamentos.forEach(dept => {
        if (!ticks.includes(dept.reportes)) ticks.push(dept.reportes);
        if (!ticks.includes(dept.resueltos)) ticks.push(dept.resueltos);
        const porcentaje = Math.round(parseFloat(dept.porcentaje));
        if (!ticks.includes(porcentaje)) ticks.push(porcentaje);
      });
      return ticks.sort((a, b) => a - b);
    };
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={comparativoDepartamentos}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis 
            label={{ value: 'Reportes / Porcentaje', angle: -90, position: 'insideLeft' }}
            domain={[0, maxTotal + 5]}
            ticks={generarTicks(maxTotal)}
            allowDecimals={false}
          />
          <Tooltip 
            formatter={(value, name, entry) => {
              if (name === 'Porcentaje de Resolución') {
                return [`${value}%`, name];
              }
              return [`${value} reportes`, name];
            }}
          />
          <Legend />
          <Bar dataKey="reportes" name="Total Reportes">
            {comparativoDepartamentos.map((entry, index) => {
              const colorDepartamento = colores[entry.name.toLowerCase()] || '#8884d8';
              return <Cell key={`cell-reportes-${index}`} fill={colorDepartamento} />;
            })}
          </Bar>
          <Bar dataKey="resueltos" name="Reportes Resueltos">
            {comparativoDepartamentos.map((entry, index) => {
              const colorDepartamento = colores[entry.name.toLowerCase()] || '#82ca9d';
              return <Cell key={`cell-resueltos-${index}`} fill={colorDepartamento} fillOpacity={0.7} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render de vista general con tarjetas
  const renderVistaGeneral = () => {
    if (!resumenesDepartamentos || resumenesDepartamentos.length === 0) {
      return <div className="sin-datos-mensaje">No hay datos de departamentos para mostrar.</div>;
    }
    
    return (
      <div className="departamentos-container">
        {resumenesDepartamentos.map((depto, index) => (
          <div className="tarjeta-departamento" key={index}>
            <div className="tarjeta-header" style={{ backgroundColor: colores[depto.id], color: '#ffffff' }}>
              <h3 style={{ color: '#ffffff', fontWeight: 'bold' }}>{depto.nombre}</h3>
              <div className="total-reportes" style={{ color: '#ffffff', fontWeight: '600' }}>{depto.total} reportes</div>
            </div>
            <div className="tarjeta-body">
              <div className="estadisticas-row">
                <div className="estadistica-item">
                  <div className="item-valor" style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '1.2rem' }}>{depto.eficiencia}%</div>
                  <div className="item-etiqueta" style={{ color: '#6b7280', fontWeight: '500' }}>Eficiencia</div>
                </div>
                <div className="estadistica-item">
                  <div className="item-valor" style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '1.2rem' }}>{depto.tiempoPromedio}</div>
                  <div className="item-etiqueta" style={{ color: '#6b7280', fontWeight: '500' }}>Días Promedio</div>
                </div>
                <div className="estadistica-item">
                  <div className="item-valor" style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '1.2rem' }}>{depto.valoracionPromedio}</div>
                  <div className="item-etiqueta" style={{ color: '#6b7280', fontWeight: '500' }}>Valoración</div>
                </div>
              </div>
              
              <div className="progreso-container">
                <div className="progreso-label">
                  <span style={{ color: '#374151', fontWeight: '600' }}>Estatus</span>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>{depto.resueltos} de {depto.total} resueltos</span>
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
                  <span className="estatus-count" style={{ color: '#1f2937', fontWeight: 'bold' }}>{depto.pendientes}</span>
                  <span className="estatus-label" style={{ color: '#6b7280', fontWeight: '500' }}>Pendientes</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count" style={{ color: '#1f2937', fontWeight: 'bold' }}>{depto.en_proceso}</span>
                  <span className="estatus-label" style={{ color: '#6b7280', fontWeight: '500' }}>En Proceso</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count" style={{ color: '#1f2937', fontWeight: 'bold' }}>{depto.resueltos}</span>
                  <span className="estatus-label" style={{ color: '#6b7280', fontWeight: '500' }}>Resueltos</span>
                </div>
                <div className="estatus-item">
                  <span className="estatus-count" style={{ color: '#1f2937', fontWeight: 'bold' }}>{depto.cancelados}</span>
                  <span className="estatus-label" style={{ color: '#6b7280', fontWeight: '500' }}>Cancelados</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render de gráfico de tiempos semanales
  const renderGraficoTiempos = () => {
    if (!tiemposResolucion || tiemposResolucion.length === 0) {
      return <div className="sin-datos-mensaje">No hay suficientes datos para mostrar el gráfico de tiempos.</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={tiemposResolucion}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semana" />
          <YAxis label={{ value: 'Días Promedio', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [`${value} días`, name]}
            labelFormatter={(label) => `Semana: ${label}`}
          />
          <Legend />
          <Bar dataKey="Basura" fill={colores.basura} name="Basura Acumulada" />
          <Bar dataKey="Alumbrado" fill={colores.alumbrado} name="Alumbrado Público" />
          <Bar dataKey="Drenaje" fill={colores.drenaje} name="Drenajes Obstruidos" />
          <Bar dataKey="Bacheo" fill={colores.bacheo} name="Bacheo" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render de gráfico de tendencias semanales
  const renderGraficoTendencias = () => {
    if (!tendenciasSemanal || tendenciasSemanal.length === 0) {
      return <div className="sin-datos-mensaje">No hay suficientes datos para mostrar las tendencias.</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={tendenciasSemanal}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semana" />
          <YAxis label={{ value: 'Número de Reportes', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [`${value} reportes`, name]}
            labelFormatter={(label) => `Semana: ${label}`}
          />
          <Legend />
          <Bar dataKey="basura" fill={colores.basura} name="Basura Acumulada" />
          <Bar dataKey="alumbrado" fill={colores.alumbrado} name="Alumbrado Público" />
          <Bar dataKey="drenaje" fill={colores.drenaje} name="Drenajes Obstruidos" />
          <Bar dataKey="bacheo" fill={colores.bacheo} name="Bacheo" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render de gráfico de tendencias mensuales
  const renderGraficoTendenciasMensual = () => {
    if (!tendenciasMensual || tendenciasMensual.length === 0) {
      return <div className="sin-datos-mensaje">No hay suficientes datos para mostrar las tendencias mensuales.</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={tendenciasMensual}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis label={{ value: 'Número de Reportes', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [`${value} reportes`, name]}
            labelFormatter={(label) => `Mes: ${label}`}
          />
          <Legend />
          <Bar dataKey="basura" fill={colores.basura} name="Basura Acumulada" />
          <Bar dataKey="alumbrado" fill={colores.alumbrado} name="Alumbrado Público" />
          <Bar dataKey="drenaje" fill={colores.drenaje} name="Drenajes Obstruidos" />
          <Bar dataKey="bacheo" fill={colores.bacheo} name="Bacheo" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render de gráfico de tiempos mensuales
  const renderGraficoTiemposMensual = () => {
    if (!tendenciasMensual || tendenciasMensual.length === 0) {
      return <div className="sin-datos-mensaje">No hay suficientes datos para mostrar los tiempos mensuales.</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={tendenciasMensual}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis label={{ value: 'Días Promedio', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [`${value} días`, name]}
            labelFormatter={(label) => `Mes: ${label}`}
          />
          <Legend />
          <Bar dataKey="tiempoPromedioBasura" fill={colores.basura} name="Basura Acumulada" />
          <Bar dataKey="tiempoPromedioAlumbrado" fill={colores.alumbrado} name="Alumbrado Público" />
          <Bar dataKey="tiempoPromedioDrenaje" fill={colores.drenaje} name="Drenajes Obstruidos" />
          <Bar dataKey="tiempoPromedioBacheo" fill={colores.bacheo} name="Bacheo" />
        </BarChart>
      </ResponsiveContainer>
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
            disabled={cargando}
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
            disabled={cargando}
          />
        </div>
        
        <div className="filtro-grupo">
          <label>Hasta:</label>
          <input 
            type="date" 
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
            disabled={cargando}
          />
        </div>
        
        <div className="filtro-grupo">
          <label>Estatus:</label>
          <select 
            value={filtroEstatus} 
            onChange={(e) => setFiltroEstatus(e.target.value)}
            disabled={cargando}
          >
            {estatus.map(est => (
              <option key={est.id} value={est.id}>{est.nombre}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="btn-exportar" 
          onClick={exportarReportes}
          disabled={cargando || reportes.length === 0}
        >
          Exportar a Excel
        </button>
      </div>
      
      {/* Navegación entre vistas */}
      <div className="nav-vistas">
        <button 
          className={vistaActual === 'general' ? 'active' : ''} 
          onClick={() => cambiarVista('general')}
          disabled={cargando}
        >
          Vista General
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
            onClick={() => {
              setError(null);
              const fechaActual = new Date();
              const fechaInicio = new Date(fechaActual);
              fechaInicio.setMonth(fechaInicio.getMonth() - 3);
              setFiltroFechaInicio(fechaInicio.toISOString().split('T')[0]);
              setFiltroFechaFin(fechaActual.toISOString().split('T')[0]);
              setFiltroDepartamento('todos');
              setFiltroEstatus('todos');
              window.location.reload();
            }}
          >
            Reintentar con filtros por defecto
          </button>
        </div>
      ) : reportes.length === 0 ? (
        <div className="sin-datos">
          <div className="sin-datos-icon">
            <i className="fas fa-chart-bar"></i>
          </div>
          <h3>No hay datos disponibles</h3>
          <p>No se encontraron reportes. Puede ser que no haya reportes en la base de datos o que haya un problema de conexión.</p>
          <button 
            className="btn-reintentar"
            onClick={() => {
              const fechaActual = new Date();
              const fechaInicio = new Date(fechaActual);
              fechaInicio.setMonth(fechaInicio.getMonth() - 6);
              setFiltroFechaInicio(fechaInicio.toISOString().split('T')[0]);
              setFiltroFechaFin(fechaActual.toISOString().split('T')[0]);
              setFiltroDepartamento('todos');
              setFiltroEstatus('todos');
              window.location.reload();
            }}
          >
            Reintentar con un rango mayor
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
                  {renderComparativoDepartamentos()}
                </div>
              </div>
              
              {/* Tarjetas de departamentos */}
              <div className="seccion-dashboard">
                <h2>Desempeño por Departamento</h2>
                {renderVistaGeneral()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardJefeDepartamento;