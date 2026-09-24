// ===============================
// DUKAAN MANAGER - SCRIPT.JS
// ===============================

// 🔗 LIVE RENDER BACKEND
const API_BASE = "https://dukaan-manager-backend-kjen.onrender.com";

const TOKEN_KEY = "dukaan_backend_token";
const USER_KEY = "dukaan_backend_user";

let currentUser = null;
let recognition = null;


// ===============================
// BASIC HELPERS
// ===============================

function $(id) {
    return document.getElementById(id);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    currentUser = null;
}

function getLocalDate() {
    const d = new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getLocalMonth() {
    const d = new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

// Backend already returns RUPEES.
// Example: 206 means ₹206, NOT 206 paise.
function money(value) {
    const n = Number(value || 0);

    return "₹" + n.toFixed(2);
}

function showMessage(text, type = "info") {
    const box = $("message");

    if (!box) return;

    box.textContent = text;

    box.className = "message";

    if (type === "success") {
        box.classList.add("success");
    }

    if (type === "error") {
        box.classList.add("error");
    }

    if (type === "warning") {
        box.classList.add("warning");
    }

    setTimeout(() => {
        box.textContent = "";
        box.className = "message";
    }, 5000);
}


// ===============================
// API HELPER
// ===============================

async function api(path, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {

        const response = await fetch(API_BASE + path, {
            ...options,
            headers
        });

        let data = {};

        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        if (response.status === 401) {
            clearToken();

            showAuth();

            throw new Error(
                data.message || "Login session expired. Please login again."
            );
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                data.error ||
                `Request failed (${response.status})`
            );
        }

        return data;

    } catch (error) {

        console.error("API Error:", error);

        if (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
        ) {
            throw new Error(
                "Backend se connection nahi ho raha. Internet check karo."
            );
        }

        throw error;
    }
}


// ===============================
// AUTH SCREEN
// ===============================

function showAuth() {

    if ($("authScreen")) {
        $("authScreen").style.display = "block";
    }

    if ($("mainApp")) {
        $("mainApp").style.display = "none";
    }

    if ($("loginBox")) {
        $("loginBox").style.display = "block";
    }

    if ($("registerBox")) {
        $("registerBox").style.display = "none";
    }
}

function showRegister() {

    if ($("loginBox")) {
        $("loginBox").style.display = "none";
    }

    if ($("registerBox")) {
        $("registerBox").style.display = "block";
    }
}

function showLogin() {

    if ($("registerBox")) {
        $("registerBox").style.display = "none";
    }

    if ($("loginBox")) {
        $("loginBox").style.display = "block";
    }
}


// ===============================
// REGISTER
// ===============================

async function registerUser() {

    const name = $("regName")?.value.trim();
    const shopName = $("regShop")?.value.trim();
    const mobile = $("regMobile")?.value.trim();
    const password = $("regPassword")?.value;
    const confirmPassword = $("regConfirm")?.value;

    if (!name) {
        showMessage("Apna naam enter karo.", "warning");
        return;
    }

    if (!shopName) {
        showMessage("Shop ka naam enter karo.", "warning");
        return;
    }

    if (!mobile) {
        showMessage("Mobile number enter karo.", "warning");
        return;
    }

    if (!password) {
        showMessage("Password enter karo.", "warning");
        return;
    }

    if (password.length < 6) {
        showMessage("Password kam se kam 6 characters ka rakho.", "warning");
        return;
    }

    if (confirmPassword && password !== confirmPassword) {
        showMessage("Passwords match nahi kar rahe.", "error");
        return;
    }

    try {

        showMessage("Account create ho raha hai...");

        const data = await api("/api/auth/register", {
            method: "POST",

            body: JSON.stringify({
                name,
                shopName,
                mobile,
                password,
                confirmPassword
            })
        });

        if (data.token) {
            saveToken(data.token);
        }

        if (data.user) {
            currentUser = data.user;

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );
        }

        showMessage(
            "Account successfully create ho gaya! 🎉",
            "success"
        );

        openMainApp();

    } catch (error) {

        showMessage(error.message, "error");
    }
}


// ===============================
// LOGIN
// ===============================

async function loginUser() {

    const mobile = $("loginMobile")?.value.trim();
    const password = $("loginPassword")?.value;

    if (!mobile || !password) {
        showMessage(
            "Mobile number aur password dono enter karo.",
            "warning"
        );

        return;
    }

    try {

        showMessage("Login ho raha hai...");

        const data = await api("/api/auth/login", {
            method: "POST",

            body: JSON.stringify({
                mobile,
                password
            })
        });

        if (data.token) {
            saveToken(data.token);
        }

        if (data.user) {
            currentUser = data.user;

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );
        }

        showMessage("Login successful! 👋", "success");

        openMainApp();

    } catch (error) {

        showMessage(error.message, "error");
    }
}


// ===============================
// LOGOUT
// ===============================

function logoutUser() {

    clearToken();

    showMessage("Logout ho gaya.", "success");

    showAuth();
}


