


const API_MENU_URL = 'api/menu.php';
const API_ORDERS_URL = 'api/orders.php';
const SERVICE_CHARGE_RATE = 0.05; 
const AUTO_REFRESH_INTERVAL = 15000; 


let menuItems = [];
let basket = [];
let orders = [];
let activeDashboardFilter = 'all';
let autoRefreshTimer = null;


let tabs, tabContents, toastContainer;
let orderForm, custNameInput, custEmailInput, custPhoneInput, tableNumInput;
let menuItemSelect, menuItemQtyInput, addItemBtn, specialNotesInput, submitOrderBtn;
let basketItemsList, emptyBasketState, basketSubtotal, basketTax, basketTotal;
let menuItemForm, menuItemIdInput, menuNameInput, menuPriceInput, menuCategorySelect;
let menuDescInput, saveMenuItemBtn, cancelMenuEditBtn, adminMenuList, emptyMenuListState;
let menuFormTitle, menuFormDesc;
let ordersGrid, dashboardLoader, emptyDashboardState, refreshDashboardBtn, activeOrdersCountBadge, filterBtns;
let menuCardsGrid;
let themeToggleBtn;

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    tabs = document.querySelectorAll('.nav-btn');
    tabContents = document.querySelectorAll('.tab-content');
    toastContainer = document.getElementById('toast-container');
    
    orderForm = document.getElementById('order-form');
    custNameInput = document.getElementById('cust-name');
    tableNumInput = document.getElementById('table-num');
    menuItemSelect = document.getElementById('menu-item-select');
    menuItemQtyInput = document.getElementById('menu-item-qty');
    addItemBtn = document.getElementById('add-item-btn');
    specialNotesInput = document.getElementById('special-notes');
    submitOrderBtn = document.getElementById('submit-order-btn');
    basketItemsList = document.getElementById('basket-items-list');
    emptyBasketState = document.getElementById('empty-basket');
    basketSubtotal = document.getElementById('basket-subtotal');
    basketTax = document.getElementById('basket-tax');
    basketTotal = document.getElementById('basket-total');
    
    menuItemForm = document.getElementById('menu-item-form');
    menuItemIdInput = document.getElementById('menu-item-id');
    menuNameInput = document.getElementById('menu-name');
    menuPriceInput = document.getElementById('menu-price');
    menuCategorySelect = document.getElementById('menu-category');
    menuDescInput = document.getElementById('menu-desc');
    saveMenuItemBtn = document.getElementById('save-menu-item-btn');
    cancelMenuEditBtn = document.getElementById('cancel-menu-edit-btn');
    adminMenuList = document.getElementById('admin-menu-list');
    emptyMenuListState = document.getElementById('empty-menu-list');
    menuFormTitle = document.getElementById('menu-form-title');
    menuFormDesc = document.getElementById('menu-form-desc');
    
    ordersGrid = document.getElementById('orders-grid');
    dashboardLoader = document.getElementById('dashboard-loader');
    emptyDashboardState = document.getElementById('empty-dashboard');
    refreshDashboardBtn = document.getElementById('refresh-dashboard-btn');
    activeOrdersCountBadge = document.getElementById('active-orders-count');
    filterBtns = document.querySelectorAll('.filter-btn');
    
    menuCardsGrid = document.getElementById('menu-cards-grid');
    themeToggleBtn = document.getElementById('theme-toggle-btn');

    setupNavigation();
    fetchMenuItems();

    if (addItemBtn) {
        addItemBtn.addEventListener('click', handleAddItemToBasket);
    }
    if (orderForm) {
        orderForm.addEventListener('submit', handleSubmitOrder);
    }

    if (refreshDashboardBtn) {
        refreshDashboardBtn.addEventListener('click', () => {
            fetchOrders(true);
        });
    }
    setupDashboardFilters();

    if (menuItemForm) {
        menuItemForm.addEventListener('submit', handleSaveMenuItem);
    }
    if (cancelMenuEditBtn) {
        cancelMenuEditBtn.addEventListener('click', resetMenuForm);
    }

    setupThemeToggle(savedTheme);

    fetchOrders(false);
    startAutoRefresh();
}


function setupNavigation() {
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = tab.getAttribute('data-target');
            
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            
            if (targetTab === 'dashboard-section') {
                fetchOrders(true);
            } else if (targetTab === 'menu-section') {
                renderMenuGrid();
            } else if (targetTab === 'manage-menu-section') {
                renderAdminMenuList();
            }
        });
    });
}


