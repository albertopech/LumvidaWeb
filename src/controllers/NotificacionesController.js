// src/controllers/NotificacionesController.js - VERSION CORREGIDA COMPLETA
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../models/firebase';

export class NotificacionesController {
  static notificaciones = [];
  static callbacks = new Set();
  static listener = null;
  static reportesYaProcesados = new Set(); // Para evitar duplicados
  
  /**
   * Inicializar - Solo escuchar nuevos reportes CON VALIDACIÓN ULTRA ESTRICTA
   */
  static inicializar(onNewNotification, userRole = '') {
    try {
      // EVITAR MÚLTIPLES INICIALIZACIONES
      if (this.listener) {
        console.log('⚠️ Sistema ya inicializado, limpiando antes...');
        this.destruir();
      }
      
      // ✅ VALIDACIÓN ULTRA ESTRICTA: Solo 4 departamentos reciben notificaciones
      const rolesDepartamentalesPermitidos = ['basura', 'alumbrado', 'bacheo', 'drenaje'];
      if (!rolesDepartamentalesPermitidos.includes(userRole)) {
        console.log('🚫 Rol no departamental - NO inicializando notificaciones:', userRole);
        
        // Limpiar cualquier notificación existente
        this.notificaciones = [];
        this.reportesYaProcesados.clear();
        localStorage.removeItem('notificaciones_reportes');
        
        return { 
          success: true, 
          message: 'Notificaciones deshabilitadas para este rol' 
        };
      }
      
      this.callbacks.add(onNewNotification);
      this.escucharNuevosReportes(userRole);
      this.cargarNotificacionesGuardadas();
      
      console.log('✅ Notificaciones iniciadas SOLO para rol departamental:', userRole);
      return { success: true };
    } catch (error) {
      console.error('❌ Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Escuchar nuevos reportes - SIN LÍMITE para captar todos
   */
  static escucharNuevosReportes(userRole) {
    const reportesRef = collection(db, "reportes");
    
    // SIN LÍMITE - escuchar TODOS los reportes nuevos
    // Solo usar orderBy para obtener los más recientes primero
    const q = query(reportesRef, orderBy("fecha", "desc"));
    
    this.listener = onSnapshot(q, (snapshot) => {
      console.log('📡 Snapshot recibido, cambios:', snapshot.docChanges().length);
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const reporte = { id: change.doc.id, ...change.doc.data() };
          
          // EVITAR PROCESAR REPORTES YA CONOCIDOS AL RECARGAR
          if (this.reportesYaProcesados.has(reporte.id)) {
            console.log('🔄 Reporte ya procesado anteriormente:', reporte.id);
            return;
          }
          
          console.log('🔍 Reporte detectado:', {
            id: reporte.id,
            categoria: reporte.categoria,
            userRole: userRole,
            direccion: reporte.direccion,
            fecha: reporte.fecha,
            fechaParsed: this.parsearFecha(reporte.fecha)
          });
          
          // ✅ FILTRAR POR ROL DE USUARIO ULTRA ESTRICTO
          if (!this.esReporteRelevante(reporte.categoria, userRole)) {
            console.log('❌ Reporte no relevante para el rol:', userRole);
            this.reportesYaProcesados.add(reporte.id); // Marcar como procesado
            return;
          }
          
          // Solo procesar si es muy reciente (menos de 5 minutos)
          const fechaReporte = this.parsearFecha(reporte.fecha);
          const tiempoTranscurrido = Date.now() - fechaReporte.getTime();
          
          console.log('⏰ Tiempo transcurrido:', tiempoTranscurrido, 'ms (', Math.round(tiempoTranscurrido/1000), 'segundos )');
          
          // Marcar como procesado ANTES de crear notificación
          this.reportesYaProcesados.add(reporte.id);
          
          if (tiempoTranscurrido < 300000) { // Menos de 5 MINUTOS = nuevo
            console.log('✅ Procesando reporte nuevo');
            this.crearNotificacion(reporte);
          } else {
            console.log('⚠️ Reporte demasiado antiguo, no se creará notificación');
          }
        }
      });
    }, (error) => {
      console.error('Error en listener:', error);
      // Si falla por falta de índice, usar versión simple sin orderBy
      console.log('🔄 Intentando listener simple sin orderBy...');
      this.escucharReportesSinOrden(userRole);
    });
    
    console.log('📡 Listener configurado SIN LÍMITE para rol:', userRole);
  }