// ===============================
// OPEN MAIN APP
// ===============================

async function openMainApp() {

    if ($("authScreen")) {
        $("authScreen").style.display = "none";
    }

    if ($("mainApp")) {
        $("mainApp").style.display = "block";
    }

    updateDate();

    try {
        await loadProfile();
    } catch (error) {
        console.log("Profile load:", error.message);
    }

    goHome();
}


// ===============================
// PROFILE
// ===============================

async function loadProfile() {

    const data = await api("/api/me");

    if (data.user) {

        currentUser = data.user;

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data.user)
        );
    }

    return data;
}

async function updateProfile() {

    if (!currentUser) return;

    const name =
        $("profileName")?.value?.trim() ||
        currentUser.name;

    const shopName =
        $("profileShop")?.value?.trim() ||
        currentUser.shop_name;

    const language =
        $("languageSelect")?.value ||
        currentUser.language ||
        "Hindi";

    try {

        const data = await api("/api/profile", {
            method: "PUT",

            body: JSON.stringify({
                name,
                shopName,
                language
            })
        });

        if (data.user) {

            currentUser = data.user;

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );
        }

        showMessage(
            "Profile successfully update ho gaya.",
            "success"
        );

    } catch (error) {

        showMessage(error.message, "error");
    }
}


// ===============================
// DATE
// ===============================

