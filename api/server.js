// API del Servidor para Producto Nacional
// Simula un servidor Express con endpoints REST

import db from './database.js';
import ws from './websocket.js';

class RestaurantAPI {
  constructor() {
    this.baseUrl = '/api';
  }

  // Métodos de utilidad para simular peticiones HTTP
  async request(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const result = this.handleRequest(endpoint, method, data);
          resolve({ success: true, data: result });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      }, 200); // Simular latencia de red
    });
  }

  handleRequest(endpoint, method, data) {
    const [path, query] = endpoint.split('?');
    const params = new URLSearchParams(query);

    switch (method) {
      case 'GET':
        return this.handleGet(path, params);
      case 'POST':
        return this.handlePost(path, data);
      case 'PUT':
        return this.handlePut(path, data);
      case 'DELETE':
        return this.handleDelete(path);
      default:
        throw new Error('Método no soportado');
    }
  }

  handleGet(path, params) {
    switch (path) {
      case '/products':
        if (params.get('category')) {
          return db.getProductsByCategory(params.get('category'));
        }
        if (params.get('station')) {
          return db.getProductsByStation(params.get('station'));
        }
        return db.getProducts();

      case '/products/search':
        const query = params.get('q');
        const products = db.getProducts();
        return products.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
        );

      case '/orders':
        if (params.get('status')) {
          return db.getOrdersByStatus(params.get('status'));
        }
        if (params.get('station')) {
          return db.getOrdersByStation(params.get('station'));
        }
        return db.getOrders();

      case '/orders/active':
        return db.getOrders().filter(o => 
          ['pending', 'preparing', 'ready'].includes(o.status)
        );

      case '/tables':
        return db.getTables();

      case '/tables/available':
        return db.getTables().filter(t => t.status === 'available');

      case '/stats':
        return db.getStats();

      case '/payments':
        return db.getPayments();

      default:
        if (path.startsWith('/products/')) {
          const id = path.split('/')[2];
          const product = db.getProductById(id);
          if (!product) throw new Error('Producto no encontrado');
          return product;
        }
        
        if (path.startsWith('/orders/')) {
          const id = path.split('/')[2];
          const order = db.getOrders().find(o => o.id === id);
          if (!order) throw new Error('Orden no encontrada');
          return order;
        }

        if (path.startsWith('/tables/')) {
          const number = path.split('/')[2];
          const table = db.getTableByNumber(number);
          if (!table) throw new Error('Mesa no encontrada');
          return table;
        }

        throw new Error('Endpoint no encontrado');
    }
  }

  handlePost(path, data) {
    switch (path) {
      case '/orders':
        if (!data.tableNumber || !data.items || data.items.length === 0) {
          throw new Error('Datos de orden inválidos');
        }

        // Validar que los productos existen
        data.items.forEach(item => {
          const product = db.getProductById(item.productId);
          if (!product) {
            throw new Error(`Producto ${item.productId} no encontrado`);
          }
          if (!product.available) {
            throw new Error(`Producto ${product.name} no está disponible`);
          }
        });

        const order = db.createOrder(data);
        
        // Actualizar estado de la mesa
        db.updateTableStatus(data.tableNumber, 'occupied', order.id);
        
        // Notificar a las estaciones correspondientes
        ws.notifyNewOrder(order);
        
        return order;

      case '/payments':
        if (!data.orderId || !data.amount || !data.method) {
          throw new Error('Datos de pago inválidos');
        }

        const payment = db.createPayment(data);
        
        // Actualizar orden como pagada
        db.updateOrderStatus(data.orderId, 'paid');
        
        // Notificar pago recibido
        ws.notifyPaymentReceived(payment);
        
        return payment;

      case '/auth/login':
        const user = db.authenticateUser(data.email, data.password);
        if (!user) {
          throw new Error('Credenciales inválidas');
        }
        return { user, token: `jwt-token-${user.id}` };

      case '/auth/logout':
        return { success: true };

      default:
        throw new Error('Endpoint no encontrado');
    }
  }

  handlePut(path, data) {
    switch (path) {
      case '/orders/status':
        if (!data.orderId || !data.status) {
          throw new Error('Datos de estado inválidos');
        }

        const order = db.updateOrderStatus(data.orderId, data.status);
        if (!order) {
          throw new Error('Orden no encontrada');
        }

        // Notificar cambio de estado
        ws.notifyOrderStatusChange(data.orderId, data.status, order.tableNumber);

        // Si la orden está lista, notificar a la estación correspondiente
        if (data.status === 'ready') {
          const station = this.getOrderStation(order);
          ws.notifyOrderReady(data.orderId, order.tableNumber, station);
        }

        return order;

      case '/tables/status':
        if (!data.tableNumber || !data.status) {
          throw new Error('Datos de mesa inválidos');
        }

        const table = db.updateTableStatus(data.tableNumber, data.status, data.orderId);
        if (!table) {
          throw new Error('Mesa no encontrada');
        }

        return table;

      case '/products/availability':
        if (!data.productId || data.available === undefined) {
          throw new Error('Datos de disponibilidad inválidos');
        }

        const product = db.getProductById(data.productId);
        if (!product) {
          throw new Error('Producto no encontrado');
        }

        product.available = data.available;
        db.saveData();

        return product;

      default:
        throw new Error('Endpoint no encontrado');
    }
  }

  handleDelete(path) {
    switch (path) {
      case '/orders/cancel':
        // Implementar cancelación de órdenes
        return { success: true };

      default:
        throw new Error('Endpoint no encontrado');
    }
  }

  // Método auxiliar para determinar la estación de una orden
  getOrderStation(order) {
    const firstItem = order.items[0];
    const product = db.getProductById(firstItem.productId);
    return product ? product.station : 'kitchen';
  }

  // Métodos de utilidad
  async getMenu() {
    const products = await this.request('/products');
    if (!products.success) return [];

    const categories = {};
    products.data.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product);
    });

    return categories;
  }

  async getOrdersForStation(station) {
    return await this.request(`/orders?station=${station}`);
  }

  async createOrder(orderData) {
    return await this.request('/orders', 'POST', orderData);
  }

  async updateOrderStatus(orderId, status) {
    return await this.request('/orders/status', 'PUT', { orderId, status });
  }

  async processPayment(paymentData) {
    return await this.request('/payments', 'POST', paymentData);
  }

  async authenticate(email, password) {
    return await this.request('/auth/login', 'POST', { email, password });
  }
}

// Exportar instancia única
const api = new RestaurantAPI();
export default api;