function setupThemeToggle(initialTheme) {
    if (!themeToggleBtn) return;
    
    const themeIcon = themeToggleBtn.querySelector('i');
    
    
    if (initialTheme === 'light') {
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        themeIcon.className = 'fa-solid fa-moon';
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        
        if (newTheme === 'light') {
            themeIcon.className = 'fa-solid fa-sun';
            showToast('Theme set to Light Mode', 'success');
        } else {
            themeIcon.className = 'fa-solid fa-moon';
            showToast('Theme set to Dark Mode', 'success');
        }
    });
}




async function fetchMenuItems() {
    try {
        const response = await fetch(API_MENU_URL);
        const result = await response.json();
        
        if (result.success) {
            menuItems = result.data;
            populateMenuDropdown();
            renderMenuGrid();
            renderAdminMenuList();
        } else {
            showToast(result.message || 'Failed to load menu items', 'error');
            menuItemSelect.innerHTML = '<option value="" disabled>Error loading menu</option>';
        }
    } catch (error) {
        console.error('Error fetching menu:', error);
        showToast('Network error: Unable to load restaurant menu.', 'error');
        menuItemSelect.innerHTML = '<option value="" disabled>Server offline</option>';
    }
}


async function fetchOrders(showFeedback = false) {
    if (showFeedback) {
        ordersGrid.classList.add('hidden');
        dashboardLoader.classList.remove('hidden');
        emptyDashboardState.classList.add('hidden');
    }

    try {
        const response = await fetch(API_ORDERS_URL);
        const result = await response.json();

        if (result.success) {
            orders = result.data;
            updateActiveOrdersBadge();
            renderDashboard();
        } else {
            if (showFeedback) showToast('Failed to sync dashboard: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        if (showFeedback) showToast('Failed to connect to order database server.', 'error');
    } finally {
        if (showFeedback) {
            dashboardLoader.classList.add('hidden');
            ordersGrid.classList.remove('hidden');
        }
    }
}


async function placeNewOrder(payload) {
    
    submitOrderBtn.disabled = true;
    submitOrderBtn.querySelector('.btn-text').textContent = 'Processing...';
    submitOrderBtn.querySelector('.loading-spinner').classList.remove('hidden');

    try {
        const response = await fetch(API_ORDERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Success! Order #' + result.data.order_id + ' has been placed.', 'success');
            
            
            resetOrderForm();
            
            
            document.getElementById('tab-dashboard').click();
        } else {
            showToast('Order failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error sending order:', error);
        showToast('Server connection failed. Could not place order.', 'error');
    } finally {
        submitOrderBtn.disabled = false;
        submitOrderBtn.querySelector('.btn-text').textContent = 'Submit Order';
        submitOrderBtn.querySelector('.loading-spinner').classList.add('hidden');
    }
}


async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(API_ORDERS_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: orderId,
                status: newStatus
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Order #${orderId} is now ${newStatus}.`, 'success');
            
            fetchOrders(false);
        } else {
            showToast('Could not update status: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Communication error. Status not updated.', 'error');
    }
}


async function cancelOrder(orderId) {
    if (!confirm(`Are you sure you want to cancel and delete Order #${orderId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_ORDERS_URL}?id=${orderId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Order #${orderId} was successfully cancelled.`, 'success');
            
            fetchOrders(false);
        } else {
            showToast('Could not cancel order: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Communication error. Order not cancelled.', 'error');
    }
}



function populateMenuDropdown() {
    menuItemSelect.innerHTML = '<option value="" disabled selected>Select menu item...</option>';
    
    
    const categories = {};
    menuItems.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    
    for (const [category, items] of Object.entries(categories)) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = category;

        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.name} ($${parseFloat(item.price).toFixed(2)})`;
            opt.dataset.price = item.price;
            opt.dataset.name = item.name;
            optGroup.appendChild(opt);
        });

        menuItemSelect.appendChild(optGroup);
    }
}

function handleAddItemToBasket() {
    const selectedOption = menuItemSelect.options[menuItemSelect.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        showToast('Please select a dish from the menu dropdown.', 'info');
        return;
    }

    const menuId = parseInt(selectedOption.value);
    const price = parseFloat(selectedOption.dataset.price);
    const name = selectedOption.dataset.name;
    const qty = parseInt(menuItemQtyInput.value);

    if (isNaN(qty) || qty <= 0) {
        showToast('Please enter a valid quantity of 1 or more.', 'info');
        return;
    }

    
    const existingIndex = basket.findIndex(item => item.menu_item_id === menuId);

    if (existingIndex > -1) {
        basket[existingIndex].quantity += qty;
        basket[existingIndex].subtotal = basket[existingIndex].quantity * price;
    } else {
        basket.push({
            menu_item_id: menuId,
            name: name,
            price: price,
            quantity: qty,
            subtotal: qty * price
        });
    }

    
    menuItemSelect.selectedIndex = 0;
    menuItemQtyInput.value = 1;

    renderBasket();
    showToast(`Added ${qty}x ${name} to basket.`, 'success');
}

function removeItemFromBasket(menuId) {
    const itemIndex = basket.findIndex(item => item.menu_item_id === menuId);
    if (itemIndex > -1) {
        const removedItem = basket[itemIndex];
        basket.splice(itemIndex, 1);
        renderBasket();
        showToast(`Removed ${removedItem.name} from basket.`, 'info');
    }
}

function renderBasket() {
    if (basket.length === 0) {
        emptyBasketState.classList.remove('hidden');
        basketItemsList.classList.add('hidden');
    } else {
        emptyBasketState.classList.add('hidden');
        basketItemsList.classList.remove('hidden');
    }

    basketItemsList.innerHTML = '';
    
    let subtotal = 0;

    basket.forEach(item => {
        subtotal += item.subtotal;

        const li = document.createElement('li');
        li.className = 'basket-item';
        li.innerHTML = `
            <div class="basket-item-info">
                <h4>${item.name}</h4>
                <span>$${item.price.toFixed(2)} &times; ${item.quantity}</span>
            </div>
            <div class="basket-item-actions">
                <span class="basket-item-price">$${item.subtotal.toFixed(2)}</span>
                <button type="button" class="btn-remove" data-id="${item.menu_item_id}">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;
        
        
        li.querySelector('.btn-remove').addEventListener('click', () => {
            removeItemFromBasket(item.menu_item_id);
        });

        basketItemsList.appendChild(li);
    });

    
    const tax = subtotal * SERVICE_CHARGE_RATE;
    const total = subtotal + tax;

    
    basketSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    basketTax.textContent = `$${tax.toFixed(2)}`;
    basketTotal.textContent = `$${total.toFixed(2)}`;
    updateOrderTabBadge();
}