function updateDate() {

    const el = $("currentDate");

    if (!el) return;

    const d = new Date();

    el.textContent = d.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


// ===============================
// NAVIGATION
// ===============================

function hideAllScreens() {

    if ($("homeScreen")) {
        $("homeScreen").style.display = "none";
    }

    if ($("pageScreen")) {
        $("pageScreen").style.display = "none";
    }

    if ($("settingsScreen")) {
        $("settingsScreen").style.display = "none";
    }
}

function goHome() {

    hideAllScreens();

    if ($("homeScreen")) {
        $("homeScreen").style.display = "block";
    }

    updateDate();
}

function showSettings() {

    hideAllScreens();

    if ($("settingsScreen")) {
        $("settingsScreen").style.display = "block";
    }

    renderSettings();
}

function openPage(title, html) {

    hideAllScreens();

    if ($("pageScreen")) {
        $("pageScreen").style.display = "block";
    }

    const pageContent = $("pageContent");

    if (pageContent) {

        pageContent.innerHTML = `
            <div class="page-title">
                <button onclick="goHome()">←</button>
                <h2>${title}</h2>
            </div>

            ${html}
        `;
    }
}


// ===============================
// HOME DASHBOARD
// ===============================

async function loadHome() {

    try {

        const data = await api(
            `/api/reports/daily?date=${getLocalDate()}`
        );

        const sales =
            data.sales?.revenue || 0;

        const profit =
            data.netProfit || 0;

        const expenses =
            data.expenses || 0;

        const salesBox = $("homeSales");
        const profitBox = $("homeProfit");
        const expenseBox = $("homeExpense");

        if (salesBox) {
            salesBox.textContent = money(sales);
        }

        if (profitBox) {
            profitBox.textContent = money(profit);
        }

        if (expenseBox) {
            expenseBox.textContent = money(expenses);
        }

    } catch (error) {

        console.log("Home load:", error.message);
    }
}


// ===============================
// DAILY SALES PAGE
// ===============================

async function openDailySales() {

    openPage(
        "Daily Sale",
        `<div id="dailySalesContent">Loading...</div>`
    );

    try {

        const data = await api(
            `/api/reports/daily-sales?date=${getLocalDate()}`
        );

        let html = `
            <div class="summary-card">
                <h3>Total Sale</h3>
                <strong>${money(data.totalRevenue)}</strong>
            </div>
        `;

        if (!data.sales || data.sales.length === 0) {

            html += `
                <p>Aaj abhi koi sale record nahi hai.</p>
            `;

        } else {

            html += `<div class="sales-list">`;

            data.sales.forEach(sale => {

                html += `
                    <div class="sale-item">

                        <h3>${escapeHTML(sale.product)}</h3>

                        <p>
                            Quantity:
                            <b>${sale.quantity}</b>
                        </p>

                        <p>
                            Selling Price:
                            <b>${money(sale.sellingPrice)}</b>
                        </p>

                        <p>
                            Revenue:
                            <b>${money(sale.revenue)}</b>
                        </p>

                        <p>
                            COGS:
                            <b>${money(sale.cogs)}</b>
                        </p>

                        <p>
                            Gross Profit:
                            <b>${money(sale.grossProfit)}</b>
                        </p>

                    </div>
                `;
            });

            html += `</div>`;
        }

        const el = $("dailySalesContent");

        if (el) {
            el.innerHTML = html;
        }

    } catch (error) {

        const el = $("dailySalesContent");

        if (el) {
            el.innerHTML =
                `<p class="error">${escapeHTML(error.message)}</p>`;
        }
    }
}


// ===============================
// PURCHASE / STOCK ENTRY
// ===============================

async function addPurchase(product, quantity, cost) {

    if (!product) {
        throw new Error("Product name missing.");
    }

    if (!quantity || quantity <= 0) {
        throw new Error("Quantity sahi enter karo.");
    }

    if (cost === null || cost === undefined || cost < 0) {
        throw new Error("Purchase price sahi enter karo.");
    }

    return await api("/api/purchases", {

        method: "POST",

        body: JSON.stringify({
            product,
            quantity,
            cost
        })
    });
}


// ===============================
// SALE ENTRY
// ===============================

async function addSale(product, quantity, sellingPrice) {

    if (!product) {
        throw new Error("Product name missing.");
    }

    if (!quantity || quantity <= 0) {
        throw new Error("Quantity sahi enter karo.");
    }

    if (
        sellingPrice === null ||
        sellingPrice === undefined ||
        sellingPrice < 0
    ) {
        throw new Error("Selling price sahi enter karo.");
    }

    return await api("/api/sales", {

        method: "POST",

        body: JSON.stringify({
            product,
            quantity,
            sellingPrice
        })
    });
}


// ===============================
// MANUAL PURCHASE PAGE
// ===============================

function openPurchasePage() {

    openPage(
        "Purchase / Stock",
        `
        <div class="form-group">

            <label>Product</label>

            <input
                id="purchaseProduct"
                placeholder="Example: Chips"
            >

        </div>

        <div class="form-group">

            <label>Quantity</label>

            <input
                id="purchaseQuantity"
                type="number"
                placeholder="Example: 50"
            >

        </div>

        <div class="form-group">

            <label>Purchase Price per item</label>

            <input
                id="purchaseCost"
                type="number"
                step="0.01"
                placeholder="Example: 4.12"
            >

        </div>

        <button onclick="manualPurchase()">
            Add Purchase
        </button>

        <div id="purchaseResult"></div>
        `
    );
}

async function manualPurchase() {

    const product =
        $("purchaseProduct")?.value.trim();

    const quantity =
        Number($("purchaseQuantity")?.value);

    const cost =
        Number($("purchaseCost")?.value);

    try {

        const data = await addPurchase(
            product,
            quantity,
            cost
        );

        $("purchaseResult").innerHTML = `
            <div class="success">
                Purchase added successfully.<br>
                Product: ${escapeHTML(data.purchase.product)}<br>
                Quantity: ${data.purchase.quantity}<br>
                Cost: ${money(data.purchase.cost)}<br>
                Total: ${money(data.purchase.total)}
            </div>
        `;

    } catch (error) {

        $("purchaseResult").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ===============================
// MANUAL SALE PAGE
// ===============================

function openSalePage() {

    openPage(
        "Record Sale",
        `
        <div class="form-group">

            <label>Product</label>

            <input
                id="saleProduct"
                placeholder="Example: Chips"
            >

        </div>

        <div class="form-group">

            <label>Quantity</label>

            <input
                id="saleQuantity"
                type="number"
                placeholder="Example: 10"
            >

        </div>

        <div class="form-group">

            <label>Selling Price per item</label>

            <input
                id="salePrice"
                type="number"
                step="0.01"
                placeholder="Example: 5"
            >

        </div>

        <button onclick="manualSale()">
            Record Sale
        </button>

        <div id="saleResult"></div>
        `
    );
}

async function manualSale() {

    const product =
        $("saleProduct")?.value.trim();

    const quantity =
        Number($("saleQuantity")?.value);

    const sellingPrice =
        Number($("salePrice")?.value);

    try {

        const data = await addSale(
            product,
            quantity,
            sellingPrice
        );

        const sale = data.sale;

        $("saleResult").innerHTML = `
            <div class="success">

                Sale recorded successfully.<br><br>

                Product:
                <b>${escapeHTML(sale.product)}</b><br>

                Quantity:
                <b>${sale.quantity}</b><br>

                Revenue:
                <b>${money(sale.revenue)}</b><br>

                COGS:
                <b>${money(sale.cogs)}</b><br>

                Gross Profit:
                <b>${money(sale.grossProfit)}</b>

            </div>
        `;

    } catch (error) {

        $("saleResult").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ===============================
// STOCK PAGE
// ===============================

async function openStockPage() {

    openPage(
        "Current Stock",
        `<div id="stockContent">Loading...</div>`
    );

    try {

        const data = await api("/api/stock");

        let html = "";

        if (!data.stock || data.stock.length === 0) {

            html = `
                <p>Abhi koi stock nahi hai.</p>
            `;

        } else {

            html = `<div class="stock-list">`;

            data.stock.forEach(item => {

                html += `
                    <div class="stock-item">

                        <h3>
                            ${escapeHTML(item.product)}
                        </h3>

                        <p>
                            Quantity:
                            <b>${item.quantity}</b>
                        </p>

                        <p>
                            Inventory Value:
                            <b>${money(item.inventoryValue)}</b>
                        </p>

                    </div>
                `;
            });

            html += `</div>`;
        }

        const el = $("stockContent");

        if (el) {
            el.innerHTML = html;
        }

    } catch (error) {

        const el = $("stockContent");

        if (el) {
            el.innerHTML =
                `<p class="error">${escapeHTML(error.message)}</p>`;
        }
    }
}


// ===============================
// STOCK PRODUCT DETAILS
// ===============================

async function getProductStock(product) {

    if (!product) {
        throw new Error("Product name missing.");
    }

    return await api(
        `/api/stock/${encodeURIComponent(product)}`
    );
}


// ===============================
// EXPENSE
// ===============================

async function addExpense(
    description,
    amount,
    date = getLocalDate()
) {

    return await api("/api/expenses", {

        method: "POST",

        body: JSON.stringify({
            description,
            amount,
            date
        })
    });
}

function openExpensePage() {

    openPage(
        "Expense",
        `
        <div class="form-group">

            <label>Expense Description</label>

            <input
                id="expenseDescription"
                placeholder="Example: Electricity"
            >

        </div>

        <div class="form-group">

            <label>Amount</label>

            <input
                id="expenseAmount"
                type="number"
                step="0.01"
                placeholder="Example: 500"
            >

        </div>

        <button onclick="manualExpense()">
            Add Expense
        </button>

        <div id="expenseResult"></div>
        `
    );
}

async function manualExpense() {

    const description =
        $("expenseDescription")?.value.trim();

    const amount =
        Number($("expenseAmount")?.value);

    try {

        const data = await addExpense(
            description,
            amount
        );

        $("expenseResult").innerHTML = `
            <div class="success">

                Expense added successfully.<br>

                ${escapeHTML(data.expense.description)}:
                <b>${money(data.expense.amount)}</b>

            </div>
        `;

    } catch (error) {

        $("expenseResult").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ===============================
// DAILY PROFIT
// ===============================

async function openDailyProfit() {

    openPage(
        "Daily Profit",
        `<div id="dailyProfitContent">Loading...</div>`
    );

    try {

        const data = await api(
            `/api/reports/daily?date=${getLocalDate()}`
        );

        const sales = data.sales || {};

        const html = `
            <div class="report-card">

                <h3>Today's Report</h3>

                <p>
                    Total Sale:
                    <b>${money(sales.revenue)}</b>
                </p>

                <p>
                    COGS:
                    <b>${money(sales.cogs)}</b>
                </p>

                <p>
                    Gross Profit:
                    <b>${money(sales.grossProfit)}</b>
                </p>

                <p>
                    Expenses:
                    <b>${money(data.expenses)}</b>
                </p>

                <hr>

                <h2>
                    Net Profit:
                    ${money(data.netProfit)}
                </h2>

            </div>
        `;

        $("dailyProfitContent").innerHTML = html;

    } catch (error) {

        $("dailyProfitContent").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ===============================
// MONTHLY REPORT
// ===============================

async function openMonthlyReport() {

    const month = getLocalMonth();

    openPage(
        "Monthly Profit",
        `<div id="monthlyContent">Loading...</div>`
    );

    try {

        const data = await api(
            `/api/reports/monthly?month=${month}`
        );

        const sales = data.sales || {};

        $("monthlyContent").innerHTML = `

            <div class="report-card">

                <h3>
                    ${data.year}-${String(data.month).padStart(2, "0")}
                </h3>

                <p>
                    Total Sale:
                    <b>${money(sales.revenue)}</b>
                </p>

                <p>
                    COGS:
                    <b>${money(sales.cogs)}</b>
                </p>

                <p>
                    Gross Profit:
                    <b>${money(sales.grossProfit)}</b>
                </p>

                <p>
                    Expenses:
                    <b>${money(data.expenses)}</b>
                </p>

                <hr>

                <h2>
                    Net Profit:
                    ${money(data.netProfit)}
                </h2>

            </div>
        `;

    } catch (error) {

        $("monthlyContent").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ===============================
// KHATA
// ===============================

async function addKhata(
    customerName,
    type,
    amount,
    note = "",
    date = getLocalDate()
) {

    return await api("/api/khata", {

        method: "POST",

        body: JSON.stringify({
            customerName,
            type,
            amount,
            note,
            date
        })
    });
}

function openKhataPage() {

    openPage(
        "Khata",
        `
        <div class="form-group">

            <label>Customer Name</label>

            <input
                id="khataCustomer"
                placeholder="Example: Aman"
            >

        </div>

        <div class="form-group">

            <label>Type</label>

            <select id="khataType">

                <option value="credit">
                    Udhar diya
                </option>

                <option value="payment">
                    Payment mila
                </option>

            </select>

        </div>

        <div class="form-group">

            <label>Amount</label>

            <input
                id="khataAmount"
                type="number"
                step="0.01"
                placeholder="Example: 500"
            >

        </div>

        <div class="form-group">

            <label>Note</label>

            <input
                id="khataNote"
                placeholder="Optional"
            >

        </div>

        <button onclick="manualKhata()">
            Save Khata
        </button>

        <div id="khataResult"></div>
        `
    );
}

async function manualKhata() {

    const customer =
        $("khataCustomer")?.value.trim();

    const type =
        $("khataType")?.value;

    const amount =
        Number($("khataAmount")?.value);

    const note =
        $("khataNote")?.value.trim();

    try {

        const data = await addKhata(
            customer,
            type,
            amount,
            note
        );

        $("khataResult").innerHTML = `
            <div class="success">

                Khata saved successfully.<br>

                Customer:
                <b>${escapeHTML(data.entry.customerName)}</b><br>

                Type:
                <b>${data.entry.type}</b><br>

                Amount:
                <b>${money(data.entry.amount)}</b>

            </div>
        `;

    } catch (error) {

        $("khataResult").innerHTML = `
            <div class="error">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}

async function getKhata(customer) {

    return await api(
        `/api/khata/${encodeURIComponent(customer)}`
    );
}


// ===============================
// MESSAGE PARSER
// ===============================

function extractMoney(text) {

    if (!text) return null;

    // ₹500 / ₹4.12
    let match = text.match(
        /₹\s*([0-9]+(?:\.[0-9]{1,2})?)/
    );

    if (match) {
        return Number(match[1]);
    }

    // 500 rupees / 500 rs
    match = text.match(
        /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs\.?)/i
    );

    if (match) {
        return Number(match[1]);
    }

    return null;
}

function extractAllNumbers(text) {

    return (text.match(
        /(?:₹\s*)?[0-9]+(?:\.[0-9]{1,2})?/g
    ) || []).map(x =>
        Number(
            x.replace("₹", "").trim()
        )
    );
}

function extractQuantity(text) {

    if (!text) return null;

    // Example:
    // 50 packets
    // 20 pcs
    // 10 bottles
    // 5 items
    let match = text.match(
        /(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|packets?|packet|units?|items?|bottles?|boxes?|box)\b/i
    );

    if (match) {
        return Number(match[1]);
    }

    // Hindi/common wording:
    // 50 chips kharide
    // 10 bottles bechi
    match = text.match(
        /(?:^|\s)(\d+)\s+[a-zA-Z\u0900-\u097F]+/
    );

    if (match) {
        return Number(match[1]);
    }

    return null;
}

function extractProduct(text) {

    if (!text) return "";

    let result = text;

    // Remove prices
    result = result.replace(
        /₹\s*[0-9]+(?:\.[0-9]{1,2})?/gi,
        " "
    );

    result = result.replace(
        /[0-9]+(?:\.[0-9]{1,2})?\s*(?:rupees?|rs\.?)/gi,
        " "
    );

    // Remove quantity + unit
    result = result.replace(
        /\b\d+(?:\.\d+)?\s*(?:pcs?|pieces?|packets?|packet|units?|items?|bottles?|boxes?|box)\b/gi,
        " "
    );

    // Remove common numbers
    result = result.replace(/\b\d+(?:\.\d+)?\b/g, " ");

    // Remove common commands/fillers
    result = result.replace(
        /\b(kharida|kharide|kharidna|purchase|purchased|buy|bought|liya|liye|lena|sale|sell|sold|biki|bika|bechi|becha|bechna|mein|me|par|ka|ki|ke|aaj|today|kal|please|add|record|entry|hai|hua|hui|huye|do|dena|diya|diye|kitna|kitni|kitne|stock|bacha|bache|available|inventory)\b/gi,
        " "
    );

    // Remove extra punctuation
    result = result.replace(
        /[₹,:;!?()[\]{}]/g,
        " "
    );

    result = result
        .replace(/\s+/g, " ")
        .trim();

    return result;
}

function extractPersonName(text) {

    if (!text) return "";

    let match;

    // Aman ke naam ₹500 ka khata
    match = text.match(
        /(?:customer\s+)?([a-zA-Z\u0900-\u097F]+)\s+(?:ke\s+naam|ka|ki|ke)\s+(?:₹\s*)?\d+/i
    );

    if (match) {
        return match[1].trim();
    }

    // khata Aman ₹500
    match = text.match(
        /khata\s+(?:mein\s+)?([a-zA-Z\u0900-\u097F]+)\s+(?:₹\s*)?\d+/i
    );

    if (match) {
        return match[1].trim();
    }

    // customer Aman
    match = text.match(
        /customer\s+([a-zA-Z\u0900-\u097F]+)/i
    );

    if (match) {
        return match[1].trim();
    }

    // naam Aman
    match = text.match(
        /(?:naam|name)\s+([a-zA-Z\u0900-\u097F]+)/i
    );

    if (match) {
        return match[1].trim();
    }

    return "";
}


// ===============================
// MESSAGE ACTIONS
// ===============================

async function processMessage(rawText) {

    const text = String(rawText || "").trim();

    if (!text) {
        return;
    }

    addChatMessage(text, "user");

    try {

        const lower = text.toLowerCase();


        // ==========================================
        // 1. PURCHASE
        // Example:
        // 50 chips ₹4.12 mein kharide
        // ==========================================

        const purchaseWords =
            /\b(kharid|kharida|kharide|purchase|purchased|buy|bought|liya|liye)\b/i;

        if (
            purchaseWords.test(text) &&
            !/\b(stock|sale hui|biki|bechi)\b/i.test(text)
        ) {

            const quantity =
                extractQuantity(text);

            const price =
                extractMoney(text);

            const product =
                extractProduct(text);

            if (!quantity || price === null || !product) {

                addChatMessage(
                    "Purchase record karne ke liye product, quantity aur purchase price chahiye. Example: 50 chips ₹4.12 mein kharide.",
                    "assistant"
                );

                return;
            }

            const data = await addPurchase(
                product,
                quantity,
                price
            );

            addChatMessage(
                `${quantity} ${product} purchase record ho gaya. Total purchase cost ${money(data.purchase.total)} hai.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 2. SALE ENTRY
        // Example:
        // 10 chips ₹5 mein beche
        // ==========================================

        const saleEntryWords =
            /\b(bech|becha|bechi|beche|sell|sold|biki|bika|biki)\b/i;

        if (
            saleEntryWords.test(text) &&
            !/\bkitni|kitna|aaj ki|today ki|report|total\b/i.test(text)
        ) {

            const quantity =
                extractQuantity(text);

            const price =
                extractMoney(text);

            const product =
                extractProduct(text);

            if (!quantity || price === null || !product) {

                addChatMessage(
                    "Sale record karne ke liye product, quantity aur selling price chahiye. Example: 10 chips ₹5 mein beche.",
                    "assistant"
                );

                return;
            }

            try {

                const data = await addSale(
                    product,
                    quantity,
                    price
                );

                const sale = data.sale;

                addChatMessage(
                    `${quantity} ${product} ki sale record ho gayi. Revenue ${money(sale.revenue)} aur gross profit ${money(sale.grossProfit)} hai.`,
                    "assistant"
                );

            } catch (error) {

                addChatMessage(
                    error.message,
                    "assistant"
                );
            }

            return;
        }


        // ==========================================
        // 3. EXPENSE
        // Example:
        // aaj electricity ₹500 expense
        // ==========================================

        const expenseWords =
            /\b(expense|kharcha|kharacha|spent|spend)\b/i;

        if (expenseWords.test(text)) {

            const amount =
                extractMoney(text);

            let description =
                extractProduct(text);

            description =
                description
                    .replace(
                        /\b(expense|kharcha|kharacha|spent|spend)\b/gi,
                        ""
                    )
                    .trim();

            if (!amount || !description) {

                addChatMessage(
                    "Expense ke liye description aur amount chahiye. Example: electricity ₹500 expense.",
                    "assistant"
                );

                return;
            }

            const data = await addExpense(
                description,
                amount
            );

            addChatMessage(
                `${description} ka ${money(data.expense.amount)} expense record ho gaya.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 4. KHATA
        // ==========================================

        const khataWords =
            /\b(khata|udhar|jama|payment)\b/i;

        if (khataWords.test(text)) {

            const amount =
                extractMoney(text);

            const customer =
                extractPersonName(text);

            let type = "credit";

            if (
                /\b(payment|jama|wapas|mila|mili|diya)\b/i.test(text)
            ) {
                type = "payment";
            }

            if (!customer || amount === null) {

                addChatMessage(
                    "Khata ke liye customer ka naam aur amount chahiye. Example: Aman ke naam ₹500 ka khata.",
                    "assistant"
                );

                return;
            }

            const data = await addKhata(
                customer,
                type,
                amount,
                ""
            );

            const action =
                type === "payment"
                    ? "payment"
                    : "udhar";

            addChatMessage(
                `${customer} ka ${money(data.entry.amount)} ${action} Khata mein record ho gaya.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 5. STOCK QUERY
        // Example:
        // chips ka stock kitna hai?
        // ==========================================

        if (
            /\b(stock|inventory)\b/i.test(text) &&
            !/\badd|purchase|kharid\b/i.test(text)
        ) {

            let product =
                extractProduct(text);

            if (!product) {

                const data =
                    await api("/api/stock");

                if (!data.stock.length) {

                    addChatMessage(
                        "Abhi koi stock available nahi hai.",
                        "assistant"
                    );

                    return;
                }

                let message =
                    "Current stock:\n";

                data.stock.forEach(item => {

                    message +=
                        `${item.product}: ${item.quantity} units (${money(item.inventoryValue)})\n`;
                });

                addChatMessage(
                    message,
                    "assistant"
                );

                return;
            }

            const data =
                await getProductStock(product);

            addChatMessage(
                `${data.product} ka current stock ${data.quantity} units hai. Inventory value ${money(data.inventoryValue)} hai.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 6. TODAY'S SALES
        // ==========================================

        if (
            /\b(aaj|today)\b/i.test(text) &&
            /\b(sale|sales|bikri|bika|biki|becha|bechi)\b/i.test(text)
        ) {

            const data = await api(
                `/api/reports/daily-sales?date=${getLocalDate()}`
            );

            if (!data.sales.length) {

                addChatMessage(
                    "Aaj abhi koi sale record nahi hui.",
                    "assistant"
                );

                return;
            }

            let message =
                `Aaj ki total sale ${money(data.totalRevenue)} hai.\n\n`;

            data.sales.forEach(sale => {

                message +=
                    `${sale.product}: ${sale.quantity} units, revenue ${money(sale.revenue)}, profit ${money(sale.grossProfit)}\n`;
            });

            addChatMessage(
                message,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 7. DAILY PROFIT
        // ==========================================

        if (
            /\b(aaj|today|daily|din)\b/i.test(text) &&
            /\b(profit|munafa|kamai)\b/i.test(text)
        ) {

            const data = await api(
                `/api/reports/daily?date=${getLocalDate()}`
            );

            addChatMessage(
                `Aaj revenue ${money(data.sales.revenue)} hai, COGS ${money(data.sales.cogs)}, expenses ${money(data.expenses)}, aur net profit ${money(data.netProfit)} hai.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 8. MONTHLY PROFIT
        // ==========================================

        if (
            /\b(month|monthly|mahina|mahine)\b/i.test(text) &&
            /\b(profit|munafa|kamai)\b/i.test(text)
        ) {

            const data = await api(
                `/api/reports/monthly?month=${getLocalMonth()}`
            );

            addChatMessage(
                `Is month revenue ${money(data.sales.revenue)} hai, COGS ${money(data.sales.cogs)}, expenses ${money(data.expenses)}, aur net profit ${money(data.netProfit)} hai.`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 9. GENERAL HELP
        // ==========================================

        if (
            /\b(help|madad|kya kar sakte|what can you do)\b/i.test(text)
        ) {

            addChatMessage(
                `Main aapke shop records manage karne mein help kar sakta hoon.

Aap bol sakte ho:
• 50 chips ₹4.12 mein kharide
• 10 chips ₹5 mein beche
• electricity ₹500 expense
• Aman ke naam ₹500 ka khata
• chips ka stock kitna hai?
• aaj kitni sale hui?
• aaj ka profit kitna hai?
• is month ka profit kitna hai?`,
                "assistant"
            );

            return;
        }


        // ==========================================
        // 10. FALLBACK
        // ==========================================

        addChatMessage(
            "Main is message ko abhi business command ke roop mein samajh nahi paaya. Purchase, sale, expense, Khata, stock ya profit ke baare mein pooch sakte ho.",
            "assistant"
        );

    } catch (error) {

        console.error("Message processing error:", error);

        addChatMessage(
            "Error: " + error.message,
            "assistant"
        );
    }
}


// ===============================
// CHAT UI
// ===============================

function addChatMessage(message, sender = "assistant") {

    const chat = $("chat");

    if (!chat) return;

    const div =
        document.createElement("div");

    div.className =
        `chat-message ${sender}`;

    div.textContent = message;

    chat.appendChild(div);

    chat.scrollTop =
        chat.scrollHeight;
}

async function sendMessage() {

    const input = $("message");

    if (!input) return;

    const text =
        input.value.trim();

    if (!text) return;

    input.value = "";

    await processMessage(text);
}


// ===============================
// VOICE ASSISTANT
// ===============================

function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        showMessage(
            "Aapke browser mein voice recognition supported nahi hai.",
            "error"
        );

        return;
    }

    recognition =
        new SpeechRecognition();

    recognition.lang = "hi-IN";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {

        showMessage(
            "🎙️ Sun raha hoon..."
        );
    };

    recognition.onresult = async event => {

        const text =
            event.results[0][0].transcript;

        if ($("message")) {
            $("message").value = text;
        }

        await processMessage(text);
    };

    recognition.onerror = event => {

        showMessage(
            "Voice error: " + event.error,
            "error"
        );
    };

    recognition.onend = () => {

        console.log("Voice recognition ended.");
    };

    recognition.start();
}

function stopVoice() {

    if (recognition) {

        recognition.stop();

        recognition = null;
    }
}


// ===============================
// SETTINGS
// ===============================

function renderSettings() {

    const detail = $("settingsDetail");

    if (!detail) return;

    const user =
        currentUser ||
        JSON.parse(
            localStorage.getItem(USER_KEY) || "null"
        );

    const name =
        user?.name || "";

    const shopName =
        user?.shop_name || "";

    const language =
        user?.language || "Hindi";

    detail.innerHTML = `

        <div class="settings-card">

            <h2>Profile</h2>

            <label>Name</label>

            <input
                id="profileName"
                value="${escapeAttribute(name)}"
            >

            <label>Shop Name</label>

            <input
                id="profileShop"
                value="${escapeAttribute(shopName)}"
            >

            <button onclick="updateProfile()">
                Save Profile
            </button>

        </div>


        <div class="settings-card">

            <h2>Language</h2>

            <select id="languageSelect">

                <option
                    value="Hindi"
                    ${language === "Hindi" ? "selected" : ""}
                >
                    Hindi
                </option>

                <option
                    value="English"
                    ${language === "English" ? "selected" : ""}
                >
                    English
                </option>

                <option
                    value="Bengali"
                    ${language === "Bengali" ? "selected" : ""}
                >
                    Bengali
                </option>

            </select>

            <button onclick="saveLanguage()">
                Save Language
            </button>

        </div>


        <div class="settings-card">

            <h2>Subscription</h2>

            <p>
                First month free.
            </p>

            <p>
                Monthly plan: ₹399
            </p>

            <p>
                Annual plan: ₹3432
            </p>

        </div>


        <div class="settings-card">

            <h2>Account</h2>

            <button onclick="logoutUser()">
                Logout
            </button>

        </div>

    `;
}

async function saveLanguage() {

    const language =
        $("languageSelect")?.value;

    if (!language || !currentUser) {
        return;
    }

    try {

        const data = await api("/api/profile", {

            method: "PUT",

            body: JSON.stringify({
                name: currentUser.name,
                shopName: currentUser.shop_name,
                language
            })
        });

        if (data.user) {

            currentUser = data.user;

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );
        }

        showMessage(
            "Language saved successfully.",
            "success"
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );
    }
}


// ===============================
// BACKUP
// ===============================

async function createBackup() {

    try {

        const [
            stock,
            dailySales,
            dailyReport
        ] = await Promise.all([

            api("/api/stock"),

            api(
                `/api/reports/daily-sales?date=${getLocalDate()}`
            ),

            api(
                `/api/reports/daily?date=${getLocalDate()}`
            )

        ]);

        const backup = {

            exportedAt:
                new Date().toISOString(),

            user: currentUser,

            stock: stock.stock,

            todaySales:
                dailySales.sales,

            todayReport:
                dailyReport
        };

        const blob =
            new Blob(
                [JSON.stringify(backup, null, 2)],
                {
                    type: "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            `dukaan-manager-backup-${getLocalDate()}.json`;

        a.click();

        URL.revokeObjectURL(url);

        showMessage(
            "Backup file create ho gaya.",
            "success"
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );
    }
}


// ===============================
// FORGOT PASSWORD
// ===============================

function forgotPassword() {

    showMessage(
        "Forgot password system next backend update mein add karenge.",
        "warning"
    );
}


// ===============================
// HTML SAFETY
// ===============================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {

    return escapeHTML(value);
}


// ===============================
// BUTTON / EVENT AUTO CONNECT
// ===============================

function connectEvents() {

    // Login button
    const loginButton =
        $("loginButton");

    if (loginButton) {

        loginButton.onclick =
            loginUser;
    }


    // Register button
    const registerButton =
        $("registerButton");

    if (registerButton) {

        registerButton.onclick =
            registerUser;
    }


    // Login/Register switch buttons
    const showRegisterButton =
        $("showRegisterButton");

    if (showRegisterButton) {

        showRegisterButton.onclick =
            showRegister;
    }


    const showLoginButton =
        $("showLoginButton");

    if (showLoginButton) {

        showLoginButton.onclick =
            showLogin;
    }


    // Main message box
    const message =
        $("message");

    if (message) {

        message.addEventListener(
            "keydown",
            async event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    await sendMessage();
                }
            }
        );
    }


    // Send button
    const sendButton =
        $("sendButton");

    if (sendButton) {

        sendButton.onclick =
            sendMessage;
    }


    // Voice button
    const voiceButton =
        $("voiceButton");

    if (voiceButton) {

        voiceButton.onclick =
            startVoice;
    }
}


// ===============================
// AUTO LOGIN
// ===============================

async function autoLogin() {

    const token =
        getToken();

    if (!token) {

        showAuth();

        return;
    }

    try {

        await loadProfile();

        openMainApp();

    } catch (error) {

        console.log(
            "Auto login failed:",
            error.message
        );

        clearToken();

        showAuth();
    }
}


// ===============================
// START APP
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        connectEvents();

        autoLogin();

    }
);


// ===============================
// GLOBAL FUNCTIONS
// HTML onclick KE LIYE
// ===============================

window.showAuth = showAuth;
window.showRegister = showRegister;
window.showLogin = showLogin;

window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;

window.goHome = goHome;
window.showSettings = showSettings;
window.openPage = openPage;

window.openDailySales = openDailySales;
window.openPurchasePage = openPurchasePage;
window.manualPurchase = manualPurchase;

window.openSalePage = openSalePage;
window.manualSale = manualSale;

window.openStockPage = openStockPage;

window.openExpensePage = openExpensePage;
window.manualExpense = manualExpense;

window.openDailyProfit = openDailyProfit;
window.openMonthlyReport = openMonthlyReport;

window.openKhataPage = openKhataPage;
window.manualKhata = manualKhata;

window.sendMessage = sendMessage;

window.startVoice = startVoice;
window.stopVoice = stopVoice;

window.saveLanguage = saveLanguage;
window.updateProfile = updateProfile;

window.createBackup = createBackup;
window.forgotPassword = forgotPassword;
