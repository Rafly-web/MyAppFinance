/**
 * ==========================================================================
 * FINANCELY CORE ENGINE - ARCHITECTURE WITH STATE MANAGEMENT & VANILLA JS
 * ==========================================================================
 * Arsitektur berkas ini mengatur alur data (State), interaksi UI (DOM),
 * validasi anggaran (Budgeting), serta integrasi grafik dinamis (Chart.js).
 * Dioptimalkan khusus untuk perangkat mobile dengan efisiensi memori tinggi.
 */

class FinanceApp {
    constructor() {
        // Konfigurasi Kategori Finansial Bawaan Aplikasi
        this.categories = {
            expense: ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan & Utilitas', 'Hiburan', 'Kesehatan', 'Edukasi', 'Lainnya'],
            income: ['Gaji Utama', 'Investasi', 'Proyek Sampingan', 'Pemberian', 'Lainnya']
        };

        // Skema Inisialisasi State / Memori Data Internal Awal (Mulai dari Rp 0)
        this.state = {
            transactions: [],
            wallets: [],
            budgets: [],
            savings: [],
            activeView: 'dashboard'
        };

        // Pointer Referensi Grafik Chart.js Global
        this.lineChartInstance = null;
        this.pieChartInstance = null;

        // Jalankan Bootstrapping Engine Aplikasi
        this.init();
    }

    /**
     * FUNGSI AWAL UNTUK MEMULAI SELURUH SISTEM APLIKASI
     */
    init() {
        this.loadLocalStorage();
        this.registerDOMEvents();
        this.switchView(this.state.activeView);
        this.populateSelectOptions();
        this.renderAllViews();
    }

    /**
     * SINKRONISASI DATA MEMORI INTERNAL & LOCALSTORAGE
     */
    loadLocalStorage() {
        const storedData = localStorage.getItem('financely_v3_state');
        if (storedData) {
            try {
                this.state = JSON.parse(storedData);
                // Selalu kembalikan ke halaman dashboard utama saat aplikasi dibuka kembali
                this.state.activeView = 'dashboard';
            } catch (e) {
                this.showToast('Gagal memuat memori lokal, menyetel ulang aplikasi.');
                this.resetToZero();
            }
        } else {
            // Jika memori kosong (pengguna baru), setel ke kondisi Rp 0 bersih
            this.resetToZero();
        }
    }

    /**
     * MENYIMPAN STATE BERJALAN KE DALAM MEMORI BROWSER SECARA LOKAL
     */
    saveState() {
        localStorage.setItem('financely_v3_state', JSON.stringify(this.state));
        this.renderAllViews();
    }

    /**
     * MEMAKSA SETELAN STATE KE KONDISI KOSONG TOTAL (Rp 0)
     */
    resetToZero() {
        this.state.transactions = [];
        this.state.wallets = [];
        this.state.budgets = [];
        this.state.savings = [];
        localStorage.setItem('financely_v3_state', JSON.stringify(this.state));
        this.renderAllViews();
    }

    /**
     * DATA SIMULASI DIKOSONGKAN AGAR TIDAK MENGGANGGU DATA ASLI USER
     */
    loadMockData() {
        this.resetToZero();
    }