  /**
   * Listener de respaldo sin orderBy (por si no hay índice)
   */
  static escucharReportesSinOrden(userRole) {
    const reportesRef = collection(db, "reportes");
    
    // Versión más simple sin orderBy para evitar errores de índice
    this.listener = onSnapshot(reportesRef, (snapshot) => {
      console.log('📡 Snapshot SIMPLE recibido, cambios:', snapshot.docChanges().length);
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const reporte = { id: change.doc.id, ...change.doc.data() };
          
          // EVITAR PROCESAR REPORTES YA CONOCIDOS
          if (this.reportesYaProcesados.has(reporte.id)) {
            console.log('🔄 Reporte ya procesado anteriormente (simple):', reporte.id);
            return;
          }
          
          console.log('🔍 Reporte detectado (simple):', {
            id: reporte.id,
            categoria: reporte.categoria,
            userRole: userRole,
            direccion: reporte.direccion
          });
          
          // ✅ FILTRAR POR ROL DE USUARIO ULTRA ESTRICTO
          if (!this.esReporteRelevante(reporte.categoria, userRole)) {
            console.log('❌ Reporte no relevante para el rol:', userRole);
            this.reportesYaProcesados.add(reporte.id); // Marcar como procesado
            return;
          }
          
          // Solo procesar si es muy reciente
          const fechaReporte = this.parsearFecha(reporte.fecha);
          const tiempoTranscurrido = Date.now() - fechaReporte.getTime();
          
          console.log('⏰ Tiempo transcurrido:', tiempoTranscurrido, 'ms (', Math.round(tiempoTranscurrido/1000), 'segundos )');
          
          // Marcar como procesado ANTES de crear notificación
          this.reportesYaProcesados.add(reporte.id);
          
          if (tiempoTranscurrido < 300000) { // Menos de 5 MINUTOS = nuevo
            console.log('✅ Procesando reporte nuevo (simple)');
            this.crearNotificacion(reporte);
          } else {
            console.log('⚠️ Reporte demasiado antiguo, no se creará notificación');
          }
        }
      });
    }, (error) => {
      console.error('Error en listener simple:', error);
    });
    
    console.log('📡 Listener SIMPLE configurado para rol:', userRole);
  }

  /**
   * ✅ VERIFICACIÓN ULTRA ESTRICTA: Solo 4 departamentos reciben notificaciones
   */
  static esReporteRelevante(categoriaReporte, userRole) {
    console.log('🔍 Verificando relevancia ULTRA ESTRICTA para:', { userRole, categoriaReporte });
    
    // ❌ REMOVIDO: Los administradores YA NO reciben notificaciones
    // SOLO estos 4 roles departamentales reciben notificaciones
    const rolesDepartamentalesPermitidos = ['basura', 'alumbrado', 'bacheo', 'drenaje'];
    
    // Si NO es uno de los 4 departamentos, NO recibe notificaciones
    if (!rolesDepartamentalesPermitidos.includes(userRole)) {
      console.log('❌ Rol NO departamental - Sin notificaciones:', userRole);
      return false;
    }
    
    // FILTRADO ESTRICTO POR DEPARTAMENTO
    // Solo mostrar reportes del departamento específico del usuario
    const rolesCategorias = {
      'basura': ['Basura Acumulada'],  // Solo basura acumulada
      'alumbrado': ['Alumbrado Público'], // Solo alumbrado público
      'bacheo': ['Bacheo'], // Solo bacheo
      'drenaje': ['Drenajes Obstruidos', 'Drenaje Obstruido'] // Solo drenajes
    };
    
    const categoriasPermitidas = rolesCategorias[userRole] || [];
    const esRelevante = categoriasPermitidas.includes(categoriaReporte);
    
    console.log('🔍 Verificando relevancia departamental ULTRA ESTRICTA:', {
      userRole,
      categoriaReporte,
      categoriasPermitidas,
      esRelevante
    });
    
    return esRelevante;
  }

  /**
   * Crear notificación simple
   */
  static crearNotificacion(reporte) {
    // EVITAR DUPLICADOS - Verificar si ya existe esta notificación
    const yaExiste = this.notificaciones.some(n => 
      n.reporte && n.reporte.id === reporte.id
    );
    
    if (yaExiste) {
      console.log('⚠️ Notificación ya existe para este reporte:', reporte.id);
      return;
    }
    
    console.log('🔔 Creando notificación para reporte:', reporte);
    
    // Obtener icono y título específico según el tipo de reporte
    const tipoReporte = this.obtenerTipoReporte(reporte.categoria);
    
    const notificacion = {
      id: `notif_${reporte.id}_${Date.now()}`,
      titulo: `${tipoReporte.icono} Nuevo ${tipoReporte.nombre}`,
      mensaje: `${reporte.direccion || 'Sin dirección especificada'}`,
      reporte: reporte,
      fecha: new Date(),
      leida: false,
      categoria: reporte.categoria
    };

    console.log('📝 Notificación creada:', notificacion);

    // Agregar al inicio
    this.notificaciones.unshift(notificacion);
    
    // Mantener solo 20 notificaciones
    if (this.notificaciones.length > 20) {
      this.notificaciones = this.notificaciones.slice(0, 20);
    }

    // Guardar en localStorage
    this.guardarNotificaciones();
    
    // Mostrar toast
    this.mostrarToast(notificacion);

    console.log('🔔 Ejecutando callbacks, cantidad:', this.callbacks.size);

    // Avisar a los componentes
    this.callbacks.forEach(callback => {
      try {
        callback(notificacion);
      } catch (error) {
        console.error('Error en callback:', error);
      }
    });
  }

  /**
   * Obtener tipo de reporte con icono y nombre específico
   */
  static obtenerTipoReporte(categoria) {
    const tipos = {
      // Alumbrado
      'Alumbrado Público': {
        icono: '💡',
        nombre: 'Reporte de Alumbrado'
      },
      'Alumbrado': {
        icono: '💡',
        nombre: 'Reporte de Alumbrado'
      },
      // Bacheo
      'Bacheo': {
        icono: '🛣️',
        nombre: 'Reporte de Bacheo'
      },
      'Baches': {
        icono: '🛣️',
        nombre: 'Reporte de Bacheo'
      },
      // Basura
      'Basura Acumulada': {
        icono: '🗑️',
        nombre: 'Reporte de Basura'
      },
      'Basura': {
        icono: '🗑️',
        nombre: 'Reporte de Basura'
      },
      // Drenaje (todas las variaciones)
      'Drenaje Obstruido': {
        icono: '💧',
        nombre: 'Reporte de Drenaje'
      },
      'Drenajes Obstruidos': {
        icono: '💧',
        nombre: 'Reporte de Drenaje'
      },
      'Drenaje': {
        icono: '💧',
        nombre: 'Reporte de Drenaje'
      },
      'Drenajes': {
        icono: '💧',
        nombre: 'Reporte de Drenaje'
      }
    };
    
    return tipos[categoria] || {
      icono: '📝',
      nombre: 'Reporte'
    };
  }

  /**
   * Toast simple mejorado
   */
  static mostrarToast(notificacion) {
    const tipoReporte = this.obtenerTipoReporte(notificacion.categoria);
    
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #ddd;
        border-left: 4px solid #3b82f6;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 320px;
        animation: slideIn 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="
            font-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            border-radius: 50%;
            flex-shrink: 0;
          ">${tipoReporte.icono}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px; color: #374151; margin-bottom: 4px;">
              ${notificacion.titulo}
            </div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.4; margin-bottom: 8px;">
              📍 ${notificacion.mensaje}
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              Hace un momento
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #9ca3af;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          " onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151';" 
             onmouseout="this.style.background='none'; this.style.color='#9ca3af';">✕</button>
        </div>
      </div>
    `;
    
    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    if (!document.querySelector('#toast-animations')) {
      style.id = 'toast-animations';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto-remover después de 6 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transition = 'all 0.3s ease';
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 6000);
  }

  /**
   * Obtener notificaciones
   */
  static obtenerNotificaciones() {
    return this.notificaciones;
  }

  /**
   * Obtener contador de no leídas
   */
  static obtenerContadorNoLeidas() {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  /**
   * Marcar como leída (solo marcar, no remover)
   */
  static marcarComoLeida(notificacionId) {
    console.log('✅ Marcando como leída:', notificacionId);
    
    const notificacion = this.notificaciones.find(n => n.id === notificacionId);
    if (notificacion) {
      notificacion.leida = true;
      this.guardarNotificaciones();
      
      // Avisar del cambio
      this.callbacks.forEach(callback => {
        try {
          callback(null, { tipo: 'actualizar_contador' });
        } catch (error) {
          console.error('Error en callback:', error);
        }
      });
      
      console.log('✅ Notificación marcada como leída');
    }
  }

  /**
   * ✅ CORREGIDO: Marcar todas como leídas y REMOVERLAS completamente
   */
  static marcarTodasComoLeidas() {
    console.log('🧹 Marcando todas como leídas y removiendo del panel COMPLETAMENTE');
    
    // Remover todas las notificaciones del array
    this.notificaciones = [];
    
    // Limpiar localStorage completamente
    this.guardarNotificaciones();
    
    // Notificar a todos los callbacks del cambio
    this.callbacks.forEach(callback => {
      try {
        callback(null, { tipo: 'actualizar_contador' });
      } catch (error) {
        console.error('Error en callback:', error);
      }
    });
    
    console.log('✅ Todas las notificaciones removidas del panel y localStorage');
  }

  /**
   * Guardar en localStorage
   */
  static guardarNotificaciones() {
    try {
      localStorage.setItem('notificaciones_reportes', JSON.stringify(this.notificaciones));
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  }

  /**
   * ✅ CORREGIDO: Cargar del localStorage CON FILTRADO POR ROL
   */
  static cargarNotificacionesGuardadas() {
    try {
      const stored = localStorage.getItem('notificaciones_reportes');
      if (stored) {
        const notificacionesGuardadas = JSON.parse(stored).map(n => ({
          ...n,
          fecha: new Date(n.fecha)
        }));
        
        // ✅ NUEVO: Filtrar las notificaciones guardadas según el rol actual
        const userRole = localStorage.getItem('userRole');
        const rolesDepartamentales = ['basura', 'alumbrado', 'bacheo', 'drenaje'];
        
        if (!rolesDepartamentales.includes(userRole)) {
          console.log('🚫 Rol no departamental - Limpiando notificaciones guardadas:', userRole);
          // Si el rol actual no debe recibir notificaciones, limpiar el localStorage
          localStorage.removeItem('notificaciones_reportes');
          this.notificaciones = [];
          return;
        }
        
        // Filtrar notificaciones por relevancia del rol actual
        const notificacionesFiltradas = notificacionesGuardadas.filter(notif => {
          if (!notif.reporte || !notif.reporte.categoria) return false;
          return this.esReporteRelevante(notif.reporte.categoria, userRole);
        });
        
        this.notificaciones = notificacionesFiltradas;
        
        // Si algunas notificaciones fueron filtradas, actualizar el localStorage
        if (notificacionesFiltradas.length !== notificacionesGuardadas.length) {
          this.guardarNotificaciones();
        }
        
        console.log(`📱 Notificaciones cargadas y filtradas: ${notificacionesFiltradas.length}/${notificacionesGuardadas.length} para rol: ${userRole}`);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      // En caso de error, limpiar completamente
      localStorage.removeItem('notificaciones_reportes');
      this.notificaciones = [];
    }
  }

  /**
   * Parsear fecha de Firestore
   */
  static parsearFecha(fechaData) {
    if (fechaData && fechaData.seconds) {
      return new Date(fechaData.seconds * 1000);
    }
    if (fechaData instanceof Date) {
      return fechaData;
    }
    return new Date(fechaData || Date.now());
  }

  /**
   * ✅ NUEVO: Limpiar notificaciones por cambio de rol
   */
  static limpiarNotificacionesPorCambioRol() {
    console.log('🧹 Limpiando notificaciones por cambio de rol');
    
    this.notificaciones = [];
    this.reportesYaProcesados.clear();
    localStorage.removeItem('notificaciones_reportes');
    
    // Avisar a los callbacks del cambio
    this.callbacks.forEach(callback => {
      try {
        callback(null, { tipo: 'actualizar_contador' });
      } catch (error) {
        console.error('Error en callback:', error);
      }
    });
    
    console.log('✅ Notificaciones limpiadas por cambio de rol');
  }

  /**
   * Limpiar todo
   */
  static destruir() {
    if (this.listener) {
      this.listener();
    }
    this.callbacks.clear();
    this.notificaciones = [];
    this.reportesYaProcesados.clear();
    console.log('🧹 Notificaciones destruidas');
  }

  /**
   * Remover callback
   */
  static removerCallback(callback) {
    this.callbacks.delete(callback);
  }

  /**
   * Solicitar permisos del navegador
   */
  static async solicitarPermisosNotificacion() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * MÉTODO DE PRUEBA - Crear notificación de prueba
   */
  static crearNotificacionPrueba(tipo = 'Basura Acumulada') {
    console.log('🧪 Creando notificación de prueba:', tipo);
    
    const reportePrueba = {
      id: `prueba_${Date.now()}`,
      categoria: tipo,
      direccion: 'Dirección de prueba #123',
      fecha: new Date(),
      estado: 'pendiente'
    };
    
    this.crearNotificacion(reportePrueba);
  }

  /**
   * DEBUGGING - Obtener estado del sistema
   */
  static obtenerEstado() {
    return {
      listener: this.listener ? 'Activo' : 'Inactivo',
      callbacks: this.callbacks.size,
      notificaciones: this.notificaciones.length,
      ultimaNotificacion: this.notificaciones[0] || null,
      reportesProcesados: this.reportesYaProcesados.size
    };
  }
}