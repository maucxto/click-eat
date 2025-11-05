// Sistema de Caja para Producto Nacional
import db from '../api/database.js';
import api from '../api/server.js';
import ws from '../api/websocket.js';

// Estado global
let orders = [];
let payments = [];
let currentFilter = 'all';
let audioEnabled = true;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeCashier();
});

async function initializeCashier() {
    try {
        // Conectar WebSocket
        ws.connect();
        
        // Unirse a sala de caja
        ws.joinRoom('cashier');
        
        // Cargar datos iniciales
        await loadData();
        
        // Configurar listeners de WebSocket
        setupWebSocketListeners();
        
        // Actualizar UI inicial
        updateUI();
        
        // Configurar actualización automática cada 30 segundos
        setInterval(updateUI, 30000);
        
        console.log('Sistema de caja inicializado');
        
    } catch (error) {
        console.error('Error inicializando caja:', error);
        showError('Error al conectar con el sistema');
    }
}

async function loadData() {
    try {
        // Cargar órdenes
        const ordersResponse = await api.request('/orders');
        if (ordersResponse.success) {
            orders = ordersResponse.data;
        }
        
        // Cargar pagos
        const paymentsResponse = await api.request('/payments');
        if (paymentsResponse.success) {
            payments = paymentsResponse.data;
        }
        
        renderOrders();
        renderPayments();
        updateStats();
        
    } catch (error) {
        console.error('Error loading data:', error);
        // Use fallback data
        orders = db.getOrders();
        payments = db.getPayments();
        renderOrders();
        renderPayments();
        updateStats();
    }
}

