// src/views/AgregarReporte.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import ReporteController from "../controllers/agregarReporte"; // Asegúrate que la ruta sea correcta
import "./Styles/agregarReporte.css";

// Importaciones para React-Leaflet (OpenStreetMap)
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Arreglo para íconos de Leaflet (necesario para que los marcadores se muestren correctamente)
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para manejar eventos del mapa
function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    }
  });
  return null;
}

// Componente para actualizar la vista del mapa cuando cambian las coordenadas
function MapView({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      // Añadir animación suave al cambio de vista
      map.flyTo(center, 16, {
        animate: true,
        duration: 1 // duración en segundos
      });
    }
  }, [center, map]);
  
  return null;
}

const AgregarReporte = () => {
  // Coordenadas iniciales (Centro de Chetumal)
  const coordenadasChetumal = { lat: 18.5013, lng: -88.3068 };

  // Estado para el formulario
  const [formData, setFormData] = useState({
    folio: "",
    categoria: "",
    direccion: "",
    ubicacion: coordenadasChetumal,
    fecha: new Date().toISOString(), // Guardar fecha y hora completa
    comentario: "",
    estado: "pendiente",
    foto: null
  });

  // Estados para la interfaz
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const mapRef = useRef(null);

  // Lista de categorías disponibles con iconos - ACTUALIZADA CON NOMBRES COMPLETOS
  const categorias = [
    { id: "Basura Acumulada", nombre: "Basura Acumulada", icon: "📦" },
    { id: "Alumbrado Público", nombre: "Alumbrado Público", icon: "💡" },
    { id: "Drenajes Obstruidos", nombre: "Drenajes Obstruidos", icon: "🚿" },
    { id: "Bacheo", nombre: "Bacheo", icon: "🛣️" },
  ];

  // Lista de estados disponibles con colores
  const estados = [
    { id: "pendiente", nombre: "Pendiente", color: "#3498db" },
  ];

  // Generar folio único al montar el componente
  useEffect(() => {
    // Generar folio
    generarNuevoFolio();
    
    // Intentar obtener la ubicación actual del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            ubicacion: { lat: latitude, lng: longitude }
          }));
          
          // Si tenemos la ubicación, intentar obtener la dirección
          obtenerDireccionDesdeCoordenadas(latitude, longitude);
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
        }
      );
    }
  }, []);

  // Función simple para generar folio (respaldo)
  const generarFolioSimple = () => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = (ahora.getMonth() + 1).toString().padStart(2, "0");
    const dia = ahora.getDate().toString().padStart(2, "0");
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

    return `RP-${anio}${mes}${dia}-${randomNum}`;
  };
  
  // Función para buscar direcciones con mayor precisión
  const buscarCoordenadas = useCallback(async (direccion) => {
    // [resto del código de la función buscarCoordenadas sin cambios]
    // ...
    
    if (!direccion || direccion.length < 3) return;
    
    setAddressSearchLoading(true);
    
    try {
      // Forzar la búsqueda a Chetumal añadiendo el contexto
      let direccionCompleta = direccion;
      
      // Si la dirección no menciona Chetumal, añadirlo para mejorar resultados
      if (!direccion.toLowerCase().includes('chetumal')) {
        direccionCompleta = `${direccion}, Chetumal, Quintana Roo, México`;
      }
      
      // Construir los parámetros de búsqueda optimizados para Chetumal
      // viewbox limita la búsqueda a un área rectangular alrededor de Chetumal
      // bounded=1 fuerza a que los resultados estén dentro del viewbox
      const viewbox = "-88.3500,18.4500,-88.2500,18.5500"; // aproximadamente el área de Chetumal
      const queryParams = new URLSearchParams({
        format: 'json',
        q: direccionCompleta,
        limit: 5,
        countrycodes: 'mx',
        'accept-language': 'es',
        viewbox: viewbox,
        bounded: 1,
        addressdetails: 1
      });
      
      console.log(`Buscando: ${direccionCompleta}`);
      
      // Hacer la solicitud a Nominatim con parámetros optimizados
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${queryParams.toString()}`
      );
      
      const data = await response.json();
      console.log("Resultados de búsqueda:", data);
      
      // Si encontramos resultados
      if (data && data.length > 0) {
        const { lat, lon, display_name, address } = data[0];
        
        // Actualizar coordenadas
        setFormData(prev => ({
          ...prev,
          ubicacion: {
            lat: parseFloat(lat),
            lng: parseFloat(lon)
          }
        }));
        
        // Mantener la dirección ingresada por el usuario
        // Es mejor mantener lo que el usuario escribió en lugar de reemplazarlo
        // con la descripción a veces confusa de Nominatim
        
        console.log("Ubicación encontrada:", lat, lon);
        setAddressSearchLoading(false);
        return;
      }
      
      // Si no hay resultados en el primer intento, probar con variaciones
      // [resto del código de esta sección sin cambios]
      // ...
      
    } catch (error) {
      console.error("Error en geocoding:", error);
    } finally {
      setAddressSearchLoading(false);
    }
  }, [formData.ubicacion, coordenadasChetumal]);

  // Manejar click en el mapa
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    
    setFormData(prev => ({
      ...prev,
      ubicacion: { lat, lng }
    }));
    
    // Buscar la dirección basada en las coordenadas
    obtenerDireccionDesdeCoordenadas(lat, lng);
  };

  // Obtener dirección desde coordenadas - CORREGIDO PARA MEJORAR FORMATO
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      // Usamos Nominatim API para geocodificación inversa con zoom alto para detalles de calle
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        // Construir una dirección más útil y específica
        let direccionFormateada = '';
        const addr = data.address;
        
        // Priorizar la calle
        if (addr.road) {
          direccionFormateada += addr.road;
          if (addr.house_number) direccionFormateada += ' ' + addr.house_number;
        }
        
        // Añadir colonia/vecindario
        if (addr.suburb || addr.neighbourhood) {
          if (direccionFormateada) direccionFormateada += ', ';
          direccionFormateada += (addr.suburb || addr.neighbourhood);
        }
        
        // Añadir ciudad
        if (direccionFormateada) direccionFormateada += ', ';
        direccionFormateada += 'Chetumal, Quintana Roo';
        
        // Si no se pudo construir una dirección personalizada, usar la que devuelve Nominatim
        if (!direccionFormateada) {
          direccionFormateada = data.display_name;
        }
        
        setFormData(prev => ({
          ...prev,
          direccion: direccionFormateada
        }));
        
        console.log("Dirección encontrada:", direccionFormateada);
      }
    } catch (error) {
      console.error("Error en geocodificación inversa:", error);
    }
  };

  // Generar nuevo folio
  const generarNuevoFolio = () => {
    try {
      // Intentamos usar el controlador
      if (ReporteController.generarFolio) {
        const folio = ReporteController.generarFolio();
        setFormData((prevData) => ({
          ...prevData,
          folio
        }));
      } else {
        // Fallback si hay algún problema con el controlador
        setFormData((prevData) => ({
          ...prevData,
          folio: generarFolioSimple()
        }));
      }
    } catch (error) {
      console.error("Error al generar folio:", error);
      // Usamos el método de respaldo
      setFormData((prevData) => ({
        ...prevData,
        folio: generarFolioSimple()
      }));
    }
  };

  // Manejador de cambios en el formulario
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "foto" && files && files[0]) {
      // Manejar archivos
      setFormData({
        ...formData,
        foto: files[0]
      });

      // Crear una vista previa de la imagen
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(files[0]);
    } else if (name === "fecha") {
      // Asegurarse de que la fecha incluya la hora
      const fechaSeleccionada = new Date(value);
      const ahora = new Date();
      
      // Combinar la fecha seleccionada con la hora actual
      fechaSeleccionada.setHours(ahora.getHours());
      fechaSeleccionada.setMinutes(ahora.getMinutes());
      fechaSeleccionada.setSeconds(ahora.getSeconds());
      
      setFormData({
        ...formData,
        [name]: fechaSeleccionada.toISOString()
      });
    } else {
      // Manejar otros campos
      setFormData({
        ...formData,
        [name]: value
      });
      
      // Si cambia la dirección, configurar un temporizador para buscar coordenadas
      if (name === "direccion") {
        if (searchTimeout) clearTimeout(searchTimeout);
        
        // Establecer un nuevo temporizador (debounce)
        setSearchTimeout(
          setTimeout(() => {
            if (value.length >= 3) {
              buscarCoordenadas(value);
            }
          }, 800) // Esperar 800ms después de que el usuario deje de escribir
        );
      }
    }
  };

  // Navegación entre pasos - CORREGIDA PARA EVITAR ENVÍO ACCIDENTAL
  const nextStep = (e) => {
    // Importante: Prevenir el comportamiento por defecto para evitar el envío del formulario
    if (e) e.preventDefault();
    
    // Validaciones antes de avanzar al siguiente paso
    if (activeStep === 1) {
      if (!formData.categoria) {
        setError("Por favor seleccione una categoría antes de continuar.");
        return;
      }
    }
    
    if (activeStep === 2) {
      if (!formData.direccion) {
        setError("Por favor ingrese una dirección o seleccione un punto en el mapa.");
        return;
      }
    }
    
    // Si todo está bien, avanzar al siguiente paso
    setError("");
    setActiveStep(prev => prev + 1);
  };

  const prevStep = (e) => {
    // Prevenir el comportamiento por defecto para evitar el envío del formulario
    if (e) e.preventDefault();
    setActiveStep(prev => prev - 1);
  };

  // Manejador de envío del formulario - CORREGIDO PARA ASEGURAR FORMATO DE FECHA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validación básica
    if (!formData.folio || !formData.categoria || !formData.direccion) {
      setError("Por favor complete todos los campos obligatorios.");
      return;
    }

    setLoading(true);

    try {
      // Obtener ID y nombre de usuario desde localStorage
      const usuarioId = localStorage.getItem('userId') || null;
      const nombreUsuario = localStorage.getItem('username') || 'Usuario';
      
      // Añadir esta información al formData
      const reporteData = {
        ...formData,
        usuarioId,
        nombreUsuario,
        // Asegurar que la fecha tenga el formato correcto
        fecha: formData.fecha
      };
      
      // Registrar reporte usando el controlador
      const resultado = await ReporteController.registrarReporte(reporteData);

      if (resultado.success) {
        setSuccess(resultado.message);

        // Limpiar formulario excepto el folio
        setFormData({
          folio: generarFolioSimple(),
          categoria: "",
          direccion: "",
          ubicacion: coordenadasChetumal, // Coordenadas por defecto (Centro de Chetumal)
          fecha: new Date().toISOString(),
          comentario: "",
          estado: "pendiente",
          foto: null
        });

        setFotoPreview(null);
        setActiveStep(1);
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      console.error("Error al registrar reporte:", error);
      setError("Ocurrió un error al registrar el reporte. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizado de los pasos - MODIFICADO PARA MOSTRAR FECHA CORRECTAMENTE
  const renderStep = () => {
    switch (activeStep) {
      case 1: // Paso 1: Selección de categoría y folio
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Folio del Reporte</label>
              <div className="input-with-button">
                <input
                  type="text"
                  name="folio"
                  value={formData.folio}
                  readOnly
                  className="form-control"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={generarNuevoFolio}
                >
                  Regenerar
                </button>
              </div>
              <p className="help-text">Folio único para identificar el reporte</p>
            </div>

            <div className="form-group">
              <label>Fecha del Reporte</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha.split('T')[0]} // Mostrar solo la parte de la fecha en el input
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Seleccione el tipo de reporte</label>
              <div className="category-grid">
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className={`category-card ${
                      formData.categoria === cat.id ? "selected" : ""
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, categoria: cat.id })
                    }
                  >
                    <div className="category-icon">{cat.icon}</div>
                    <div className="category-name">{cat.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Paso 2: Ubicación y mapa
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Dirección del Reporte</label>
              <div className="search-input-container">
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Ingrese calle y colonia en Chetumal (ej: Av. Insurgentes, Centro)"
                  className="form-control"
                  required
                />
                {addressSearchLoading && (
                  <span className="search-loading-indicator">⟳</span>
                )}
              </div>
              <p className="help-text">
                Escriba la dirección o seleccione un punto en el mapa de Chetumal
              </p>
            </div>

            <div className="map-container">
              <MapContainer
                center={[formData.ubicacion.lat, formData.ubicacion.lng]}
                zoom={15}
                style={{ height: "400px", width: "100%" }}
                whenCreated={mapInstance => {
                  mapRef.current = mapInstance;
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[formData.ubicacion.lat, formData.ubicacion.lng]} />
                <MapEvents onMapClick={handleMapClick} />
                <MapView center={[formData.ubicacion.lat, formData.ubicacion.lng]} />
              </MapContainer>
            </div>

            <div className="location-coordinates">
              <p>
                Latitud: {formData.ubicacion.lat.toFixed(6)}, Longitud: {formData.ubicacion.lng.toFixed(6)}
              </p>
            </div>
          </div>
        );

      case 3: // Paso 3: Detalles adicionales
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Estado del Reporte</label>
              <div className="status-options">
                {estados.map((estado) => (
                  <div
                    key={estado.id}
                    className={`status-option ${
                      formData.estado === estado.id ? "selected" : ""
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, estado: estado.id })
                    }
                    style={{
                      borderColor:
                        formData.estado === estado.id ? estado.color : undefined
                    }}
                  >
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: estado.color }}
                    ></span>
                    <span>{estado.nombre}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Descripción del Problema</label>
              <textarea
                name="comentario"
                value={formData.comentario}
                onChange={handleChange}
                placeholder="Describa en detalle el problema que desea reportar..."
                className="form-control"
                rows="4"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Fotografía</label>
              <div className="file-upload-container">
                <input
                  type="file"
                  name="foto"
                  id="foto-upload"
                  onChange={handleChange}
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="foto-upload" className="file-upload-label">
                  <span className="upload-icon">📷</span>
                  <span>Seleccionar imagen</span>
                </label>
              </div>

              {fotoPreview && (
                <div className="image-preview">
                  <img src={fotoPreview} alt="Vista previa" />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="reporte-container">
      <div className="reporte-card">
        <div className="reporte-header">
          <h2>Nuevo Reporte de Incidencia</h2>
          <div className="steps-indicator">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`step-indicator ${
                  step === activeStep ? "active" : ""
                } ${step < activeStep ? "completed" : ""}`}
                onClick={() => step < activeStep && setActiveStep(step)}
              >
                <div className="step-number">{step}</div>
                <div className="step-label">
                  {step === 1
                    ? "Información"
                    : step === 2
                    ? "Ubicación"
                    : "Detalles"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {success ? (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h3>Reporte Registrado Exitosamente</h3>
              <p>{success}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setSuccess("");
                  setActiveStep(1);
                  generarNuevoFolio();
                }}
              >
                Registrar nuevo reporte
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠</span>
                  {error}
                </div>
              )}

              <div className="step-container">{renderStep()}</div>

              <div className="form-navigation">
                {activeStep > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={prevStep}
                  >
                    Anterior
                  </button>
                )}

                {activeStep < 3 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={nextStep}
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary submit-btn"
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Enviar Reporte"}
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AgregarReporte;