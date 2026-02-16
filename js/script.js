// ControlCash - JavaScript Principal

// ==================== UTILIDADE DE DATA (CORREÇÃO DO BUG UTC) ====================
function parseLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se há dados salvos
    initializeLocalStorage();
    
    // Atualiza a navegação ativa
    updateActiveNav();
    
    // Carrega dados da página atual
    const page = getCurrentPage();
    if (page === 'dashboard') loadDashboard();
    if (page === 'renda') loadIncomePage();
    if (page === 'despesa') loadExpensePage();
    if (page === 'resumo') loadSummary();
    if (page === 'metas') loadGoals();
});

// Inicializa localStorage se não existir
function initializeLocalStorage() {
    if (!localStorage.getItem('incomes')) {
        localStorage.setItem('incomes', JSON.stringify([]));
    }
    if (!localStorage.getItem('expenses')) {
        localStorage.setItem('expenses', JSON.stringify([]));
    }
    if (!localStorage.getItem('goals')) {
        const defaultGoals = [
            { id: 1, name: 'Fundo de Emergência', current: 6000, target: 10000, icon: '💰' },
            { id: 2, name: 'Viagem', current: 700, target: 2000, icon: '✈️' },
            { id: 3, name: 'Curso', current: 640, target: 800, icon: '📚' }
        ];
        localStorage.setItem('goals', JSON.stringify(defaultGoals));
    }
    if (!localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify({ name: 'Usuario', email: '' }));
    }
}

// Retorna a página atual
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('renda')) return 'renda';
    if (path.includes('despesa')) return 'despesa';
    if (path.includes('resumo')) return 'resumo';
    if (path.includes('metas')) return 'metas';
    return 'login';
}

// Atualiza navegação ativa
function updateActiveNav() {
    const page = getCurrentPage();
    document.querySelectorAll('.navbar-bottom .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') && link.getAttribute('href').includes(page)) {
            link.classList.add('active');
        }
    });
}

// Formatar moeda em Real Brasileiro
function formatCurrency(value) {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',');
}

// ==================== CUSTOM CONFIRM MODAL ====================
function showConfirmModal(title, message, onConfirm, confirmButtonText = 'Excluir') {
    // Remove qualquer confirm anterior
    document.querySelectorAll('.confirm-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h5>${title}</h5>
            <p>${message}</p>
            <div class="confirm-modal-buttons">
                <button class="confirm-btn-cancel" onclick="closeConfirmModal()">Cancelar</button>
                <button class="confirm-btn-delete" id="confirmActionBtn">${confirmButtonText}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Click fora fecha
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeConfirmModal();
        }
    });
    
    // Botão confirmar
    document.getElementById('confirmActionBtn').addEventListener('click', function() {
        closeConfirmModal();
        if (onConfirm) onConfirm();
    });
}

function closeConfirmModal() {
    document.querySelectorAll('.confirm-overlay').forEach(el => {
        el.style.animation = 'fadeIn 0.2s ease-out reverse';
        setTimeout(() => el.remove(), 200);
    });
}

// ==================== LOGIN ====================
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (email && password) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.email = email;
        if (!user.name) user.name = 'Usuario';
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = 'pages/dashboard.html';
    }
}

// ==================== SIGNUP ====================
function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('As senhas não coincidem', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'danger');
        return;
    }
    
    localStorage.setItem('user', JSON.stringify({ name, email }));
    showToast('Conta criada com sucesso!', 'success');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// ==================== DASHBOARD ====================
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{"name":"Usuario"}');
    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    
    // Atualiza saudação
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.name;
    }
    
    // Calcula saldo
    const totalIncome = incomes.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const balance = totalIncome - totalExpense;
    
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance);
    }
    
    // Calcula variação percentual em relação ao mês passado
    calculateBalanceChange(incomes, expenses);
    
    // Renderiza gráfico
    renderBarChart();
}

