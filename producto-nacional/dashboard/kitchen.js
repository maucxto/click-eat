// Sistema de Cocina para Producto Nacional
import db from '../api/database.js';
import api from '../api/server.js';
import ws from '../api/websocket.js';

// Estado global
let orders = [];
let currentFilter = 'all';
let audioEnabled = true;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeKitchen();
});

async function initializeKitchen() {
    try {
        // Conectar WebSocket
        ws.connect();
        
        // Unirse a sala de cocina
        ws.joinRoom('kitchen');
        
        // Cargar órdenes iniciales
        await loadOrders();
        
        // Configurar listeners de WebSocket
        setupWebSocketListeners();
        
        // Solicitar permiso para notificaciones
        requestNotificationPermission();
        
        // Actualizar UI inicial
        updateUI();
        
        console.log('Sistema de cocina inicializado');
        
    } catch (error) {
        console.error('Error inicializando cocina:', error);
        showError('Error al conectar con el sistema');
    }
}

async function loadOrders() {
    try {
        const response = await api.getOrdersForStation('kitchen');
        if (response.success) {
            orders = response.data.filter(order => {
                // Filter orders that have kitchen items
                return order.items.some(item => {
                    const product = db.getProductById(item.productId);
                    return product && product.station === 'kitchen';
                });
            });
            renderOrders();
            updatePendingCount();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        // Use fallback data
        orders = db.getOrders().filter(order => {
            return order.items.some(item => {
                const product = db.getProductById(item.productId);
                return product && product.station === 'kitchen';
            });
        });
        renderOrders();
        updatePendingCount();
    }
}

function setupWebSocketListeners() {
    // Nueva orden
    ws.on('kitchen_order', (data) => {
        console.log('New kitchen order:', data);
        showNewOrderNotification(data.order);
        playNotificationSound('new_order');
        
        // Add to orders list
        const existingIndex = orders.findIndex(o => o.id === data.order.id);
        if (existingIndex === -1) {
            orders.unshift(data.order);
            renderOrders();
            updatePendingCount();
        }
        
        // Show visual indicator
        showNewOrderIndicator();
    });

    // Cambio de estado de orden
    ws.on('order_status_change', (data) => {
        const orderIndex = orders.findIndex(o => o.id === data.orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = data.status;
            orders[orderIndex].updatedAt = new Date().toISOString();
            renderOrders();
            updatePendingCount();
        }
    });

    // Orden lista
    ws.on('ready_kitchen', (data) => {
        playNotificationSound('order_ready');
        showToast(`¡Orden ${data.orderId} lista para mesa ${data.tableNumber}!`, 'success');
    });

    // Conexión
    ws.on('connected', () => {
        showToast('Conectado al sistema', 'success');
    });

    ws.on('disconnected', () => {
        showToast('Desconectado del sistema', 'warning');
    });
}

function renderOrders() {
    const grid = document.getElementById('orders-grid');
    const emptyState = document.getElementById('empty-state');
    
    // Filter orders based on current filter
    let filteredOrders = orders;
    if (currentFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === currentFilter);
    }
    
    if (filteredOrders.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Sort orders by priority
    filteredOrders.sort((a, b) => {
        const priorityOrder = { pending: 0, preparing: 1, ready: 2, delivered: 3 };
        return priorityOrder[a.status] - priorityOrder[b.status] || 
               new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    grid.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
    
    // Animate new orders
    anime({
        targets: '.order-card',
        scale: [0.9, 1],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 500,
        easing: 'easeOutQuart'
    });
}

function createOrderCard(order) {
    const kitchenItems = order.items.filter(item => {
        const product = db.getProductById(item.productId);
        return product && product.station === 'kitchen';
    });
    
    const totalItems = kitchenItems.reduce((sum, item) => sum + item.quantity, 0);
    const elapsedTime = getElapsedTime(order.createdAt);
    const isUrgent = elapsedTime > 20; // More than 20 minutes
    
    const statusColors = {
        pending: 'status-pending',
        preparing: 'status-preparing',
        ready: 'status-ready',
        delivered: 'bg-gray-400'
    };
    
    return `
        <div class="order-card bg-white rounded-2xl p-4 shadow-lg cursor-pointer ${isUrgent ? 'pulse-animation' : ''}" 
             onclick="openOrderDetail('${order.id}')">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full ${statusColors[order.status] || 'bg-gray-400'}"></div>
                    <span class="font-semibold text-sm text-gray-600">${order.orderNumber}</span>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-gold">Mesa ${order.tableNumber}</div>
                    <div class="timer text-xs text-gray-500">${elapsedTime}m</div>
                </div>
            </div>
            
            <div class="space-y-2 mb-3">
                ${kitchenItems.slice(0, 3).map(item => {
                    const product = db.getProductById(item.productId);
                    return `
                        <div class="flex items-center justify-between text-sm">
                            <span class="font-medium">${product ? product.name : 'Producto desconocido'}</span>
                            <span class="text-gray-500">×${item.quantity}</span>
                        </div>
                    `;
                }).join('')}
                ${kitchenItems.length > 3 ? `
                    <div class="text-xs text-gray-500 text-center">
                        +${kitchenItems.length - 3} productos más
                    </div>
                ` : ''}
            </div>
            
            <div class="flex items-center justify-between">
                <div class="text-xs text-gray-500">
                    ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}
                </div>
                <div class="text-xs font-medium ${getStatusColor(order.status)}">
                    ${getStatusText(order.status)}
                </div>
            </div>
            
            ${order.items.some(item => item.comments) ? `
                <div class="mt-2 p-2 bg-amber-50 rounded-lg">
                    <i class="fas fa-comment text-amber-500 text-xs mr-1"></i>
                    <span class="text-xs text-amber-700">Con comentarios especiales</span>
                </div>
            ` : ''}
        </div>
    `;
}

function openOrderDetail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const kitchenItems = order.items.filter(item => {
        const product = db.getProductById(item.productId);
        return product && product.station === 'kitchen';
    });
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">Orden ${order.orderNumber}</h2>
                <button onclick="closeOrderModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-sm text-gray-500">Mesa</div>
                        <div class="text-2xl font-bold text-gold">${order.tableNumber}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500">Tiempo transcurrido</div>
                        <div class="timer text-lg font-bold text-gray-700">${getElapsedTime(order.createdAt)} min</div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-3 mb-6">
                <h3 class="font-semibold text-lg">Productos de cocina:</h3>
                ${kitchenItems.map(item => {
                    const product = db.getProductById(item.productId);
                    return `
                        <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div class="flex-1">
                                <h4 class="font-semibold">${product ? product.name : 'Producto desconocido'}</h4>
                                <p class="text-sm text-gray-600">${product ? product.description : ''}</p>
                                ${item.comments ? `
                                    <div class="mt-2 p-2 bg-amber-50 rounded text-xs">
                                        <i class="fas fa-comment text-amber-500 mr-1"></i>
                                        <span class="text-amber-700">${item.comments}</span>
                                    </div>
                                ` : ''}
                                ${item.selectedOption ? `
                                    <div class="mt-1 text-xs text-gray-500">
                                        Opción: ${item.selectedOption}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-bold">×${item.quantity}</div>
                                <div class="text-sm text-gray-500">
                                    ${product ? product.prepTime + ' min' : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="flex space-x-3">
                ${order.status === 'pending' ? `
                    <button onclick="startPreparation('${order.id}')" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors">
                        <i class="fas fa-play mr-2"></i>
                        Comenzar preparación
                    </button>
                ` : order.status === 'preparing' ? `
                    <button onclick="markAsReady('${order.id}')" 
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors">
                        <i class="fas fa-check mr-2"></i>
                        Marcar como listo
                    </button>
                ` : `
                    <div class="flex-1 text-center py-3 text-gray-500 font-semibold">
                        Orden ${getStatusText(order.status)}
                    </div>
                `}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.style.transform = 'scale(1)';
    }, 10);
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('modal-content');
    
    content.style.transform = 'scale(0.95)';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function startPreparation(orderId) {
    try {
        const response = await api.updateOrderStatus(orderId, 'preparing');
        if (response.success) {
            // Update local state
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'preparing';
                orders[orderIndex].updatedAt = new Date().toISOString();
            }
            
            renderOrders();
            updatePendingCount();
            closeOrderModal();
            
            showToast('Preparación iniciada', 'info');
            playNotificationSound('success');
        }
    } catch (error) {
        console.error('Error starting preparation:', error);
        showToast('Error al iniciar preparación', 'error');
    }
}

async function markAsReady(orderId) {
    try {
        const response = await api.updateOrderStatus(orderId, 'ready');
        if (response.success) {
            // Update local state
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'ready';
                orders[orderIndex].updatedAt = new Date().toISOString();
            }
            
            renderOrders();
            updatePendingCount();
            closeOrderModal();
            
            showToast('¡Orden lista!', 'success');
            playNotificationSound('order_ready');
        }
    } catch (error) {
        console.error('Error marking as ready:', error);
        showToast('Error al marcar como lista', 'error');
    }
}

function filterOrders(status) {
    currentFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-100', 'text-amber-800');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    
    event.target.classList.remove('bg-gray-100', 'text-gray-600');
    event.target.classList.add('bg-amber-100', 'text-amber-800');
    
    renderOrders();
}

function updatePendingCount() {
    const pendingCount = orders.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
    ).length;
    
    document.getElementById('pending-count').textContent = pendingCount;
}

function showNewOrderIndicator() {
    const indicator = document.getElementById('new-order-indicator');
    indicator.classList.remove('hidden');
    
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 5000);
}

function getElapsedTime(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    return diffInMinutes;
}

function getStatusText(status) {
    const statusTexts = {
        pending: 'Pendiente',
        preparing: 'En preparación',
        ready: 'Lista',
        delivered: 'Entregada'
    };
    return statusTexts[status] || status;
}

function getStatusColor(status) {
    const statusColors = {
        pending: 'text-amber-600',
        preparing: 'text-blue-600',
        ready: 'text-green-600',
        delivered: 'text-gray-600'
    };
    return statusColors[status] || 'text-gray-600';
}

function playNotificationSound(type) {
    if (!audioEnabled) return;
    
    try {
        const audio = document.getElementById('success-sound');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Error playing sound:', e));
    } catch (error) {
        console.log('Audio not supported');
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNewOrderNotification(order) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Nueva orden - Mesa ${order.tableNumber}`, {
            body: `Orden ${order.orderNumber} recibida`,
            icon: '/assets/images/logo.png',
            tag: 'new-order'
        });
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    anime({
        targets: toast,
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuart'
    });
    
    setTimeout(() => {
        anime({
            targets: toast,
            translateX: [0, 300],
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInQuart',
            complete: () => toast.remove()
        });
    }, 3000);
}

function updateUI() {
    // Update clock
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Update any timer elements
        document.querySelectorAll('.timer').forEach(timer => {
            if (timer.dataset.createdAt) {
                const elapsed = getElapsedTime(timer.dataset.createdAt);
                timer.textContent = elapsed + 'm';
            }
        });
    }, 60000); // Update every minute
}

// Global functions
window.filterOrders = filterOrders;
window.openOrderDetail = openOrderDetail;
window.closeOrderModal = closeOrderModal;
window.startPreparation = startPreparation;
window.markAsReady = markAsReady;