    /**
     * EVENT BINDING MANAGER - DELEGASI KLIK DAN EVENT INPUT DOM
     */
    registerDOMEvents() {
        // Handler Klik Navigasi Bawah (Bottom Navigation Bar)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const viewTarget = btn.getAttribute('data-view');
                if (viewTarget) this.switchView(viewTarget);
            });
        });

        // Handler Klik Tombol Melayang Utama (FAB)
        const fab = document.getElementById('global-fab');
        if (fab) {
            fab.addEventListener('click', () => this.openTransactionModal());
        }

        // Handler Ubah Tema Visual (Light / Dark Mode)
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleThemeSystem());
        }

        // Pencarian Realtime & Filter Dinamis Pada Tab Transaksi
        const searchInput = document.getElementById('tx-search-input');
        if (searchInput) searchInput.addEventListener('input', () => this.renderTransactionsView());
        
        document.getElementById('filter-type-select').addEventListener('change', () => this.renderTransactionsView());
        document.getElementById('filter-category-select').addEventListener('change', () => this.renderTransactionsView());
        document.getElementById('sort-order-select').addEventListener('change', () => this.renderTransactionsView());

        // Penukaran Kategori Otomatis di Modal Berdasarkan Pilihan Pemasukan/Pengeluaran
        const typeInputs = document.querySelectorAll('input[name="tx-type"]');
        typeInputs.forEach(input => {
            input.addEventListener('change', (e) => this.updateModalCategories(e.target.value));
        });

        // Handler Unggah File Pemulihan Cadangan Data (Import JSON)
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleDataImport(e));
        }
    }

    /**
     * SPA CONTROLLER - SISTEM PERALIHAN VIEW (HALAMAN)
     */
    switchView(viewName) {
        this.state.activeView = viewName;
        
        // Sembunyikan semua kontainer halaman, aktifkan hanya halaman target
        document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
        const activeContainer = document.getElementById(`view-${viewName}`);
        if (activeContainer) activeContainer.classList.add('active');

        // Perbarui highlight visual ikon menu pada bar navigasi bawah
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Sembunyikan tombol FAB pada menu Profil/Pengaturan agar tidak menutupi informasi penting
        const fab = document.getElementById('global-fab');
        if (viewName === 'settings') {
            fab.style.transform = 'translateX(-50%) scale(0)';
        } else {
            fab.style.transform = 'translateX(-50%) scale(1)';
        }

        // Render ulang komponen grafik Chart.js setiap kali tab analisis dibuka
        if (viewName === 'stats') {
            setTimeout(() => this.renderAnalyticsCharts(), 50);
        }
    }

    /**
     * MENYUNTIKKAN PILIHAN KATEGORI KE FILTER TRANSAKSI
     */
    populateSelectOptions() {
        const catFilterSelect = document.getElementById('filter-category-select');
        if (!catFilterSelect) return;
        
        catFilterSelect.innerHTML = '<option value="all">Semua Kategori</option>';
        [...this.categories.expense, ...this.categories.income].forEach(cat => {
            catFilterSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    /**
     * PIPELINE RE-RENDER UTAMA UNTUK MEMPERBARUI SELURUH ANTARMUKA
     */
    renderAllViews() {
        this.renderDashboardCalculations();
        this.renderTransactionsView();
        this.renderWalletManagementView();
        this.renderBudgetAndSavingsView();
    }

    /**
     * LOGIKA REKAYASA FORMAT MATA UANG RUPIAH INDONESIA (IDR)
     */
    formatIDR(num) {
        return 'Rp ' + Number(num).toLocaleString('id-ID');
    }

    /**
     * PERHITUNGAN DAN RENDER DASHBOARD UTAMA
     */
    renderDashboardCalculations() {
        let totalIncome = 0;
        let totalExpense = 0;

        // Hitung akumulasi masuk-keluar dari data transaksi riil
        this.state.transactions.forEach(t => {
            const amt = parseInt(t.amount) || 0;
            if (t.type === 'income') totalIncome += amt;
            if (t.type === 'expense') totalExpense += amt;
        });

        // Hitung total saldo bersih gabungan dari seluruh nilai rekening dompet aktif
        let totalWalletBalance = this.state.wallets.reduce((acc, w) => acc + (parseInt(w.balance) || 0), 0);

        // Perbarui teks informasi keuangan di ringkasan saldo dashboard
        document.getElementById('dash-total-balance').innerText = this.formatIDR(totalWalletBalance);
        document.getElementById('dash-total-income').innerText = this.formatIDR(totalIncome);
        document.getElementById('dash-total-expense').innerText = this.formatIDR(totalExpense);

        // Cetak Widget Dompet Horisontal di Dashboard
        const dashWalletList = document.getElementById('dash-wallets-list');
        dashWalletList.innerHTML = '';
        if (this.state.wallets.length === 0) {
            dashWalletList.innerHTML = '<p class="text-xs text-muted padding-md w-full text-center">Belum ada akun dompet. Silakan buat dahulu.</p>';
        } else {
            this.state.wallets.forEach(w => {
                dashWalletList.innerHTML += `
                    <div class="wallet-mini-card" style="border-left-color: ${w.color}">
                        <p class="text-xs text-muted weight-medium">${w.name}</p>
                        <h4 class="text-sm weight-bold margin-top-xs">${this.formatIDR(w.balance)}</h4>
                    </div>
                `;
            });
        }

        // Cetak Pantauan Budget di Dashboard
        const dashBudgetStack = document.getElementById('dash-budget-stack');
        dashBudgetStack.innerHTML = '';
        const budgetLimits = this.state.budgets.slice(0, 2);

        if (budgetLimits.length === 0) {
            dashBudgetStack.innerHTML = `
                <div class="list-item-card">
                    <p class="text-xs text-muted">Belum ada batas anggaran yang Anda atur.</p>
                </div>
            `;
        } else {
            budgetLimits.forEach(b => {
                const spent = this.state.transactions
                    .filter(t => t.type === 'expense' && t.category === b.category)
                    .reduce((acc, t) => acc + parseInt(t.amount), 0);
                
                const percent = b.limit > 0 ? Math.min(Math.round((spent / b.limit) * 100), 100) : 0;
                const barColor = percent >= 90 ? 'var(--color-expense)' : 'var(--md-primary)';

                dashBudgetStack.innerHTML += `
                    <div class="list-item-card" style="flex-direction: column; align-items: stretch; gap: 4px;">
                        <div style="display: flex; justify-content: space-between;" class="text-xs">
                            <span class="weight-bold">${b.category}</span>
                            <span class="text-muted">${this.formatIDR(spent)} / ${this.formatIDR(b.limit)}</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${percent}%; background-color: ${barColor}"></div>
                        </div>
                    </div>
                `;
            });
        }

        // Cetak Feed 3 Riwayat Transaksi Paling Gress
        const dashRecentContainer = document.getElementById('dash-recent-transactions');
        dashRecentContainer.innerHTML = '';
        const sortedRecent = [...this.state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

        if (sortedRecent.length === 0) {
            dashRecentContainer.innerHTML = '<p class="text-xs text-muted padding-md text-center">Belum ada catatan transaksi masuk/keluar.</p>';
        } else {
            sortedRecent.forEach(t => {
                const isInc = t.type === 'income';
                const icon = isInc ? 'arrow_downward' : 'arrow_upward';
                const colorClass = isInc ? 'text-success' : 'text-error';
                const bgIcon = isInc ? 'var(--color-income-container)' : 'var(--color-expense-container)';

                dashRecentContainer.innerHTML += `
                    <div class="list-item-card">
                        <div class="lic-left">
                            <div class="lic-icon-wrapper" style="background-color: ${bgIcon}; color: ${isInc ? 'var(--color-income)' : 'var(--color-expense)'}">
                                <span class="material-icons-round">${icon}</span>
                            </div>
                            <div class="lic-text-block">
                                <span class="text-sm weight-bold">${t.description}</span>
                                <span class="text-xs text-muted">${t.category} • ${t.date}</span>
                            </div>
                        </div>
                        <div class="lic-right">
                            <span class="text-sm weight-bold ${colorClass}">${isInc ? '+' : '-'}${this.formatIDR(t.amount)}</span>
                        </div>
                    </div>
                `;
            });
        }
    }

    /**
     * PROSES FILTERISASI, REALTIME SEARCH, DAN MANAGEMENT DATA UTAMA TRANSAKSI
     */
    renderTransactionsView() {
        const listContainer = document.getElementById('tx-full-history-list');
        if (!listContainer) return;

        const searchQuery = document.getElementById('tx-search-input').value.toLowerCase();
        const filterType = document.getElementById('filter-type-select').value;
        const filterCat = document.getElementById('filter-category-select').value;
        const sortOrder = document.getElementById('sort-order-select').value;

        // Eksekusi Pipeline Pemfilteran Komponen
        let results = this.state.transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchQuery) || t.category.toLowerCase().includes(searchQuery);
            const matchesType = filterType === 'all' || t.type === filterType;
            const matchesCat = filterCat === 'all' || t.category === filterCat;
            return matchesSearch && matchesType && matchesCat;
        });

        // Eksekusi Urutan Pengurutan (Sorting)
        if (sortOrder === 'newest') results.sort((a,b) => new Date(b.date) - new Date(a.date));
        if (sortOrder === 'oldest') results.sort((a,b) => new Date(a.date) - new Date(b.date));
        if (sortOrder === 'highest') results.sort((a,b) => b.amount - a.amount);

        listContainer.innerHTML = '';
        if (results.length === 0) {
            listContainer.innerHTML = '<p class="text-xs text-muted padding-md text-center">Catatan riwayat tidak ditemukan.</p>';
            return;
        }

        results.forEach(t => {
            const isInc = t.type === 'income';
            const icon = isInc ? 'arrow_downward' : 'arrow_upward';
            const colorClass = isInc ? 'text-success' : 'text-error';
            const bgIcon = isInc ? 'var(--color-income-container)' : 'var(--color-expense-container)';

            listContainer.innerHTML += `
                <div class="list-item-card">
                    <div class="lic-left">
                        <div class="lic-icon-wrapper" style="background-color: ${bgIcon}; color: ${isInc ? 'var(--color-income)' : 'var(--color-expense)'}">
                            <span class="material-icons-round">${icon}</span>
                        </div>
                        <div class="lic-text-block">
                            <span class="text-sm weight-bold">${t.description}</span>
                            <span class="text-xs text-muted">${t.category} • ${t.date}</span>
                        </div>
                    </div>
                    <div class="lic-right">
                        <span class="text-sm weight-bold ${colorClass}">${isInc ? '+' : '-'}${this.formatIDR(t.amount)}</span>
                        <div style="display:flex; gap:12px; margin-top:6px;">
                            <span class="material-icons-round text-primary text-xs" style="cursor:pointer; font-size:18px;" onclick="app.editTransaction('${t.id}')">edit</span>
                            <span class="material-icons-round text-error text-xs" style="cursor:pointer; font-size:18px;" onclick="app.deleteTransaction('${t.id}')">delete</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    /**
     * RENDER MANAGEMENT AKUN DOMPET & REKENING BANK
     */
    renderWalletManagementView() {
        const container = document.getElementById('wallets-management-list');
        if (!container) return;

        container.innerHTML = '';
        if (this.state.wallets.length === 0) {
            container.innerHTML = '<p class="text-xs text-muted padding-md text-center">Belum ada akun finansial terdaftar.</p>';
            return;
        }

        this.state.wallets.forEach(w => {
            let icon = 'account_balance';
            if (w.type === 'cash') icon = 'payments';
            if (w.type === 'wallet') icon = 'smartphone';

            container.innerHTML += `
                <div class="list-item-card" style="border-left: 6px solid ${w.color}">
                    <div class="lic-left">
                        <div class="lic-icon-wrapper" style="background-color: var(--md-surface-variant)">
                            <span class="material-icons-round" style="color: ${w.color}">${icon}</span>
                        </div>
                        <div class="lic-text-block">
                            <span class="text-sm weight-bold">${w.name}</span>
                            <span class="text-xs text-muted uppercase">${w.type}</span>
                        </div>
                    </div>
                    <div class="lic-right">
                        <span class="text-sm weight-bold">${this.formatIDR(w.balance)}</span>
                    </div>
                </div>
            `;
        });
    }

    /**
     * RENDER HALAMAN PENGATURAN BUDGET & TARGET GOALS TABUNGAN
     */
    renderBudgetAndSavingsView() {
        // Pemetaan Render Budget
        const bContainer = document.getElementById('budget-management-list');
        if (bContainer) {
            bContainer.innerHTML = '';
            if (this.state.budgets.length === 0) {
                bContainer.innerHTML = '<p class="text-xs text-muted padding-md text-center">Belum ada alokasi budget bulanan.</p>';
            } else {
                this.state.budgets.forEach(b => {
                    const spent = this.state.transactions
                        .filter(t => t.type === 'expense' && t.category === b.category)
                        .reduce((acc, t) => acc + parseInt(t.amount), 0);
                    const percent = b.limit > 0 ? Math.min(Math.round((spent / b.limit) * 100), 100) : 0;
                    
                    bContainer.innerHTML += `
                        <div class="list-item-card" style="flex-direction: column; align-items: stretch; gap: 6px;">
                            <div style="display:flex; justify-content:space-between;" class="text-sm">
                                <span class="weight-bold">${b.category}</span>
                                <span class="text-error weight-medium">${percent}% Terpakai</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${percent}%; background-color: ${percent >= 90 ? 'var(--color-expense)' : 'var(--md-primary)'}"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-top:2px;" class="text-xs text-muted">
                                <span>Terpakai: ${this.formatIDR(spent)}</span>
                                <span>Batas: ${this.formatIDR(b.limit)}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // Pemetaan Render Target Celengan Tabungan (Goals)
        const sContainer = document.getElementById('savings-management-list');
        if (sContainer) {
            sContainer.innerHTML = '';
            if (this.state.savings.length === 0) {
                sContainer.innerHTML = '<p class="text-xs text-muted padding-md text-center">Belum ada resolusi target tabungan.</p>';
            } else {
                this.state.savings.forEach(s => {
                    const pct = s.target > 0 ? Math.min(Math.round((s.current / s.target) * 100), 100) : 0;
                    sContainer.innerHTML += `
                        <div class="list-item-card" style="flex-direction: column; align-items: stretch; gap: 6px;">
                            <div style="display:flex; justify-content:space-between;" class="text-sm">
                                <span class="weight-bold">${s.name}</span>
                                <span class="text-success weight-medium">${pct}%</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${pct}%; background-color: var(--color-income)"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between;" class="text-xs text-muted">
                                <span>Terkumpul: ${this.formatIDR(s.current)}</span>
                                <span>Target: ${this.formatIDR(s.target)}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    /**
     * VISUALISASI DATA ANALISIS MENGGUNAKAN LIBRARY CHART.JS
     */
    renderAnalyticsCharts() {
        // Render 1. Grafik Arus Kas Line Chart
        const ctxLine = document.getElementById('analyticsLineChart');
        if (ctxLine) {
            if (this.lineChartInstance) this.lineChartInstance.destroy();
            
            // Pengelompokan data dinamis berdasarkan tanggal unik transaksi berjalan
            const dateLabels = [...new Set(this.state.transactions.map(t => t.date))].sort().slice(-5);
            
            let incomePoints = [];
            let expensePoints = [];
            
            if (dateLabels.length === 0) {
                dateLabels.push('Tidak Ada Data');
                incomePoints.push(0);
                expensePoints.push(0);
            } else {
                dateLabels.forEach(d => {
                    const incAmt = this.state.transactions.filter(t => t.date === d && t.type === 'income').reduce((a,c) => a + parseInt(c.amount), 0);
                    const expAmt = this.state.transactions.filter(t => t.date === d && t.type === 'expense').reduce((a,c) => a + parseInt(c.amount), 0);
                    incomePoints.push(incAmt);
                    expensePoints.push(expAmt);
                });
            }

            this.lineChartInstance = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [
                        { label: 'Masuk', data: incomePoints, borderColor: '#386A20', backgroundColor: '#386A20', tension: 0.2, fill: false },
                        { label: 'Keluar', data: expensePoints, borderColor: '#BA1A1A', backgroundColor: '#BA1A1A', tension: 0.2, fill: false }
                    ]
                },
                options: { responsive: true, plugins: { legend: { labels: { boxWidth: 12 } } } }
            });
        }

        // Render 2. Grafik Distribusi Alokasi Kategori Donat Chart (Doughnut)
        const ctxPie = document.getElementById('analyticsPieChart');
        if (ctxPie) {
            if (this.pieChartInstance) this.pieChartInstance.destroy();

            const dataMap = {};
            this.state.transactions.filter(t => t.type === 'expense').forEach(t => {
                dataMap[t.category] = (dataMap[t.category] || 0) + parseInt(t.amount);
            });

            const labels = Object.keys(dataMap);
            const dataValues = Object.values(dataMap);

            this.pieChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: labels.length ? labels : ['Kosong'],
                    datasets: [{
                        data: dataValues.length ? dataValues : [1],
                        backgroundColor: ['#6750A4', '#006874', '#386A20', '#A63E2B', '#FFB4AB', '#938F99', '#EADDFF']
                    }]
                },
                options: { responsive: true }
            });

            // Urutkan List Ranking Kategori Sesuai Pengeluaran Terbesar
            const rankContainer = document.getElementById('stats-category-ranking');
            if (rankContainer) {
                rankContainer.innerHTML = '';
                const sortedRank = Object.entries(dataMap).sort((a,b) => b[1] - a[1]);
                if (!sortedRank.length) {
                    rankContainer.innerHTML = '<p class="text-xs text-muted text-center padding-md">Belum ada alokasi pengeluaran terdeteksi.</p>';
                } else {
                    sortedRank.forEach(([cat, val]) => {
                        rankContainer.innerHTML += `
                            <div class="list-item-card">
                                <span class="text-sm weight-bold">${cat}</span>
                                <span class="text-sm weight-medium text-error">${this.formatIDR(val)}</span>
                            </div>
                        `;
                    });
                }
            }
        }
    }

    /**
     * KONTROL INTERAKSI DAN VALIDASI MODAL SHEET DIALOG
     */
    openTransactionModal() {
        if (this.state.wallets.length === 0) {
            alert('⚠️ Akses Ditolak: Anda wajib membuat sekurang-kurangnya satu buah akun Dompet/Rekening dahulu di menu utama sebelum mencatat transaksi.');
            this.switchView('wallets');
            return;
        }
        document.getElementById('tx-edit-id').value = '';
        document.getElementById('transaction-form').reset();
        document.getElementById('tx-modal-title').innerText = 'Catat Transaksi Baru';
        this.updateModalCategories('expense');
        this.updateModalWallets();
        document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
        this.openModal('modal-transaction');
    }

    openQuickAdd(type) {
        if (this.state.wallets.length === 0) {
            alert('⚠️ Anda wajib memiliki akun Dompet terlebih dahulu.');
            this.switchView('wallets');
            return;
        }
        this.openTransactionModal();
        document.getElementById(`type-${type}`).checked = true;
        this.updateModalCategories(type);
    }

    openWalletModal() { document.getElementById('wallet-form').reset(); this.openModal('modal-wallet'); }
    
    openBudgetModal() {
        const select = document.getElementById('bud-category');
        select.innerHTML = '';
        this.categories.expense.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
        document.getElementById('budget-form').reset();
        this.openModal('modal-budget');
    }
    
    openSavingModal() { document.getElementById('saving-form').reset(); this.openModal('modal-saving'); }

    openModal(id) { document.getElementById(id).classList.add('open'); }
    closeModal(id) { document.getElementById(id).classList.remove('open'); }

    updateModalCategories(type) {
        const select = document.getElementById('tx-category');
        if (!select) return;
        select.innerHTML = '';
        this.categories[type].forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    updateModalWallets() {
        const select = document.getElementById('tx-wallet');
        if (!select) return;
        select.innerHTML = '';
        this.state.wallets.forEach(w => {
            select.innerHTML += `<option value="${w.id}">${w.name} (${this.formatIDR(w.balance)})</option>`;
        });
    }

    /**
     * MUTASI STATE: SUBMIT CATATAN TRANSAKSI (CREATE / UPDATE LOGIC)
     */
    handleTransactionSubmit(e) {
        e.preventDefault();
        const editId = document.getElementById('tx-edit-id').value;
        const type = document.querySelector('input[name="tx-type"]:checked').value;
        const amount = parseInt(document.getElementById('tx-amount').value);
        const category = document.getElementById('tx-category').value;
        const walletId = document.getElementById('tx-wallet').value;
        const date = document.getElementById('tx-date').value;
        const description = document.getElementById('tx-description').value.trim() || category;

        const wallet = this.state.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showToast('Akun dompet tidak valid.');
            return;
        }

        if (editId) {
            // EKSEKUSI SKEMA MODIFIKASI DATA (EDIT MODE)
            const idx = this.state.transactions.findIndex(t => t.id === editId);
            if (idx !== -1) {
                const oldTx = this.state.transactions[idx];
                const oldWallet = this.state.wallets.find(w => w.id === oldTx.wallet);
                
                // Rollback (kembalikan) efek nilai saldo dompet lama
                if (oldWallet) {
                    if (oldTx.type === 'income') oldWallet.balance -= oldTx.amount;
                    if (oldTx.type === 'expense') oldWallet.balance += oldTx.amount;
                }

                // Masukkan data mutasi baru kedalam state array
                this.state.transactions[idx] = { id: editId, type, amount, category, wallet: walletId, date, description };
                
                // Kalkulasikan efek saldo ke akun dompet yang baru dipilih
                if (type === 'income') wallet.balance += amount;
                if (type === 'expense') wallet.balance -= amount;

                this.showToast('Catatan diperbarui dengan sukses.');
            }
        } else {
            // EKSEKUSI SKEMA PEMBUATAN DATA BARU (CREATE MODE)
            const newTx = {
                id: 't-' + Date.now(),
                type, amount, category, wallet: walletId, date, description
            };

            if (type === 'income') wallet.balance += amount;
            if (type === 'expense') {
                wallet.balance -= amount;
                this.checkBudgetWarning(category, amount);
            }

            this.state.transactions.push(newTx);
            this.showToast('Berhasil menambahkan transaksi.');
        }

        this.closeModal('modal-transaction');
        this.saveState();
    }

    /**
     * MUTASI STATE: EDIT & HAPUS ELEMENT DATA TRANSAKSI
     */
    editTransaction(id) {
        const t = this.state.transactions.find(item => item.id === id);
        if (!t) return;

        document.getElementById('tx-edit-id').value = t.id;
        document.getElementById('tx-amount').value = t.amount;
        document.getElementById('tx-date').value = t.date;
        document.getElementById('tx-description').value = t.description;
        
        document.getElementById(`type-${t.type}`).checked = true;
        this.updateModalCategories(t.type);
        document.getElementById('tx-category').value = t.category;
        
        this.updateModalWallets();
        document.getElementById('tx-wallet').value = t.wallet;

        document.getElementById('tx-modal-title').innerText = 'Ubah Catatan Transaksi';
        this.openModal('modal-transaction');
    }

    deleteTransaction(id) {
        if (confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini selamanya?')) {
            const idx = this.state.transactions.findIndex(t => t.id === id);
            if (idx !== -1) {
                const tx = this.state.transactions[idx];
                const wallet = this.state.wallets.find(w => w.id === tx.wallet);
                
                // Pulihkan saldo dompet karena transaksi ini dibatalkan/dihapus
                if (wallet) {
                    if (tx.type === 'income') wallet.balance -= tx.amount;
                    if (tx.type === 'expense') wallet.balance += tx.amount;
                }
                
                this.state.transactions.splice(idx, 1);
                this.showToast('Transaksi berhasil dihapus.');
                this.saveState();
            }
        }
    }

    /**
     * MUTASI STATE: SUBMIT PEMBUATAN DOMPET BARU
     */
    handleWalletSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('wal-name').value.trim();
        const type = document.getElementById('wal-type').value;
        const balance = parseInt(document.getElementById('wal-balance').value) || 0;
        const color = document.getElementById('wal-color').value;

        this.state.wallets.push({ id: 'w-' + Date.now(), name, type, balance, color });
        this.showToast('Akun keuangan baru berhasil didaftarkan.');
        this.closeModal('modal-wallet');
        this.saveState();
    }

    /**
     * MUTASI STATE: SET BATAS ANGGARAN BULANAN
     */
    handleBudgetSubmit(e) {
        e.preventDefault();
        const category = document.getElementById('bud-category').value;
        const limit = parseInt(document.getElementById('bud-limit').value) || 0;

        const existingIdx = this.state.budgets.findIndex(b => b.category === category);
        if (existingIdx !== -1) {
            this.state.budgets[existingIdx].limit = limit;
        } else {
            this.state.budgets.push({ id: 'b-' + Date.now(), category, limit });
        }

        this.showToast('Anggaran berhasil diperbarui.');
        this.closeModal('modal-budget');
        this.saveState();
    }

    /**
     * MUTASI STATE: MEMBUAT TARGET ANGGARAN TABUNGAN
     */
    handleSavingSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('sav-name').value.trim();
        const target = parseInt(document.getElementById('sav-target').value) || 0;
        const current = parseInt(document.getElementById('sav-current').value) || 0;

        this.state.savings.push({ id: 's-' + Date.now(), name, target, current });
        this.showToast('Target tabungan berhasil disimpan.');
        this.closeModal('modal-saving');
        this.saveState();
    }

    /**
     * VALIDASI WARNING INDIKATOR BUDGET OVERFLOW
     */
    checkBudgetWarning(category, incomingExpense) {
        const b = this.state.budgets.find(item => item.category === category);
        if (!b) return;

        const currentSpent = this.state.transactions
            .filter(t => t.type === 'expense' && t.category === category)
            .reduce((acc, t) => acc + parseInt(t.amount), 0);

        if (currentSpent + incomingExpense > b.limit) {
            alert(`⚠️ Peringatan Anggaran! Pengeluaran untuk [${category}] saat ini terdeteksi melewati batas aman bulanan Anda.`);
        }
    }

    /**
     * UTILS: INJEKSI NOTIFIKASI TOAST MATERIAL RINGAN
     */
    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, 2500);
    }

    /**
     * UTILS: TOGGLE MANAJEMEN TEMA VISUAL APLIKASI
     */
    toggleThemeSystem() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        html.setAttribute('data-theme', nextTheme);
        
        const themeBtnIcon = document.querySelector('#theme-toggle-btn span');
        if (themeBtnIcon) {
            themeBtnIcon.innerText = nextTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        this.showToast(`Beralih ke mode visual ${nextTheme}.`);
        
        if (this.state.activeView === 'stats') this.renderAnalyticsCharts();
    }

    /**
     * BACKUP UTILS: SISTEM EKSPOR LAPORAN (JSON / CSV EXCEL)
     */
    exportData(format) {
        if (this.state.transactions.length === 0 && this.state.wallets.length === 0) {
            this.showToast('Gagal ekspor: Data Anda masih kosong.');
            return;
        }

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `financely_backup_${Date.now()}.json`);
            dlAnchor.click();
            this.showToast('Berkas JSON berhasil diekspor.');
        } else if (format === 'csv') {
            let csvContent = "data:text/csv;charset=utf-8,ID,Tipe,Nominal,Kategori,Tanggal,Deskripsi\n";
            this.state.transactions.forEach(t => {
                csvContent += `${t.id},${t.type},${t.amount},${t.category},${t.date},"${t.description}"\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", encodedUri);
            dlAnchor.setAttribute("download", `laporan_keuangan_${Date.now()}.csv`);
            dlAnchor.click();
            this.showToast('Laporan CSV Excel berhasil diunduh.');
        }
    }

    /**
     * BACKUP UTILS: RECOVERY DATABASE DARI FILE CADANGAN JSON
     */
    handleDataImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed.transactions) && Array.isArray(parsed.wallets)) {
                    this.state = parsed;
                    this.saveState();
                    this.showToast('Seluruh data berhasil dipulihkan.');
                    this.switchView('dashboard');
                } else {
                    this.showToast('Format berkas cadangan JSON tidak valid.');
                }
            } catch (err) {
                this.showToast('Gagal membaca fail enkripsi data.');
            }
        };
        reader.readAsText(file);
    }

    /**
     * SYSTEM UTILS: RESET TOTAL DATA MEMORI APLIKASI
     */
    clearAllDataData() {
        if (confirm('⚠️ PERINGATAN! Tindakan ini akan menghapus permanen seluruh data keuangan lokal Anda tanpa bisa dibatalkan. Lanjutkan?')) {
            localStorage.removeItem('financely_v3_state');
            this.resetToZero();
            this.showToast('Aplikasi berhasil dibersihkan kembali ke Rp 0.');
            this.switchView('dashboard');
        }
    }
}

// Inisialisasi Instance Aplikasi Finansial Saat Runtime Dimulai
const app = new FinanceApp();