// Calcula e exibe a variação percentual do saldo em relação ao mês anterior
function calculateBalanceChange(incomes, expenses) {
    const balanceChangeEl = document.getElementById('balanceChange');
    if (!balanceChangeEl) return;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Mês anterior
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = currentYear - 1;
    }
    
    // Filtra transações do mês atual
    const currentMonthIncomes = incomes.filter(item => {
        if (!item.date) return false;
        const date = new Date(item.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const currentMonthExpenses = expenses.filter(item => {
        if (!item.date) return false;
        const date = new Date(item.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Filtra transações do mês anterior
    const prevMonthIncomes = incomes.filter(item => {
        if (!item.date) return false;
        const date = new Date(item.date);
        return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    });
    
    const prevMonthExpenses = expenses.filter(item => {
        if (!item.date) return false;
        const date = new Date(item.date);
        return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    });
    
    // Calcula saldos mensais (receitas - despesas)
    const currentIncome = currentMonthIncomes.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const currentExpense = currentMonthExpenses.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const currentMonthBalance = currentIncome - currentExpense;
    
    const prevIncome = prevMonthIncomes.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const prevExpense = prevMonthExpenses.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const prevMonthBalance = prevIncome - prevExpense;
    
    // Verifica se há transações específicas
    const hasCurrentIncomes = currentMonthIncomes.length > 0;
    const hasCurrentExpenses = currentMonthExpenses.length > 0;
    const hasCurrentData = hasCurrentIncomes || hasCurrentExpenses;
    
    const hasPrevIncomes = prevMonthIncomes.length > 0;
    const hasPrevExpenses = prevMonthExpenses.length > 0;
    const hasPrevData = hasPrevIncomes || hasPrevExpenses;
    
    let changeText = '';
    let changeClass = '';
    
    // Sem nenhum dado
    if (!hasCurrentData && !hasPrevData) {
        changeText = 'Sem dados para comparar';
        changeClass = '';
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Não há transações no mês anterior
    if (!hasPrevData) {
        if (!hasPrevIncomes && !hasPrevExpenses) {
            changeText = 'Sem transações no mês passado';
            changeClass = '';
        } else if (currentMonthBalance > 0) {
            changeText = 'Primeiro mês com saldo positivo!';
            changeClass = 'text-success';
        } else if (currentMonthBalance < 0) {
            changeText = 'Primeiro mês com saldo negativo';
            changeClass = 'text-danger';
        } else {
            changeText = 'Primeiro mês de registro';
            changeClass = '';
        }
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Não há transações no mês atual
    if (!hasCurrentData) {
        changeText = 'Nenhuma transação neste mês ainda';
        changeClass = '';
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Mês anterior sem despesas (só rendas)
    if (!hasPrevExpenses && hasPrevIncomes) {
        if (currentExpense > 0) {
            changeText = 'Sem despesas no mês passado';
            changeClass = '';
        } else if (currentMonthBalance >= prevMonthBalance) {
            changeText = 'Mantendo saldo positivo!';
            changeClass = 'text-success';
        } else {
            changeText = 'Saldo menor que mês passado';
            changeClass = 'text-danger';
        }
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Mês anterior sem rendas (só despesas)
    if (!hasPrevIncomes && hasPrevExpenses) {
        if (currentIncome > 0) {
            changeText = 'Sem rendas no mês passado';
            changeClass = '';
        } else {
            changeText = 'Continue registrando suas transações';
            changeClass = '';
        }
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Saldo do mês anterior era zero
    if (prevMonthBalance === 0) {
        if (currentMonthBalance > 0) {
            changeText = 'Saldo positivo este mês!';
            changeClass = 'text-success';
        } else if (currentMonthBalance < 0) {
            changeText = 'Saldo negativo este mês';
            changeClass = 'text-danger';
        } else {
            changeText = 'Saldo equilibrado';
            changeClass = '';
        }
        balanceChangeEl.textContent = changeText;
        balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
        return;
    }
    
    // Cálculo normal da porcentagem
    const percentChange = ((currentMonthBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100;
    const roundedPercent = Math.round(percentChange);
    
    if (percentChange > 0) {
        changeText = `+${roundedPercent}% em relação ao mês passado`;
        changeClass = 'text-success';
    } else if (percentChange < 0) {
        changeText = `${roundedPercent}% em relação ao mês passado`;
        changeClass = 'text-danger';
    } else {
        changeText = 'Igual ao mês passado';
        changeClass = '';
    }
    
    balanceChangeEl.textContent = changeText;
    balanceChangeEl.className = 'mb-0 opacity-75 small ' + changeClass;
}

function renderBarChart() {
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Detecta se é mobile
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth <= 768;
    
    // Labels adaptativas para mobile
    const fullLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const shortLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const labels = isMobile ? shortLabels : fullLabels;
    
    // Calcula despesas mensais reais do localStorage
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const currentYear = new Date().getFullYear();
    
    // Agrupa despesas por mês
    const monthlyExpenses = new Array(12).fill(0);
    expenses.forEach(expense => {
        if (expense.date) {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getFullYear() === currentYear) {
                const month = expenseDate.getMonth();
                monthlyExpenses[month] += parseFloat(expense.value || 0);
            }
        }
    });
    
    const data = monthlyExpenses;
    const hasData = data.some(value => value > 0);
    
    // Obtém dimensões do container pai
    const container = canvas.parentElement;
    const containerWidth = container.offsetWidth;
    const containerHeight = isMobile ? 220 : (isTablet ? 250 : 280);
    
    // Configuração responsiva
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';
    ctx.scale(dpr, dpr);
    
    const maxValue = hasData ? Math.max(...data) : 1000;
    
    // Padding adaptativo
    const padding = {
        top: isMobile ? 25 : 20,
        right: isMobile ? 10 : 20,
        bottom: isMobile ? 30 : 40,
        left: isMobile ? 10 : 20
    };
    
    const chartWidth = containerWidth - padding.left - padding.right;
    const chartHeight = containerHeight - padding.top - padding.bottom;
    
    // Calcula largura das barras dinamicamente
    const totalBars = data.length;
    const spacing = isMobile ? chartWidth * 0.015 : chartWidth * 0.02;
    const barWidth = (chartWidth - (spacing * (totalBars - 1))) / totalBars;
    
    // Limpa canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);
    
    // Fontes adaptativas
    const labelFont = isMobile ? '9px sans-serif' : (isTablet ? '10px sans-serif' : '11px sans-serif');
    const valueFont = isMobile ? '8px sans-serif' : '10px sans-serif';
    const messageFont = isMobile ? '12px sans-serif' : '14px sans-serif';
    const subMessageFont = isMobile ? '10px sans-serif' : '12px sans-serif';
    
    // Se não houver dados, mostra mensagem
    if (!hasData) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = messageFont;
        ctx.textAlign = 'center';
        ctx.fillText('Adicione despesas para ver o gráfico', containerWidth / 2, containerHeight / 2 - 15);
        ctx.font = subMessageFont;
        ctx.fillText('Os dados serão exibidos por mês', containerWidth / 2, containerHeight / 2 + 10);
        
        // Desenha labels mesmo sem dados
        labels.forEach((label, index) => {
            const x = padding.left + index * (barWidth + spacing);
            ctx.fillStyle = '#94a3b8';
            ctx.font = labelFont;
            ctx.textAlign = 'center';
            ctx.fillText(label, x + barWidth / 2, containerHeight - (isMobile ? 8 : 10));
        });
        return;
    }
    
    // Desenha barras
    data.forEach((value, index) => {
        const barHeight = value > 0 ? (value / maxValue) * chartHeight : 0;
        const x = padding.left + index * (barWidth + spacing);
        const y = padding.top + chartHeight - barHeight;
        
        if (value > 0) {
            // Gradiente para as barras
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, '#3CA3FF');
            gradient.addColorStop(1, '#1E90FF');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            
            // Desenha retângulo com cantos arredondados no topo
            const radius = Math.min(isMobile ? 4 : 6, barWidth / 4);
            ctx.moveTo(x, y + radius);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.lineTo(x + barWidth, padding.top + chartHeight);
            ctx.lineTo(x + barWidth, y + radius);
            ctx.quadraticCurveTo(x + barWidth, y, x + barWidth - radius, y);
            ctx.lineTo(x + radius, y);
            ctx.quadraticCurveTo(x, y, x, y + radius);
            ctx.closePath();
            ctx.fill();
            
            // Mostra valor acima da barra (somente se houver espaço suficiente)
            if (barHeight > 20 || !isMobile) {
                ctx.fillStyle = '#3CA3FF';
                ctx.font = valueFont;
                ctx.textAlign = 'center';
                
                // Formata valor de forma compacta para mobile
                let displayValue;
                if (isMobile && value >= 1000) {
                    displayValue = (value / 1000).toFixed(1) + 'k';
                } else {
                    displayValue = formatCurrency(value).replace('R$ ', '');
                }
                ctx.fillText(displayValue, x + barWidth / 2, y - (isMobile ? 3 : 5));
            }
        }
        
        // Label do mês
        ctx.fillStyle = '#94a3b8';
        ctx.font = labelFont;
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth / 2, containerHeight - (isMobile ? 8 : 10));
    });
}

// Redimensiona gráfico quando a janela muda de tamanho
window.addEventListener('resize', function() {
    if (getCurrentPage() === 'dashboard') {
        renderBarChart();
    }
});

// ==================== PÁGINA DE RENDA ====================
function loadIncomePage() {
    const dateInput = document.getElementById('incomeDate');

    // Data padrão (local, sem bug UTC)
    if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    renderIncomeHistory();
}

function renderIncomeHistory() {
    const container = document.getElementById('incomeHistory');
    if (!container) return;

    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');

    if (incomes.length === 0) {
        container.innerHTML = '<p class="text-muted-custom text-center">Nenhuma renda registrada</p>';
        return;
    }

    // Ordena do mais recente para o mais antigo (DATA LOCAL)
    const sortedIncomes = [...incomes].sort(
        (a, b) => parseLocalDate(b.date) - parseLocalDate(a.date)
    );

    // Agrupa por mês/ano
    const groupedByMonth = {};
    sortedIncomes.forEach(income => {
        const date = parseLocalDate(income.date);
        if (!date) return;

        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groupedByMonth[monthYear]) {
            groupedByMonth[monthYear] = [];
        }
        groupedByMonth[monthYear].push(income);
    });

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let html = '<h2 class="h5 fw-bold mb-3">Histórico de Rendas</h2>';

    Object.keys(groupedByMonth)
        .sort((a, b) => b.localeCompare(a))
        .forEach(monthYear => {
            const [year, month] = monthYear.split('-');
            const monthName = monthNames[parseInt(month) - 1];

            html += `
                <div class="month-group mb-4">
                    <h6 class="month-header text-muted-custom fw-semibold mb-3 pb-2 border-bottom">
                        <i class="bi bi-calendar3 me-2"></i>${monthName} ${year}
                    </h6>
            `;

            groupedByMonth[monthYear].forEach(income => {
                const date = parseLocalDate(income.date).toLocaleDateString('pt-BR');
                const recurring = income.isRecurring ? ' • Recorrente' : '';

                html += `
                    <div class="card-custom mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h5 class="fw-semibold mb-1">${income.source}</h5>
                                <p class="fs-5 fw-bold mb-1" style="color: var(--blue-primary);">
                                    ${formatCurrency(income.value)}
                                </p>
                                <p class="text-muted-custom small mb-0">${date}${recurring}</p>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="editIncome(${income.id})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteIncome(${income.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

    container.innerHTML = html;
}

function handleAddIncome(event) {
    event.preventDefault();

    const value = document.getElementById('incomeValue').value;
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const isRecurring = document.getElementById('incomeRecurring').checked;

    if (!value || !source || !date) {
        showToast('Preencha todos os campos', 'danger');
        return;
    }

    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');

    incomes.push({
        id: Date.now(),
        value: parseFloat(value),
        source,
        date, // string YYYY-MM-DD (segura)
        isRecurring
    });

    localStorage.setItem('incomes', JSON.stringify(incomes));
    showToast('Renda adicionada com sucesso!', 'success');

    // Limpa formulário (DATA LOCAL)
    const today = new Date();
    document.getElementById('incomeValue').value = '';
    document.getElementById('incomeSource').value = '';
    document.getElementById('incomeDate').value =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('incomeRecurring').checked = false;

    renderIncomeHistory();
}

function deleteIncome(id) {
    showConfirmModal(
        'Excluir Renda',
        'Deseja realmente excluir esta renda? Esta ação não pode ser desfeita.',
        function () {
            const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
            const filtered = incomes.filter(income => income.id !== id);
            localStorage.setItem('incomes', JSON.stringify(filtered));

            showToast('Renda excluída com sucesso!', 'success');
            renderIncomeHistory();
        }
    );
}

function editIncome(id) {
    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const income = incomes.find(i => i.id === id);
    if (!income) return;

    document.getElementById('editIncomeId').value = income.id;
    document.getElementById('editIncomeValue').value = income.value;
    document.getElementById('editIncomeSource').value = income.source;
    document.getElementById('editIncomeDate').value = income.date;
    document.getElementById('editIncomeRecurring').checked = income.isRecurring;

    new bootstrap.Modal(document.getElementById('editIncomeModal')).show();
}

function saveEditIncome() {
    const id = parseInt(document.getElementById('editIncomeId').value);
    const value = parseFloat(document.getElementById('editIncomeValue').value);
    const source = document.getElementById('editIncomeSource').value;
    const date = document.getElementById('editIncomeDate').value;
    const isRecurring = document.getElementById('editIncomeRecurring').checked;

    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const index = incomes.findIndex(i => i.id === id);

    if (index !== -1) {
        incomes[index] = { id, value, source, date, isRecurring };
        localStorage.setItem('incomes', JSON.stringify(incomes));

        showToast('Renda atualizada com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editIncomeModal')).hide();
        renderIncomeHistory();
    }
}

// ==================== PÁGINA DE DESPESA ====================
function loadExpensePage() {
    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value =
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // Inicializa upload de recibo
    initReceiptUpload();

    renderExpenseHistory();
}

function initReceiptUpload() {
    const uploadArea = document.getElementById('receiptUploadArea');
    const fileInput = document.getElementById('receiptInput');
    const previewContainer = document.getElementById('receiptPreview');

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', function () {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function () {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleReceiptFile(files[0]);
        }
    });

    fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            handleReceiptFile(e.target.files[0]);
        }
    });
}

function handleReceiptFile(file) {
    const uploadArea = document.getElementById('receiptUploadArea');
    const previewContainer = document.getElementById('receiptPreview');

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showToast('Formato inválido. Use JPG, PNG, GIF ou PDF.', 'danger');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('Arquivo muito grande. Máximo 5MB.', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const receiptData = {
            name: file.name,
            type: file.type,
            data: e.target.result
        };

        window.currentReceipt = receiptData;

        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';

        if (file.type.startsWith('image/')) {
            previewContainer.innerHTML = `
                <div class="receipt-preview-content">
                    <img src="${e.target.result}" alt="Preview do recibo" class="receipt-image-preview">
                    <div class="receipt-info">
                        <span class="receipt-name">${file.name}</span>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeReceipt()">
                            <i class="bi bi-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `;
        } else {
            previewContainer.innerHTML = `
                <div class="receipt-preview-content">
                    <div class="pdf-icon">
                        <i class="bi bi-file-pdf fs-1"></i>
                    </div>
                    <div class="receipt-info">
                        <span class="receipt-name">${file.name}</span>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeReceipt()">
                            <i class="bi bi-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `;
        }

        showToast('Recibo anexado com sucesso!', 'success');
    };

    reader.readAsDataURL(file);
}

function removeReceipt() {
    const uploadArea = document.getElementById('receiptUploadArea');
    const previewContainer = document.getElementById('receiptPreview');
    const fileInput = document.getElementById('receiptInput');

    window.currentReceipt = null;
    fileInput.value = '';

    uploadArea.style.display = 'block';
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';

    showToast('Recibo removido', 'warning');
}

function renderExpenseHistory() {
    const container = document.getElementById('expenseHistory');
    if (!container) return;

    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-muted-custom text-center">Nenhuma despesa registrada</p>';
        return;
    }

    // ✅ CORREÇÃO: ordenação com data local
    const sortedExpenses = [...expenses].sort(
        (a, b) => parseLocalDate(b.date) - parseLocalDate(a.date)
    );

    const groupedByMonth = {};
    sortedExpenses.forEach(expense => {
        const date = expense.date ? parseLocalDate(expense.date) : new Date();
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!groupedByMonth[monthYear]) {
            groupedByMonth[monthYear] = [];
        }
        groupedByMonth[monthYear].push(expense);
    });

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let html = '<h2 class="h5 fw-bold mb-3">Histórico de Despesas</h2>';

    Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a)).forEach(monthYear => {
        const [year, month] = monthYear.split('-');
        const monthName = monthNames[parseInt(month) - 1];

        html += `
            <div class="month-group mb-4">
                <h6 class="month-header text-muted-custom fw-semibold mb-3 pb-2 border-bottom">
                    <i class="bi bi-calendar3 me-2"></i>${monthName} ${year}
                </h6>
        `;

        groupedByMonth[monthYear].forEach(expense => {
            const date = expense.date
                ? parseLocalDate(expense.date).toLocaleDateString('pt-BR')
                : 'Sem data';

            const hasReceipt = expense.receipt
                ? '<i class="bi bi-paperclip ms-2" title="Tem recibo"></i>'
                : '';

            html += `
                <div class="card-custom mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="fw-semibold mb-1">${expense.category}${hasReceipt}</h5>
                            <p class="fs-5 fw-bold mb-1 text-danger">-${formatCurrency(expense.value)}</p>
                            <p class="text-muted-custom small mb-0">${expense.paymentMethod} • ${date}</p>
                        </div>
                        <div class="d-flex gap-2">
                            ${expense.receipt ? `<button class="btn btn-sm btn-outline-info" onclick="viewReceipt(${expense.id})"><i class="bi bi-eye"></i></button>` : ''}
                            <button class="btn btn-sm btn-outline-primary" onclick="editExpense(${expense.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

function viewReceipt(id) {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const expense = expenses.find(e => e.id === id);
    
    if (!expense || !expense.receipt) return;
    
    const receipt = expense.receipt;
    
    // Abre em nova aba
    const newWindow = window.open();
    if (receipt.type.startsWith('image/')) {
        newWindow.document.write(`<img src="${receipt.data}" style="max-width: 100%; height: auto;">`);
    } else {
        newWindow.document.write(`<iframe src="${receipt.data}" style="width: 100%; height: 100vh; border: none;"></iframe>`);
    }
}

function handleAddExpense(event) {
    event.preventDefault();
    
    const value = document.getElementById('expenseValue').value;
    const category = document.getElementById('expenseCategory').value;
    const paymentMethod = document.getElementById('expensePayment').value;
    const expenseDate = document.getElementById('expenseDate').value;
    
    if (!value || !category || !paymentMethod || !expenseDate) {
        showToast('Preencha todos os campos', 'danger');
        return;
    }
    
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const newExpense = {
        id: Date.now(),
        value: parseFloat(value),
        category: category,
        paymentMethod: paymentMethod,
        date: expenseDate
    };
    
    // Adiciona recibo se houver
    if (window.currentReceipt) {
        newExpense.receipt = window.currentReceipt;
        window.currentReceipt = null;
    }
    
    expenses.push(newExpense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    showToast('Despesa adicionada com sucesso!', 'success');
    
    // Limpa formulário
    document.getElementById('expenseValue').value = '';
    document.getElementById('expenseCategory').value = '';
    document.getElementById('expensePayment').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    
    // Reset upload area
    const uploadArea = document.getElementById('receiptUploadArea');
    const previewContainer = document.getElementById('receiptPreview');
    const fileInput = document.getElementById('receiptInput');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
    if (fileInput) fileInput.value = '';
    
    renderExpenseHistory();
}

function deleteExpense(id) {
    showConfirmModal(
        'Excluir Despesa',
        'Deseja realmente excluir esta despesa? Esta ação não pode ser desfeita.',
        function() {
            const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
            const filtered = expenses.filter(expense => expense.id !== id);
            localStorage.setItem('expenses', JSON.stringify(filtered));
            
            showToast('Despesa excluída com sucesso!', 'success');
            renderExpenseHistory();
        }
    );
}

function editExpense(id) {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editExpenseValue').value = expense.value;
    document.getElementById('editExpenseCategory').value = expense.category;
    document.getElementById('editExpensePayment').value = expense.paymentMethod;
    document.getElementById('editExpenseDate').value = expense.date ? expense.date.split('T')[0] : '';
    
    const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    modal.show();
}

function saveEditExpense() {
    const id = parseInt(document.getElementById('editExpenseId').value);
    const value = parseFloat(document.getElementById('editExpenseValue').value);
    const category = document.getElementById('editExpenseCategory').value;
    const paymentMethod = document.getElementById('editExpensePayment').value;
    const expenseDate = document.getElementById('editExpenseDate').value;
    
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const index = expenses.findIndex(e => e.id === id);
    
    if (index !== -1) {
        // Mantém o recibo existente
        const existingReceipt = expenses[index].receipt;
        expenses[index] = { id, value, category, paymentMethod, date: expenseDate };
        if (existingReceipt) {
            expenses[index].receipt = existingReceipt;
        }
        localStorage.setItem('expenses', JSON.stringify(expenses));
        
        showToast('Despesa atualizada com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editExpenseModal')).hide();
        renderExpenseHistory();
    }
}

// ==================== RESUMO ====================
function loadSummary() {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const total = expenses.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    
    const totalEl = document.getElementById('totalExpenses');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
    
    // Agrupa por categoria
    const grouped = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Outros';
        if (!grouped[cat]) grouped[cat] = 0;
        grouped[cat] += parseFloat(expense.value || 0);
    });
    
    renderPieChart(grouped, total);
    renderCategoryList(grouped, total);
}

function renderPieChart(data, total) {
    const canvas = document.getElementById('pieChart');
    if (!canvas || total === 0) return;
    
    const ctx = canvas.getContext('2d');
    const colors = ['#1E90FF', '#2ECC71', '#F1C40F', '#BD93F9', '#FF6B6B', '#00CED1'];
    
    canvas.width = 200;
    canvas.height = 200;
    
    let currentAngle = -Math.PI / 2;
    let colorIndex = 0;
    
    Object.entries(data).forEach(([category, value]) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 80, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = colors[colorIndex % colors.length];
        ctx.fill();
        
        currentAngle += sliceAngle;
        colorIndex++;
    });
    
    // Centro branco para criar efeito de donut
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, 2 * Math.PI);
    ctx.fillStyle = '#0A1B2B';
    ctx.fill();
}

function renderCategoryList(data, total) {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    const colors = ['#1E90FF', '#2ECC71', '#F1C40F', '#BD93F9', '#FF6B6B', '#00CED1'];
    let html = '';
    let colorIndex = 0;
    
    Object.entries(data).forEach(([category, value]) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        const color = colors[colorIndex % colors.length];
        
        html += `
            <div class="category-item">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-3">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
                        <span class="fw-semibold">${category}</span>
                    </div>
                    <span class="fw-bold">${formatCurrency(value)}</span>
                </div>
                <div class="progress-custom">
                    <div class="progress-bar-custom" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
                <p class="text-muted-custom small mt-1">${percentage}%</p>
            </div>
        `;
        
        colorIndex++;
    });
    
    container.innerHTML = html;
}

// ==================== METAS ====================
const GOAL_EMOJIS = ['💰', '🏠', '🚗', '✈️', '📚', '💻', '🎮', '👗', '💍', '🎓', '🏖️', '💪', '🎯', '⭐', '🌟', '💎'];

function loadGoals() {
    renderGoals();
}

function renderGoals() {
    const container = document.getElementById('goalsContainer');
    if (!container) return;
    
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    
    if (goals.length === 0) {
        container.innerHTML = '<p class="text-muted-custom text-center">Nenhuma meta cadastrada</p>';
        return;
    }
    
    let html = '';
    
    goals.forEach(goal => {
        const percentage = Math.min((goal.current / goal.target) * 100, 100).toFixed(0);
        const icon = goal.icon || '💰'; // Fallback para emoji padrão
        
        html += `
            <div class="goal-card">
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="fs-1">${icon}</div>
                    <div class="flex-grow-1">
                        <h3 class="h5 fw-semibold mb-1">${goal.name}</h3>
                        <p class="text-muted-custom small mb-0">${formatCurrency(goal.current)} de ${formatCurrency(goal.target)}</p>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold" style="color: var(--blue-primary);">${percentage}%</span>
                    </div>
                </div>
                <div class="progress-custom mb-3">
                    <div class="progress-bar-custom" style="width: ${percentage}%; background-color: #1E90FF;"></div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary-custom flex-grow-1" onclick="openAddFundsModal(${goal.id})">Adicionar fundos</button>
                    <button class="btn btn-outline-secondary-custom flex-grow-1" onclick="openEditGoalModal(${goal.id})">Editar</button>
                    <button class="btn btn-outline-danger" onclick="deleteGoal(${goal.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function deleteGoal(id) {
    showConfirmModal(
        'Excluir Meta',
        'Deseja realmente excluir esta meta? Todo o progresso será perdido.',
        function() {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const filtered = goals.filter(goal => goal.id !== id);
            localStorage.setItem('goals', JSON.stringify(filtered));
            
            showToast('Meta excluída com sucesso!', 'success');
            renderGoals();
        }
    );
}

function renderEmojiPicker(containerId, selectedEmoji, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '<div class="emoji-picker">';
    GOAL_EMOJIS.forEach(emoji => {
        const isSelected = emoji === selectedEmoji ? 'selected' : '';
        html += `<div class="emoji-option ${isSelected}" onclick="selectEmoji('${containerId}', '${emoji}')">${emoji}</div>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function selectEmoji(containerId, emoji) {
    // Atualiza visual
    const container = document.getElementById(containerId);
    container.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
    container.querySelectorAll('.emoji-option').forEach(el => {
        if (el.textContent === emoji) el.classList.add('selected');
    });
    
    // Atualiza input hidden
    if (containerId === 'newGoalEmojiPicker') {
        document.getElementById('newGoalIcon').value = emoji;
    } else if (containerId === 'editGoalEmojiPicker') {
        document.getElementById('editGoalIcon').value = emoji;
    }
}

function openAddGoalModal() {
    document.getElementById('newGoalName').value = '';
    document.getElementById('newGoalTarget').value = '';
    document.getElementById('newGoalIcon').value = '💰';
    
    // Renderiza emoji picker
    renderEmojiPicker('newGoalEmojiPicker', '💰');
    
    const modal = new bootstrap.Modal(document.getElementById('addGoalModal'));
    modal.show();
}

function saveNewGoal() {
    const name = document.getElementById('newGoalName').value;
    const target = parseFloat(document.getElementById('newGoalTarget').value);
    const icon = document.getElementById('newGoalIcon').value || '💰';
    
    if (!name || !target) {
        showToast('Preencha todos os campos', 'danger');
        return;
    }
    
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    goals.push({
        id: Date.now(),
        name,
        current: 0,
        target,
        icon
    });
    
    localStorage.setItem('goals', JSON.stringify(goals));
    showToast('Meta adicionada com sucesso!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addGoalModal')).hide();
    renderGoals();
}

function openEditGoalModal(id) {
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    document.getElementById('editGoalId').value = goal.id;
    document.getElementById('editGoalName').value = goal.name;
    document.getElementById('editGoalCurrent').value = goal.current;
    document.getElementById('editGoalTarget').value = goal.target;
    document.getElementById('editGoalIcon').value = goal.icon || '💰';
    
    // Renderiza emoji picker
    renderEmojiPicker('editGoalEmojiPicker', goal.icon || '💰');
    
    const modal = new bootstrap.Modal(document.getElementById('editGoalModal'));
    modal.show();
}

function saveEditGoal() {
    const id = parseInt(document.getElementById('editGoalId').value);
    const name = document.getElementById('editGoalName').value;
    const current = parseFloat(document.getElementById('editGoalCurrent').value);
    const target = parseFloat(document.getElementById('editGoalTarget').value);
    const icon = document.getElementById('editGoalIcon').value || '💰';
    
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    const index = goals.findIndex(g => g.id === id);
    
    if (index !== -1) {
        goals[index] = { id, name, current, target, icon };
        localStorage.setItem('goals', JSON.stringify(goals));
        
        showToast('Meta atualizada com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editGoalModal')).hide();
        renderGoals();
    }
}

function openAddFundsModal(id) {
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    document.getElementById('fundGoalId').value = goal.id;
    document.getElementById('fundGoalName').textContent = goal.name;
    document.getElementById('fundGoalProgress').textContent = formatCurrency(goal.current) + ' / ' + formatCurrency(goal.target);
    document.getElementById('fundAmount').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('addFundsModal'));
    modal.show();
}

function saveAddFunds() {
    const id = parseInt(document.getElementById('fundGoalId').value);
    const amount = parseFloat(document.getElementById('fundAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('Digite um valor válido', 'danger');
        return;
    }
    
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    const index = goals.findIndex(g => g.id === id);
    
    if (index !== -1) {
        goals[index].current = Math.min(goals[index].current + amount, goals[index].target);
        localStorage.setItem('goals', JSON.stringify(goals));
        
        showToast('Fundos adicionados com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addFundsModal')).hide();
        renderGoals();
    }
}

// ==================== CONFIGURAÇÕES ====================
function openProfileModal() {
    const user = JSON.parse(localStorage.getItem('user') || '{"name":"Usuário","email":"usuario@email.com"}');
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

function saveProfile() {
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    
    if (!name) {
        showToast('Digite um nome', 'danger');
        return;
    }
    
    localStorage.setItem('user', JSON.stringify({ name, email }));
    showToast('Perfil atualizado com sucesso!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
}

function openSecurityModal() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('securityModal'));
    modal.show();
}

function savePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('As senhas não coincidem', 'danger');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'danger');
        return;
    }
    
    showToast('Senha atualizada com sucesso!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('securityModal')).hide();
}

function openLanguageModal() {
    const language = localStorage.getItem('language') || 'pt-BR';
    document.getElementById('languageSelect').value = language;
    
    const modal = new bootstrap.Modal(document.getElementById('languageModal'));
    modal.show();
}

function saveLanguage() {
    const language = document.getElementById('languageSelect').value;
    localStorage.setItem('language', language);
    showToast('Idioma atualizado com sucesso!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('languageModal')).hide();
}

function handleLogout() {
    showConfirmModal(
        'Sair da Conta',
        'Deseja realmente sair da sua conta?',
        function() {
            localStorage.removeItem('user');
            window.location.href = '../index.html';
        },
        'Sair' // Botão "Sair" ao invés de "Excluir"
    );
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    // Remove toasts anteriores
    document.querySelectorAll('.custom-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast alert alert-' + type + ' position-fixed';
    toast.style.cssText = 'top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 280px; text-align: center;';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2700);
}