function setupWebSocketListeners() {
    // Nueva orden
    ws.on('cashier_order', (data) => {
        console.log('New cashier order:', data);
        showNewOrderNotification(data.order);
        
        // Add to orders list
        const existingIndex = orders.findIndex(o => o.id === data.order.id);
        if (existingIndex === -1) {
            orders.unshift(data.order);
            renderOrders();
            updateStats();
        }
    });

    // Pago recibido
    ws.on('payment_received', (data) => {
        console.log('Payment received:', data);
        showNewPaymentNotification(data.payment);
        showNewPaymentIndicator();
        
        // Add to payments list
        payments.unshift(data.payment);
        renderPayments();
        updateStats();
        
        // Update order status
        const orderIndex = orders.findIndex(o => o.id === data.payment.orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = 'paid';
            orders[orderIndex].updatedAt = new Date().toISOString();
            renderOrders();
        }
    });

    // Cambio de estado de orden
    ws.on('order_status_change', (data) => {
        const orderIndex = orders.findIndex(o => o.id === data.orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = data.status;
            orders[orderIndex].updatedAt = new Date().toISOString();
            renderOrders();
            updateStats();
        }
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
    const ordersList = document.getElementById('orders-list');
    const emptyState = document.getElementById('orders-empty');
    
    // Filter orders based on current filter
    let filteredOrders = orders;
    if (currentFilter !== 'all') {
        if (currentFilter === 'paid') {
            filteredOrders = orders.filter(order => order.status === 'paid' || order.status === 'ready' || order.status === 'delivered');
        } else {
            filteredOrders = orders.filter(order => order.status === currentFilter);
        }
    }
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Sort orders by priority
    filteredOrders.sort((a, b) => {
        const priorityOrder = { pending: 0, paid: 1, ready: 2, delivered: 3 };
        return priorityOrder[a.status] - priorityOrder[b.status] || 
               new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    ordersList.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
}

function createOrderCard(order) {
    const elapsedTime = getElapsedTime(order.createdAt);
    const statusColors = {
        pending: 'status-pending',
        paid: 'status-paid',
        ready: 'status-ready',
        delivered: 'bg-gray-400'
    };
    
    const statusIcons = {
        pending: 'fa-clock',
        paid: 'fa-check',
        ready: 'fa-utensils',
        delivered: 'fa-check-double'
    };
    
    return `
        <div class="order-card bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors"
             onclick="openOrderDetail('${order.id}')">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full ${statusColors[order.status] || 'bg-gray-400'}"></div>
                    <span class="font-semibold text-sm text-gray-600">${order.orderNumber}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <i class="fas ${statusIcons[order.status]} text-sm ${getStatusColor(order.status)}"></i>
                    <span class="text-xs font-medium ${getStatusColor(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </div>
            </div>
            
            <div class="flex items-center justify-between mb-2">
                <div>
                    <div class="text-lg font-bold text-gold">Mesa ${order.tableNumber}</div>
                    <div class="text-sm text-gray-500">${elapsedTime} min atrás</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-bold">$${order.total}</div>
                    <div class="text-xs text-gray-500">
                        ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}
                    </div>
                </div>
            </div>
            
            ${order.paymentMethod ? `
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Método: ${getPaymentMethodText(order.paymentMethod)}</span>
                    ${order.paymentStatus === 'pending' ? `
                        <span class="text-amber-600 font-medium">Pendiente de pago</span>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

function renderPayments() {
    const paymentsList = document.getElementById('payments-list');
    const emptyState = document.getElementById('payments-empty');
    
    if (payments.length === 0) {
        paymentsList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Show only last 10 payments
    const recentPayments = payments.slice(0, 10);
    
    paymentsList.innerHTML = recentPayments.map(payment => createPaymentCard(payment)).join('');
}

function createPaymentCard(payment) {
    const order = orders.find(o => o.id === payment.orderId);
    const elapsedTime = getElapsedTime(payment.createdAt);
    
    return `
        <div class="payment-card rounded-xl p-4">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <i class="fas ${getPaymentMethodIcon(payment.method)} text-gold"></i>
                        <span class="font-semibold text-sm">
                            ${order ? `Mesa ${order.tableNumber}` : 'Orden desconocida'}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${getPaymentMethodText(payment.method)} • ${elapsedTime} min atrás
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-gold">$${payment.amount}</div>
                    <div class="text-xs text-gray-500">${payment.orderNumber || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
}

function updateStats() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
        new Date(order.createdAt).toDateString() === today
    );
    
    const todayPayments = payments.filter(payment => 
        new Date(payment.createdAt).toDateString() === today
    );
    
    // Calculate totals
    const totalRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidOrders = todayOrders.filter(order => order.status === 'paid').length;
    const cashPayments = todayPayments
        .filter(payment => payment.method === 'cash')
        .reduce((sum, payment) => sum + payment.amount, 0);
    const transferPayments = todayPayments
        .filter(payment => payment.method === 'transfer')
        .reduce((sum, payment) => sum + payment.amount, 0);
    const openTabs = orders.filter(order => order.paymentMethod === 'open-tab' && order.status !== 'delivered').length;
    
    // Update UI
    document.getElementById('total-revenue').textContent = `$${totalRevenue}`;
    document.getElementById('paid-orders').textContent = paidOrders;
    document.getElementById('cash-payments').textContent = `$${cashPayments}`;
    document.getElementById('transfer-payments').textContent = `$${transferPayments}`;
    document.getElementById('daily-sales').textContent = `$${totalRevenue}`;
    document.getElementById('open-tabs').textContent = openTabs;
}

function openOrderDetail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
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
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm text-gray-500">Mesa</div>
                        <div class="text-2xl font-bold text-gold">${order.tableNumber}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500">Estado</div>
                        <div class="text-lg font-bold ${getStatusColor(order.status)}">
                            ${getStatusText(order.status)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-3 mb-6">
                <h3 class="font-semibold text-lg">Productos:</h3>
                ${order.items.map(item => {
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
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-bold">×${item.quantity}</div>
                                <div class="text-sm text-gray-500">
                                    $${item.quantity * (product ? product.price : 0)}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="bg-gray-100 rounded-xl p-4 mb-6">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold">Total:</span>
                    <span class="text-2xl font-bold text-gold">$${order.total}</span>
                </div>
                ${order.paymentMethod ? `
                    <div class="flex justify-between items-center mt-2 text-sm text-gray-600">
                        <span>Método de pago:</span>
                        <span>${getPaymentMethodText(order.paymentMethod)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="flex space-x-3">
                ${order.status === 'pending' && !order.paymentMethod ? `
                    <button onclick="openPaymentModal('${order.id}')" 
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors">
                        <i class="fas fa-credit-card mr-2"></i>
                        Procesar Pago
                    </button>
                ` : order.paymentMethod === 'open-tab' && order.status !== 'delivered' ? `
                    <button onclick="closeTab('${order.id}')" 
                            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold transition-colors">
                        <i class="fas fa-receipt mr-2"></i>
                        Cerrar Cuenta
                    </button>
                ` : `
                    <div class="flex-1 text-center py-3 text-gray-500 font-semibold">
                        ${order.status === 'paid' ? 'Pago procesado' : 'Sin acciones disponibles'}
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

function openPaymentModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('payment-modal');
    const content = document.getElementById('payment-modal-content');
    
    content.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">Procesar Pago</h2>
                <button onclick="closePaymentModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4 mb-6">
                <div class="text-center">
                    <div class="text-sm text-gray-500 mb-1">Mesa ${order.tableNumber}</div>
                    <div class="text-3xl font-bold text-gold">$${order.total}</div>
                    <div class="text-sm text-gray-600 mt-1">${order.items.length} items</div>
                </div>
            </div>
            
            <div class="space-y-3 mb-6">
                <button onclick="processPayment('${order.id}', 'cash')" 
                        class="payment-option w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-money-bill text-2xl text-green-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Efectivo</h3>
                            <p class="text-sm text-gray-500">Pago en efectivo</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="processPayment('${order.id}', 'card')" 
                        class="payment-option w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-credit-card text-2xl text-blue-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Tarjeta</h3>
                            <p class="text-sm text-gray-500">Débito o crédito</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="processPayment('${order.id}', 'transfer')" 
                        class="payment-option w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-exchange-alt text-2xl text-purple-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Transferencia</h3>
                            <p class="text-sm text-gray-500">SPEI o bancaria</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="processPayment('${order.id}', 'open-tab')" 
                        class="payment-option w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-clock text-2xl text-orange-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Abrir Cuenta</h3>
                            <p class="text-sm text-gray-500">Pagar al final</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.style.transform = 'scale(1)';
    }, 10);
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    const content = document.getElementById('payment-modal-content');
    
    content.style.transform = 'scale(0.95)';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function processPayment(orderId, method) {
    try {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        // Create payment record
        const paymentData = {
            orderId: orderId,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            amount: order.total,
            method: method,
            status: 'completed'
        };
        
        const response = await api.request('/payments', 'POST', paymentData);
        
        if (response.success) {
            // Update order status
            const updateResponse = await api.request('/orders/status', 'PUT', {
                orderId: orderId,
                status: method === 'open-tab' ? 'pending' : 'paid'
            });
            
            if (updateResponse.success) {
                // Update local state
                const orderIndex = orders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    orders[orderIndex].status = method === 'open-tab' ? 'pending' : 'paid';
                    orders[orderIndex].paymentMethod = method;
                    orders[orderIndex].updatedAt = new Date().toISOString();
                }
                
                payments.unshift(response.data);
                
                renderOrders();
                renderPayments();
                updateStats();
                closeOrderModal();
                closePaymentModal();
                
                showToast(`Pago procesado con ${getPaymentMethodText(method)}`, 'success');
                
                // Notify other stations
                ws.notifyPaymentReceived(response.data);
            }
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Error al procesar pago', 'error');
    }
}

async function closeTab(orderId) {
    try {
        const updateResponse = await api.request('/orders/status', 'PUT', {
            orderId: orderId,
            status: 'paid'
        });
        
        if (updateResponse.success) {
            // Update local state
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'paid';
                orders[orderIndex].updatedAt = new Date().toISOString();
            }
            
            renderOrders();
            updateStats();
            closeOrderModal();
            
            showToast('Cuenta cerrada exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error closing tab:', error);
        showToast('Error al cerrar cuenta', 'error');
    }
}

function refreshPayments() {
    loadData();
    showToast('Pagos actualizados', 'info');
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

function showNewPaymentIndicator() {
    const indicator = document.getElementById('new-payment-indicator');
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
        paid: 'Pagada',
        preparing: 'En preparación',
        ready: 'Lista',
        delivered: 'Entregada',
        cancelled: 'Cancelada'
    };
    return statusTexts[status] || status;
}

function getStatusColor(status) {
    const statusColors = {
        pending: 'text-amber-600',
        paid: 'text-green-600',
        preparing: 'text-blue-600',
        ready: 'text-green-600',
        delivered: 'text-gray-600',
        cancelled: 'text-red-600'
    };
    return statusColors[status] || 'text-gray-600';
}

function getPaymentMethodText(method) {
    const methodTexts = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia',
        'open-tab': 'Cuenta abierta'
    };
    return methodTexts[method] || method;
}

function getPaymentMethodIcon(method) {
    const methodIcons = {
        cash: 'fa-money-bill',
        card: 'fa-credit-card',
        transfer: 'fa-exchange-alt',
        'open-tab': 'fa-clock'
    };
    return methodIcons[method] || 'fa-credit-card';
}

function showNewOrderNotification(order) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Nueva orden - Mesa ${order.tableNumber}`, {
            body: `Orden ${order.orderNumber} - Total: $${order.total}`,
            icon: '/assets/images/logo.png',
            tag: 'new-order'
        });
    }
}

function showNewPaymentNotification(payment) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Pago recibido - Mesa ${payment.tableNumber}`, {
            body: `$${payment.amount} - ${getPaymentMethodText(payment.method)}`,
            icon: '/assets/images/logo.png',
            tag: 'new-payment'
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

// Global functions
window.filterOrders = filterOrders;
window.openOrderDetail = openOrderDetail;
window.closeOrderModal = closeOrderModal;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.processPayment = processPayment;
window.closeTab = closeTab;
window.refreshPayments = refreshPayments;