function handleSubmitOrder(e) {
    e.preventDefault();

    
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));

    let isValid = true;

    
    const name = custNameInput.value.trim();
    if (!name) {
        document.getElementById('err-cust-name').parentElement.classList.add('has-error');
        isValid = false;
    }

    const tableNum = parseInt(tableNumInput.value);
    if (isNaN(tableNum) || tableNum <= 0 || tableNum > 50) {
        document.getElementById('err-table-num').parentElement.classList.add('has-error');
        isValid = false;
    }

    if (basket.length === 0) {
        showToast('Your basket is empty. Please add items before submitting.', 'error');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    const payload = {
        customer_name: name,
        table_number: tableNum,
        special_instructions: specialNotesInput.value.trim() || null,
        items: basket.map(item => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity
        }))
    };

    placeNewOrder(payload);
}

function resetOrderForm() {
    orderForm.reset();
    basket = [];
    renderBasket();
}



function setupDashboardFilters() {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeDashboardFilter = btn.getAttribute('data-filter');
            renderDashboard();
        });
    });
}

function updateDashboardFilterCounts() {
    const countAll = orders.length;
    const countPending = orders.filter(o => o.status === 'Pending').length;
    const countPreparing = orders.filter(o => o.status === 'Preparing').length;
    const countServed = orders.filter(o => o.status === 'Served').length;
    const countCompleted = orders.filter(o => o.status === 'Completed').length;

    const elAll = document.getElementById('count-all');
    const elPending = document.getElementById('count-pending');
    const elPreparing = document.getElementById('count-preparing');
    const elServed = document.getElementById('count-served');
    const elCompleted = document.getElementById('count-completed');

    if (elAll) elAll.textContent = countAll;
    if (elPending) elPending.textContent = countPending;
    if (elPreparing) elPreparing.textContent = countPreparing;
    if (elServed) elServed.textContent = countServed;
    if (elCompleted) elCompleted.textContent = countCompleted;
}

