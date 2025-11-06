// Sistema de Menú Digital para Producto Nacional
import db from '../api/database.js';
import api from '../api/server.js';
import ws from '../api/websocket.js';

// Estado global de la aplicación
let menuData = {};
let cart = [];
let currentTable = null;
let selectedProduct = null;

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Obtener número de mesa desde URL
        const urlParams = new URLSearchParams(window.location.search);
        const tableNumber = urlParams.get('table');
        
        if (tableNumber) {
            currentTable = parseInt(tableNumber);
            document.getElementById('table-number').textContent = currentTable;
        }

        // Conectar WebSocket
        ws.connect();
        
        // Cargar menú
        await loadMenu();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar carrito desde localStorage
        loadCart();
        
        // Ocultar loading
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('menu-content').classList.remove('hidden');
        
        // Animar entrada
        animateMenuEntrance();
        
    } catch (error) {
        console.error('Error inicializando app:', error);
        showError('Error al cargar el menú. Por favor recarga la página.');
    }
}

async function loadMenu() {
    try {
        const response = await api.getMenu();
        if (response.success) {
            menuData = response.data;
            renderCategories();
            renderMenu();
        } else {
            throw new Error('Error cargando menú');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        // Usar datos de respaldo
        menuData = organizeProductsByCategory(db.getProducts());
        renderCategories();
        renderMenu();
    }
}

function organizeProductsByCategory(products) {
    const categories = {};
    products.forEach(product => {
        if (!categories[product.category]) {
            categories[product.category] = [];
        }
        categories[product.category].push(product);
    });
    return categories;
}

function renderCategories() {
    const categoryNav = document.getElementById('category-nav');
    categoryNav.innerHTML = '';

    const categoryIcons = {
        'ENTRADAS': 'fa-seedling',
        'PLATILLOS': 'fa-utensils',
        'PAQUETES': 'fa-box',
        'BEBIDAS': 'fa-glass-whiskey',
        'MEZCAL': 'fa-wine-bottle',
        'COCTELES': 'fa-cocktail',
        'VINO': 'fa-wine-glass'
    };

    Object.keys(menuData).forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            index === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`;
        button.innerHTML = `
            <i class="fas ${categoryIcons[category] || 'fa-utensils'} mr-2"></i>
            ${category}
        `;
        button.onclick = () => scrollToCategory(category);
        categoryNav.appendChild(button);
    });
}

function renderMenu() {
    const menuContent = document.getElementById('menu-content');
    menuContent.innerHTML = '';

    Object.entries(menuData).forEach(([category, products]) => {
        const section = document.createElement('section');
        section.id = `category-${category}`;
        section.className = 'mb-8';

        section.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">${category}</h2>
                <div class="w-12 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600"></div>
            </div>
            <div class="grid grid-cols-1 gap-4" id="products-${category}">
                <!-- Products will be rendered here -->
            </div>
        `;

        menuContent.appendChild(section);

        // Render products for this category
        const productsContainer = section.querySelector(`#products-${category}`);
        products.forEach(product => {
            if (product.available) {
                productsContainer.appendChild(createProductCard(product));
            }
        });
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-2xl p-4 shadow-custom cursor-pointer';
    card.onclick = () => openProductModal(product);

    card.innerHTML = `
        <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
                <img src="${product.image}" alt="${product.name}" 
                     class="w-20 h-20 rounded-xl object-cover">
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-lg text-gray-800 mb-1">${product.name}</h3>
                <p class="text-sm text-gray-600 mb-2 line-clamp-2">${product.description}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xl font-bold text-gold">$${product.price}</span>
                    <div class="flex items-center space-x-2">
                        ${product.tags.map(tag => 
                            `<span class="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">${tag}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <div class="flex-shrink-0">
                <button class="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center hover:bg-amber-200 transition-colors">
                    <i class="fas fa-plus text-sm"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

function openProductModal(product) {
    selectedProduct = product;
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">${product.name}</h2>
                <button onclick="closeProductModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <img src="${product.image}" alt="${product.name}" 
                 class="w-full h-48 object-cover rounded-xl mb-4">
            
            <p class="text-gray-600 mb-4">${product.description}</p>
            
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                <div class="quantity-selector flex items-center justify-between p-2">
                    <button onclick="changeQuantity(-1)" class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span id="product-quantity" class="text-xl font-semibold">1</span>
                    <button onclick="changeQuantity(1)" class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            
            ${product.options ? `
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Opción</label>
                    <div class="grid grid-cols-2 gap-2" id="product-options">
                        ${product.options.map(option => `
                            <button onclick="selectOption('${option}')" 
                                    class="option-btn px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    data-option="${option}">
                                ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Comentarios (opcional)</label>
                <textarea id="product-comments" 
                          placeholder="Ej: Sin picante, sin cebolla..."
                          class="w-full p-3 border border-gray-200 rounded-lg resize-none h-20"
                          maxlength="200"></textarea>
                <div class="text-right text-xs text-gray-400 mt-1">
                    <span id="comment-count">0</span>/200
                </div>
            </div>
            
            <div class="flex items-center justify-between mb-6">
                <div>
                    <span class="text-sm text-gray-500">Total:</span>
                    <span class="text-2xl font-bold text-gold ml-2">$<span id="product-total">${product.price}</span></span>
                </div>
                <div class="text-sm text-gray-500">
                    Tiempo estimado: ${product.prepTime} min
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="closeProductModal()" 
                        class="btn-secondary flex-1 py-3 rounded-xl font-semibold">
                    Cancelar
                </button>
                <button onclick="addToCart()" 
                        class="btn-primary flex-1 py-3 rounded-xl font-semibold">
                    <i class="fas fa-cart-plus mr-2"></i>
                    Agregar al carrito
                </button>
            </div>
        </div>
    `;

    // Setup option selection
    if (product.options) {
        const firstOption = product.options[0];
        selectOption(firstOption);
    }

    // Setup comment counter
    const commentsTextarea = document.getElementById('product-comments');
    commentsTextarea.addEventListener('input', function() {
        document.getElementById('comment-count').textContent = this.value.length;
    });

    // Show modal with animation
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.style.transform = 'translateY(0)';
    }, 10);

    updateProductTotal();
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');
    
    content.style.transform = 'translateY(100%)';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function changeQuantity(delta) {
    const quantityEl = document.getElementById('product-quantity');
    let quantity = parseInt(quantityEl.textContent);
    quantity = Math.max(1, Math.min(8, quantity + delta));
    quantityEl.textContent = quantity;
    updateProductTotal();
}

function selectOption(option) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        if (btn.dataset.option === option) {
            btn.classList.add('border-amber-500', 'bg-amber-50', 'text-amber-700');
            btn.classList.remove('border-gray-200');
        } else {
            btn.classList.remove('border-amber-500', 'bg-amber-50', 'text-amber-700');
            btn.classList.add('border-gray-200');
        }
    });
    
    // Store selected option
    selectedProduct.selectedOption = option;
    updateProductTotal();
}

function updateProductTotal() {
    const quantity = parseInt(document.getElementById('product-quantity').textContent);
    let price = selectedProduct.price;
    
    // Adjust price based on option (for wines)
    if (selectedProduct.selectedOption === 'botella' && selectedProduct.id === 'cetto-syrah') {
        price = 488;
    } else if (selectedProduct.selectedOption === 'botella' && selectedProduct.id === 'datum') {
        price = 888;
    }
    
    const total = price * quantity;
    document.getElementById('product-total').textContent = total;
}

function addToCart() {
    const quantity = parseInt(document.getElementById('product-quantity').textContent);
    const comments = document.getElementById('product-comments').value.trim();
    
    const cartItem = {
        id: Date.now(),
        product: selectedProduct,
        quantity: quantity,
        comments: comments,
        selectedOption: selectedProduct.selectedOption || null,
        price: calculateItemPrice(selectedProduct, quantity, selectedProduct.selectedOption)
    };
    
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    closeProductModal();
    
    // Show success animation
    showToast('Producto agregado al carrito', 'success');
}

function calculateItemPrice(product, quantity, option) {
    let price = product.price;
    
    // Special pricing for wine options
    if (option === 'botella') {
        if (product.id === 'cetto-syrah') price = 488;
        else if (product.id === 'datum') price = 888;
    }
    
    return price * quantity;
}

function updateCartUI() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
    
    // Update cart badge
    const cartBadge = document.getElementById('cart-count');
    const floatingCartCount = document.getElementById('floating-cart-count');
    
    if (cartCount > 0) {
        cartBadge.textContent = cartCount;
        cartBadge.classList.remove('hidden');
        floatingCartCount.textContent = cartCount;
        document.getElementById('cart-floating').classList.remove('hidden');
    } else {
        cartBadge.classList.add('hidden');
        document.getElementById('cart-floating').classList.add('hidden');
    }
}

function openCartModal() {
    const modal = document.getElementById('cart-modal');
    const content = document.getElementById('cart-modal-content');
    
    if (cart.length === 0) {
        showToast('Tu carrito está vacío', 'info');
        return;
    }
    
    const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
    
    content.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">Tu Carrito</h2>
                <button onclick="closeCartModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="space-y-4 mb-6 max-h-64 overflow-y-auto">
                ${cart.map(item => `
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <img src="${item.product.image}" alt="${item.product.name}" 
                             class="w-12 h-12 rounded-lg object-cover">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-sm">${item.product.name}</h4>
                            <p class="text-xs text-gray-500">
                                ${item.quantity} × $${item.product.price}
                                ${item.selectedOption ? `(${item.selectedOption})` : ''}
                            </p>
                            ${item.comments ? `<p class="text-xs text-gray-400 italic">"${item.comments}"</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-sm">$${item.price}</p>
                            <button onclick="removeFromCart(${item.id})" 
                                    class="text-red-500 text-xs hover:text-red-700">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="border-t pt-4 mb-6">
                <div class="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span class="text-gold">$${cartTotal}</span>
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="closeCartModal()" 
                        class="btn-secondary flex-1 py-3 rounded-xl font-semibold">
                    Seguir comprando
                </button>
                <button onclick="proceedToPayment()" 
                        class="btn-primary flex-1 py-3 rounded-xl font-semibold">
                    Proceder al pago
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.style.transform = 'translateY(0)';
    }, 10);
}

function closeCartModal() {
    const modal = document.getElementById('cart-modal');
    const content = document.getElementById('cart-modal-content');
    
    content.style.transform = 'translateY(100%)';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartUI();
    
    if (cart.length === 0) {
        closeCartModal();
    } else {
        openCartModal(); // Refresh modal
    }
}

function proceedToPayment() {
    closeCartModal();
    openPaymentModal();
}

function openPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const content = document.getElementById('payment-modal-content');
    const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
    
    content.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-display text-2xl font-bold text-gray-800">Método de Pago</h2>
                <button onclick="closePaymentModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4 mb-6">
                <div class="text-center">
                    <div class="text-sm text-gray-500 mb-1">Mesa ${currentTable}</div>
                    <div class="text-3xl font-bold text-gold">$${cartTotal}</div>
                    <div class="text-sm text-gray-600 mt-1">${cart.length} items</div>
                </div>
            </div>
            
            <div class="space-y-3 mb-6">
                <button onclick="selectPaymentMethod('card')" 
                        class="payment-method w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-credit-card text-2xl text-blue-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Tarjeta de Crédito/Débito</h3>
                            <p class="text-sm text-gray-500">Pago seguro con Stripe</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="selectPaymentMethod('cash')" 
                        class="payment-method w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-money-bill text-2xl text-green-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Efectivo</h3>
                            <p class="text-sm text-gray-500">Pagar en caja al final</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="selectPaymentMethod('transfer')" 
                        class="payment-method w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-exchange-alt text-2xl text-purple-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Transferencia Bancaria</h3>
                            <p class="text-sm text-gray-500">SPEI o transferencia bancaria</p>
                        </div>
                    </div>
                </button>
                
                <button onclick="selectPaymentMethod('open-tab')" 
                        class="payment-method w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-amber-300 transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-clock text-2xl text-orange-500 mr-4"></i>
                        <div>
                            <h3 class="font-semibold">Abrir Cuenta</h3>
                            <p class="text-sm text-gray-500">Pagar al final de la visita</p>
                        </div>
                    </div>
                </button>
            </div>
            
            <button onclick="confirmOrder()" 
                    class="btn-primary w-full py-3 rounded-xl font-semibold">
                Confirmar Orden
            </button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.style.transform = 'translateY(0)';
    }, 10);
}

function selectPaymentMethod(method) {
    // Remove previous selection
    document.querySelectorAll('.payment-method').forEach(btn => {
        btn.classList.remove('border-amber-500', 'bg-amber-50');
        btn.classList.add('border-gray-200');
    });
    
    // Add selection to clicked button
    event.currentTarget.classList.remove('border-gray-200');
    event.currentTarget.classList.add('border-amber-500', 'bg-amber-50');
    
    // Store selected method
    window.selectedPaymentMethod = method;
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    const content = document.getElementById('payment-modal-content');
    
    content.style.transform = 'translateY(100%)';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function confirmOrder() {
    if (!window.selectedPaymentMethod) {
        showToast('Por favor selecciona un método de pago', 'warning');
        return;
    }

    try {
        // Create order data
        const orderData = {
            tableNumber: currentTable,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                comments: item.comments,
                selectedOption: item.selectedOption
            })),
            paymentMethod: window.selectedPaymentMethod,
            subtotal: cart.reduce((sum, item) => sum + item.price, 0),
            total: cart.reduce((sum, item) => sum + item.price, 0)
        };

        // Create order
        const response = await api.createOrder(orderData);
        
        if (response.success) {
            // Clear cart
            cart = [];
            saveCart();
            updateCartUI();
            
            // Close payment modal
            closePaymentModal();
            
            // Show success modal
            showSuccessModal();
            
            // Show success toast
            showToast('¡Orden confirmada exitosamente!', 'success');
        } else {
            throw new Error(response.error || 'Error al crear orden');
        }
    } catch (error) {
        console.error('Error confirming order:', error);
        showToast('Error al confirmar la orden. Intenta nuevamente.', 'error');
    }
}

function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    modal.classList.remove('hidden');
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    modal.classList.add('hidden');
}

// Utility functions
function scrollToCategory(category) {
    const element = document.getElementById(`category-${category}`);
    if (element) {
        // Calcular offset dinámicamente considerando elementos sticky
        const header = document.querySelector('header');
        const categoryNav = document.getElementById('category-nav');

        let totalOffset = 20; // Margen base

        if (header) {
            totalOffset += header.offsetHeight;
        }

        if (categoryNav) {
            totalOffset += categoryNav.offsetHeight;
        }

        // Obtener posición del elemento relativa al viewport
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;

        // Hacer scroll con offset calculado dinámicamente
        window.scrollTo({
            top: absoluteElementTop - totalOffset,
            behavior: 'smooth'
        });
    }

    // Update active category button
    document.querySelectorAll('#category-nav button').forEach(btn => {
        btn.classList.remove('bg-amber-100', 'text-amber-800');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });

    event.target.classList.remove('bg-gray-100', 'text-gray-600');
    event.target.classList.add('bg-amber-100', 'text-amber-800');
}

function animateMenuEntrance() {
    anime({
        targets: '.product-card',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutQuart'
    });
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

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    errorDiv.innerHTML = `
        <div class="bg-white rounded-2xl p-6 m-4 max-w-sm text-center">
            <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <h3 class="font-bold text-lg mb-2">Error</h3>
            <p class="text-gray-600 mb-4">${message}</p>
            <button onclick="location.reload()" class="btn-primary px-6 py-2 rounded-lg">
                Recargar página
            </button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

function saveCart() {
    localStorage.setItem('pn_cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('pn_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function setupEventListeners() {
    // Cart button
    document.getElementById('cart-btn').addEventListener('click', openCartModal);
    document.getElementById('cart-floating').addEventListener('click', openCartModal);
    
    // WebSocket listeners
    ws.on('new_order', (data) => {
        console.log('New order received:', data);
    });
    
    ws.on('order_status_change', (data) => {
        console.log('Order status changed:', data);
    });
}

// Export functions for global access
window.closeProductModal = closeProductModal;
window.changeQuantity = changeQuantity;
window.selectOption = selectOption;
window.addToCart = addToCart;
window.closeCartModal = closeCartModal;
window.removeFromCart = removeFromCart;
window.proceedToPayment = proceedToPayment;
window.closePaymentModal = closePaymentModal;
window.selectPaymentMethod = selectPaymentMethod;
window.confirmOrder = confirmOrder;
window.closeSuccessModal = closeSuccessModal;
