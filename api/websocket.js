// Sistema de WebSocket para notificaciones en tiempo real
// Simula Socket.IO con EventEmitter para entorno de navegador

class WebSocketManager {
  constructor() {
    this.listeners = {};
    this.rooms = {
      kitchen: [],
      bar: [],
      cashier: [],
      admin: []
    };
    this.isConnected = false;
  }

  connect() {
    this.isConnected = true;
    console.log('WebSocket conectado');
    this.emit('connected', { status: 'connected' });
  }

  disconnect() {
    this.isConnected = false;
    console.log('WebSocket desconectado');
    this.emit('disconnected', { status: 'disconnected' });
  }

  // Método para unirse a una sala
  joinRoom(room) {
    if (!this.rooms[room]) {
      this.rooms[room] = [];
    }
    console.log(`Unido a sala: ${room}`);
    this.emit('joined_room', { room });
  }

  // Método para dejar una sala
  leaveRoom(room) {
    console.log(`Abandonando sala: ${room}`);
    this.emit('left_room', { room });
  }

  // Método para enviar eventos
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Método para escuchar eventos
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Método para dejar de escuchar eventos
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Notificaciones específicas del restaurante
  notifyNewOrder(order) {
    const notification = {
      type: 'new_order',
      order: order,
      timestamp: new Date().toISOString(),
      message: `Nueva orden ${order.orderNumber} - Mesa ${order.tableNumber}`
    };

    // Notificar a la cocina si hay items de cocina
    const hasKitchenItems = order.items.some(item => {
      const product = this.getProductById(item.productId);
      return product && product.station === 'kitchen';
    });

    if (hasKitchenItems) {
      this.emit('kitchen_order', notification);
    }

    // Notificar a la barra si hay items de barra
    const hasBarItems = order.items.some(item => {
      const product = this.getProductById(item.productId);
      return product && product.station === 'bar';
    });

    if (hasBarItems) {
      this.emit('bar_order', notification);
    }

    // Notificar a caja
    this.emit('cashier_order', notification);
    
    // Notificar a admin
    this.emit('admin_order', notification);

    // Notificación general
    this.emit('new_order', notification);
  }

  notifyOrderStatusChange(orderId, status, tableNumber) {
    const notification = {
      type: 'status_change',
      orderId,
      status,
      tableNumber,
      timestamp: new Date().toISOString(),
      message: `Orden ${orderId} - Mesa ${tableNumber} está ${status}`
    };

    this.emit('order_status_change', notification);
    this.emit(`order_${status}`, notification);
  }

  notifyPaymentReceived(payment) {
    const notification = {
      type: 'payment_received',
      payment,
      timestamp: new Date().toISOString(),
      message: `Pago recibido: $${payment.amount} - Mesa ${payment.tableNumber}`
    };

    this.emit('payment_received', notification);
    this.emit('cashier_payment', notification);
  }

  notifyOrderReady(orderId, tableNumber, station) {
    const notification = {
      type: 'order_ready',
      orderId,
      tableNumber,
      station,
      timestamp: new Date().toISOString(),
      message: `¡Orden lista! Mesa ${tableNumber} - ${station}`
    };

    this.emit('order_ready', notification);
    this.emit(`ready_${station}`, notification);
  }

  // Método auxiliar para obtener producto por ID (simulado)
  getProductById(id) {
    // En producción, esto vendría de la base de datos
    const products = JSON.parse(localStorage.getItem('pn_products') || '[]');
    return products.find(p => p.id === id);
  }

  // Métodos para reproducir sonidos de notificación
  playNotificationSound(type) {
    const audioFiles = {
      new_order: '/assets/sounds/new_order.mp3',
      order_ready: '/assets/sounds/order_ready.mp3',
      payment_received: '/assets/sounds/payment.mp3'
    };

    if (audioFiles[type]) {
      const audio = new Audio(audioFiles[type]);
      audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
    }
  }
}

// Exportar instancia única
const ws = new WebSocketManager();
export default ws;