function updateActiveOrdersBadge() {
    const activeCount = orders.filter(o => o.status !== 'Completed').length;
    if (activeOrdersCountBadge) {
        activeOrdersCountBadge.textContent = activeCount;
        if (activeCount > 0) {
            activeOrdersCountBadge.classList.remove('hidden');
        } else {
            activeOrdersCountBadge.classList.add('hidden');
        }
    }
    updateDashboardFilterCounts();
}

function renderDashboard() {
    ordersGrid.innerHTML = '';
    
    
    const filteredOrders = orders.filter(order => {
        if (activeDashboardFilter === 'all') return true;
        return order.status === activeDashboardFilter;
    });

    if (filteredOrders.length === 0) {
        emptyDashboardState.classList.remove('hidden');
        ordersGrid.classList.add('hidden');
        return;
    }

    emptyDashboardState.classList.add('hidden');
    ordersGrid.classList.remove('hidden');

    filteredOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'glass-card order-card';
        card.setAttribute('data-status', order.status);

        
        const orderDateObj = new Date(order.order_date.replace(/-/g, '/')); 
        const formattedDate = orderDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
                              ' - ' + orderDateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="order-card-item">
                    <span><span class="item-qty">${item.quantity}x</span> ${item.name}</span>
                    <span>$${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
            `;
        });

        
        let instructionsHtml = '';
        if (order.special_instructions) {
            instructionsHtml = `
                <div class="order-card-notes">
                    <i class="fa-solid fa-circle-info"></i> Note: "${order.special_instructions}"
                </div>
            `;
        }

        
        let buttonsHtml = '';
        if (order.status === 'Pending') {
            buttonsHtml = `
                <div class="order-actions-row">
                    <button class="btn btn-primary btn-block status-next-btn" data-id="${order.id}" data-next="Preparing">
                        <i class="fa-solid fa-kitchen-set"></i> Prepare
                    </button>
                    <button class="btn btn-danger-outline cancel-btn" data-id="${order.id}">
                        <i class="fa-solid fa-ban"></i> Cancel
                    </button>
                </div>
            `;
        } else if (order.status === 'Preparing') {
            buttonsHtml = `
                <div class="order-actions-row">
                    <button class="btn btn-primary btn-block status-next-btn" data-id="${order.id}" data-next="Served">
                        <i class="fa-solid fa-bell"></i> Serve
                    </button>
                    <button class="btn btn-danger-outline cancel-btn" data-id="${order.id}">
                        <i class="fa-solid fa-ban"></i> Cancel
                    </button>
                </div>
            `;
        } else if (order.status === 'Served') {
            buttonsHtml = `
                <div class="order-actions-row">
                    <button class="btn btn-primary btn-block status-next-btn" data-id="${order.id}" data-next="Completed">
                        <i class="fa-solid fa-check-double"></i> Complete
                    </button>
                    <button class="btn btn-danger-outline cancel-btn" data-id="${order.id}">
                        <i class="fa-solid fa-ban"></i> Cancel
                    </button>
                </div>
            `;
        } else {
            
            buttonsHtml = `
                <div class="order-actions-row">
                    <button class="btn btn-secondary btn-block" disabled>
                        <i class="fa-solid fa-circle-check"></i> Order Finished
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="order-card-top">
                <div class="order-header">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="status-pill status-${order.status.toLowerCase()}">
                        <i class="${getStatusIcon(order.status)}"></i> ${order.status}
                    </span>
                </div>
                <div class="order-time">
                    <i class="fa-regular fa-clock"></i> ${formattedDate}
                </div>
                <div class="customer-info-box">
                    <div class="cust-name">
                        <i class="fa-regular fa-user"></i> ${order.customer.name}
                        <span class="table-badge">Table ${order.table_number}</span>
                    </div>
                    <div class="cust-contact">
                        <span><i class="fa-regular fa-envelope"></i> ${order.customer.email}</span>
                        <span><i class="fa-solid fa-phone"></i> ${order.customer.phone}</span>
                    </div>
                </div>
            </div>
            
            <div class="order-card-items">
                ${itemsHtml}
            </div>

            ${instructionsHtml}

            <div class="order-card-bottom">
                <div class="order-total-display">
                    <span>Grand Total:</span>
                    <span>$${parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
                ${buttonsHtml}
            </div>
        `;

        
        const nextBtn = card.querySelector('.status-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const nextStatus = nextBtn.getAttribute('data-next');
                updateOrderStatus(order.id, nextStatus);
            });
        }

        const cancelBtn = card.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                cancelOrder(order.id);
            });
        }

        ordersGrid.appendChild(card);
    });
}

function getStatusIcon(status) {
    switch (status) {
        case 'Pending': return 'fa-solid fa-hourglass-start';
        case 'Preparing': return 'fa-solid fa-fire-burner';
        case 'Served': return 'fa-solid fa-hand-holding-heart';
        case 'Completed': return 'fa-solid fa-circle-check';
        default: return 'fa-solid fa-question';
    }
}

function startAutoRefresh() {
    autoRefreshTimer = setInterval(() => {
        fetchOrders(false);
    }, AUTO_REFRESH_INTERVAL);
}



function updateOrderTabBadge() {
    const totalItems = basket.reduce((sum, item) => sum + item.quantity, 0);
    const tabOrderBtn = document.getElementById('tab-order');
    if (!tabOrderBtn) return;
    
    let badge = document.getElementById('basket-count-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'basket-count-badge';
        badge.className = 'badge';
        badge.style.marginLeft = '0.35rem';
        tabOrderBtn.appendChild(badge);
    }
    
    badge.textContent = totalItems;
    if (totalItems > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function addItemDirectToBasket(item, qty) {
    const price = parseFloat(item.price);
    const existingIndex = basket.findIndex(b => b.menu_item_id === item.id);

    if (existingIndex > -1) {
        basket[existingIndex].quantity += qty;
        basket[existingIndex].subtotal = basket[existingIndex].quantity * price;
    } else {
        basket.push({
            menu_item_id: item.id,
            name: item.name,
            price: price,
            quantity: qty,
            subtotal: qty * price
        });
    }

    renderBasket();
    updateOrderTabBadge();
    showToast(`Added ${qty}x ${item.name} to basket.`, 'success');
}

function renderMenuGrid() {
    menuCardsGrid.innerHTML = '';
    
    if (menuItems.length === 0) {
        menuCardsGrid.innerHTML = `
            <div class="glass-card text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <i class="fa-solid fa-spinner fa-spin gold-icon" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p>Retrieving gourmet selection...</p>
            </div>
        `;
        return;
    }

    menuItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-card menu-card';
        
        card.innerHTML = `
            <div class="menu-card-top">
                <span class="menu-card-cat">${item.category}</span>
                <h3>${item.name}</h3>
                <p class="menu-card-desc">${item.description || 'No description available.'}</p>
            </div>
            <div class="menu-card-bottom">
                <span class="menu-card-price">$${parseFloat(item.price).toFixed(2)}</span>
                <div class="card-order-controls">
                    <div class="qty-stepper">
                        <button type="button" class="btn-qty-minus"><i class="fa-solid fa-minus"></i></button>
                        <input type="number" class="card-qty-input" value="1" min="1" max="99" readonly>
                        <button type="button" class="btn-qty-plus"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <button type="button" class="btn btn-primary btn-quick-order" data-id="${item.id}">
                        <i class="fa-solid fa-cart-plus"></i> Add
                    </button>
                </div>
            </div>
        `;

        const qtyInput = card.querySelector('.card-qty-input');
        card.querySelector('.btn-qty-minus').addEventListener('click', () => {
            let current = parseInt(qtyInput.value) || 1;
            if (current > 1) qtyInput.value = current - 1;
        });
        card.querySelector('.btn-qty-plus').addEventListener('click', () => {
            let current = parseInt(qtyInput.value) || 1;
            if (current < 99) qtyInput.value = current + 1;
        });

        card.querySelector('.btn-quick-order').addEventListener('click', () => {
            const qty = parseInt(qtyInput.value) || 1;
            addItemDirectToBasket(item, qty);
        });

        menuCardsGrid.appendChild(card);
    });
}


function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';

    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span class="toast-msg">${message}</span>
    `;

    toastContainer.appendChild(toast);

    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4500);
}

function renderAdminMenuList() {
    if (!adminMenuList) return;
    adminMenuList.innerHTML = '';
    
    if (menuItems.length === 0) {
        if (emptyMenuListState) emptyMenuListState.classList.remove('hidden');
        adminMenuList.classList.add('hidden');
        return;
    }
    
    if (emptyMenuListState) emptyMenuListState.classList.add('hidden');
    adminMenuList.classList.remove('hidden');
    
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'basket-item';
        li.innerHTML = `
            <div class="basket-item-info">
                <h4>${item.name}</h4>
                <span>${item.category} - $${parseFloat(item.price).toFixed(2)}</span>
            </div>
            <div class="basket-item-actions">
                <button type="button" class="btn-remove btn-edit-menu" data-id="${item.id}">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" class="btn-remove btn-delete-menu" data-id="${item.id}">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;
        
        li.querySelector('.btn-edit-menu').addEventListener('click', () => {
            editMenuItem(item);
        });
        
        li.querySelector('.btn-delete-menu').addEventListener('click', () => {
            deleteMenuItem(item.id);
        });
        
        adminMenuList.appendChild(li);
    });
}

function editMenuItem(item) {
    if (!menuItemForm) return;
    
    menuItemIdInput.value = item.id;
    menuNameInput.value = item.name;
    menuPriceInput.value = item.price;
    menuCategorySelect.value = item.category;
    menuDescInput.value = item.description || '';
    
    menuFormTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Menu Item';
    menuFormDesc.textContent = 'Modify the details of this dish.';
    saveMenuItemBtn.querySelector('span').textContent = 'Update Item';
    cancelMenuEditBtn.classList.remove('hidden');
    
    document.querySelector('#manage-menu-section .glass-card').scrollIntoView({ behavior: 'smooth' });
}

function resetMenuForm() {
    if (!menuItemForm) return;
    menuItemForm.reset();
    menuItemIdInput.value = '';
    
    menuFormTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Menu Item';
    menuFormDesc.textContent = 'Create a new dish or select an existing one to edit.';
    saveMenuItemBtn.querySelector('span').textContent = 'Save Item';
    cancelMenuEditBtn.classList.add('hidden');
    
    const errName = document.getElementById('err-menu-name');
    const errPrice = document.getElementById('err-menu-price');
    const errCategory = document.getElementById('err-menu-category');
    
    if (errName) errName.style.display = 'none';
    if (errPrice) errPrice.style.display = 'none';
    if (errCategory) errCategory.style.display = 'none';
    
    if (menuNameInput) menuNameInput.style.borderColor = '';
    if (menuPriceInput) menuPriceInput.style.borderColor = '';
    if (menuCategorySelect) menuCategorySelect.style.borderColor = '';
}

async function handleSaveMenuItem(e) {
    try {
        e.preventDefault();
        
        const errName = document.getElementById('err-menu-name');
        const errPrice = document.getElementById('err-menu-price');
        const errCategory = document.getElementById('err-menu-category');
        
        if (errName) errName.style.display = 'none';
        if (errPrice) errPrice.style.display = 'none';
        if (errCategory) errCategory.style.display = 'none';
        
        if (menuNameInput) menuNameInput.style.borderColor = '';
        if (menuPriceInput) menuPriceInput.style.borderColor = '';
        if (menuCategorySelect) menuCategorySelect.style.borderColor = '';
        
        let isValid = true;
        
        const id = menuItemIdInput.value;
        const name = menuNameInput.value.trim();
        const rawPriceStr = (menuPriceInput.value || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const price = parseFloat(rawPriceStr);
        const category = menuCategorySelect.value;
        const description = menuDescInput.value.trim();
        
        if (!name) {
            if (errName) errName.style.display = 'block';
            if (menuNameInput) menuNameInput.style.borderColor = 'var(--danger-color)';
            isValid = false;
        }
        
        if (isNaN(price) || price <= 0) {
            if (errPrice) errPrice.style.display = 'block';
            if (menuPriceInput) menuPriceInput.style.borderColor = 'var(--danger-color)';
            isValid = false;
        }
        
        if (!category) {
            if (errCategory) errCategory.style.display = 'block';
            if (menuCategorySelect) menuCategorySelect.style.borderColor = 'var(--danger-color)';
            isValid = false;
        }
        
        if (!isValid) return;
        
        const payload = {
            name: name,
            price: price,
            category: category,
            description: description || null
        };
        
        let method = 'POST';
        if (id) {
            payload.id = parseInt(id);
            method = 'PUT';
        }
        
        saveMenuItemBtn.disabled = true;
        saveMenuItemBtn.querySelector('span').textContent = 'Saving...';
        
        try {
            const response = await fetch(API_MENU_URL, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                resetMenuForm();
                await fetchMenuItems();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to connect to menu database.', 'error');
        } finally {
            saveMenuItemBtn.disabled = false;
            saveMenuItemBtn.querySelector('span').textContent = id ? 'Update Item' : 'Save Item';
        }
    } catch (err) {
        console.error(err);
        showToast('An unexpected error occurred.', 'error');
    }
}

async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
        const response = await fetch(`${API_MENU_URL}?id=${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            await fetchMenuItems();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Failed to delete item.', 'error');
    }
}
