// ============================================
// CONFIGURAÇÃO
// ============================================
const DEVELOPMENT_MODE = true;
const API_URL = 'https://controle-documentos-api.example.com/api';

let documentos = [];
let isOnline = false;
let lastDataHash = '';
let sessionToken = null;
let currentMonth = new Date();
let graficoYear = new Date().getFullYear();
let graficoChart = null;
let editingId = null;

const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

console.log('✅ Controle de Documentos iniciado');
console.log('📍 API URL:', API_URL);
console.log('🔧 Modo desenvolvimento:', DEVELOPMENT_MODE);

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicação...');
    sessionToken = 'dev-mode';
    inicializarApp();
    setTimeout(setupEventDelegation, 100);
});

function inicializarApp() {
    console.log('🔧 Configurando aplicação...');
    
    // Carregar dados de exemplo
    carregarDadosExemplo();
    
    // Atualizar interface
    updateConnectionStatus(true);
    updateCurrentMonth();
    updateAllFilters();
    updateDashboard();
    filterDocumentos();
    
    console.log('✅ Aplicação inicializada com sucesso!');
}

function carregarDadosExemplo() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    documentos = [
        {
            id: '1',
            tipo_documento: 'Contrato',
            numero_documento: 'CT-2026-001',
            departamento: 'Jurídico',
            responsavel: 'Maria Silva',
            data_emissao: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-05`,
            data_vencimento: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-20`,
            status: 'Processado',
            observacoes: 'Contrato de prestação de serviços'
        },
        {
            id: '2',
            tipo_documento: 'NF',
            numero_documento: 'NF-45678',
            departamento: 'Financeiro',
            responsavel: 'João Santos',
            data_emissao: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-10`,
            data_vencimento: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-25`,
            status: 'Em Análise',
            observacoes: 'Nota fiscal de equipamentos'
        },
        {
            id: '3',
            tipo_documento: 'Relatório',
            numero_documento: 'REL-2026-03',
            departamento: 'Comercial',
            responsavel: 'Ana Paula',
            data_emissao: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`,
            data_vencimento: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-08`,
            status: 'Atrasado',
            observacoes: 'Relatório mensal de vendas'
        },
        {
            id: '4',
            tipo_documento: 'Proposta',
            numero_documento: 'PROP-2026-012',
            departamento: 'Comercial',
            responsavel: 'Carlos Mendes',
            data_emissao: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-12`,
            data_vencimento: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-28`,
            status: 'Pendente',
            observacoes: 'Proposta comercial cliente XYZ'
        },
        {
            id: '5',
            tipo_documento: 'Contrato',
            numero_documento: 'CT-2026-002',
            departamento: 'Recursos Humanos',
            responsavel: 'Patricia Costa',
            data_emissao: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-15`,
            data_vencimento: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-30`,
            status: 'Em Análise',
            observacoes: 'Contrato de trabalho novo colaborador'
        }
    ];
    
    console.log('📄 Documentos de exemplo carregados:', documentos.length);
}

// ============================================
// EVENT DELEGATION
// ============================================
function setupEventDelegation() {
    console.log('🔧 Configurando Event Delegation...');
    
    document.body.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        
        console.log('🖱️ Ação:', action, 'ID:', id);
        
        switch(action) {
            case 'view':
                handleViewClick(id);
                break;
            case 'edit':
                handleEditClick(id);
                break;
            case 'delete':
                handleDeleteClick(id);
                break;
        }
    });
    
    console.log('✅ Event Delegation configurado');
}

// ============================================
// HANDLERS DE EVENTOS
// ============================================
function handleViewClick(id) {
    console.log('👁️ Visualizar documento:', id);
    
    const doc = documentos.find(d => String(d.id) === String(id));
    if (!doc) {
        showToast('Documento não encontrado!', 'error');
        return;
    }
    
    mostrarModalVisualizacao(doc);
}

function handleEditClick(id) {
    console.log('✏️ Editar documento:', id);
    
    const doc = documentos.find(d => String(d.id) === String(id));
    if (!doc) {
        showToast('Documento não encontrado!', 'error');
        return;
    }
    
    editingId = id;
    preencherFormulario(doc);
    showFormModal();
}

async function handleDeleteClick(id) {
    console.log('🗑️ Excluir documento:', id);
    
    const doc = documentos.find(d => String(d.id) === String(id));
    if (!doc) {
        showToast('Documento não encontrado!', 'error');
        return;
    }
    
    const confirmado = confirm(`Tem certeza que deseja excluir o documento ${doc.numero_documento}?`);
    if (!confirmado) return;
    
    documentos = documentos.filter(d => String(d.id) !== String(id));
    
    updateAllFilters();
    updateDashboard();
    filterDocumentos();
    
    showToast(`Documento ${doc.numero_documento} excluído com sucesso!`, 'success');
}

// ============================================
// FORMULÁRIO
// ============================================
function toggleForm() {
    editingId = null;
    limparFormulario();
    showFormModal();
}

function showFormModal() {
    const modal = document.getElementById('formModal');
    const title = document.getElementById('formTitle');
    
    if (editingId) {
        title.textContent = 'Editar Documento';
    } else {
        title.textContent = 'Novo Documento';
    }
    
    modal.style.display = 'flex';
}

function closeFormModal() {
    document.getElementById('formModal').style.display = 'none';
    editingId = null;
    limparFormulario();
}

function limparFormulario() {
    document.getElementById('documentoForm').reset();
}

function preencherFormulario(doc) {
    document.getElementById('tipoDocumento').value = doc.tipo_documento || '';
    document.getElementById('numeroDocumento').value = doc.numero_documento || '';
    document.getElementById('departamento').value = doc.departamento || '';
    document.getElementById('responsavel').value = doc.responsavel || '';
    document.getElementById('dataEmissao').value = doc.data_emissao || '';
    document.getElementById('dataVencimento').value = doc.data_vencimento || '';
    document.getElementById('status').value = doc.status || '';
    document.getElementById('observacoes').value = doc.observacoes || '';
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        tipo_documento: document.getElementById('tipoDocumento').value,
        numero_documento: document.getElementById('numeroDocumento').value,
        departamento: document.getElementById('departamento').value,
        responsavel: document.getElementById('responsavel').value,
        data_emissao: document.getElementById('dataEmissao').value,
        data_vencimento: document.getElementById('dataVencimento').value,
        status: document.getElementById('status').value,
        observacoes: document.getElementById('observacoes').value
    };
    
    if (editingId) {
        // Editar documento existente
        const index = documentos.findIndex(d => String(d.id) === String(editingId));
        if (index !== -1) {
            documentos[index] = { ...documentos[index], ...formData };
            showToast('Documento atualizado com sucesso!', 'success');
        }
    } else {
        // Criar novo documento
        const novoId = String(Math.max(...documentos.map(d => parseInt(d.id) || 0)) + 1);
        documentos.push({ id: novoId, ...formData });
        showToast('Documento criado com sucesso!', 'success');
    }
    
    closeFormModal();
    updateAllFilters();
    updateDashboard();
    filterDocumentos();
}

// ============================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================
function updateConnectionStatus(online) {
    isOnline = online;
    const statusEl = document.getElementById('connectionStatus');
    
    if (online) {
        statusEl.classList.remove('offline');
        statusEl.classList.add('online');
    } else {
        statusEl.classList.remove('online');
        statusEl.classList.add('offline');
    }
}

function updateCurrentMonth() {
    const monthText = `${meses[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    document.getElementById('currentMonth').textContent = monthText;
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    updateCurrentMonth();
    filterDocumentos();
}

// ============================================
// DASHBOARD
// ============================================
function updateDashboard() {
    const stats = calcularEstatisticas();
    
    document.getElementById('statProcessados').textContent = stats.processados;
    document.getElementById('statAtrasados').textContent = stats.atrasados;
    document.getElementById('statEmAnalise').textContent = stats.emAnalise;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPendentes').textContent = stats.pendentes;
    
    // Atualizar card de atrasados
    const cardAtrasados = document.getElementById('cardAtrasados');
    if (stats.atrasados > 0) {
        cardAtrasados.style.cursor = 'pointer';
        cardAtrasados.onclick = showAlertModal;
    } else {
        cardAtrasados.style.cursor = 'default';
        cardAtrasados.onclick = null;
    }
}

function calcularEstatisticas() {
    const mesAtual = currentMonth.getMonth();
    const anoAtual = currentMonth.getFullYear();
    
    const documentosMes = documentos.filter(doc => {
        const dataEmissao = new Date(doc.data_emissao);
        return dataEmissao.getMonth() === mesAtual && dataEmissao.getFullYear() === anoAtual;
    });
    
    return {
        processados: documentosMes.filter(d => d.status === 'Processado').length,
        atrasados: documentosMes.filter(d => d.status === 'Atrasado').length,
        emAnalise: documentosMes.filter(d => d.status === 'Em Análise').length,
        pendentes: documentosMes.filter(d => d.status === 'Pendente').length,
        total: documentosMes.length
    };
}

// ============================================
// FILTROS
// ============================================
function updateAllFilters() {
    // Atualizar departamentos
    const departamentos = [...new Set(documentos.map(d => d.departamento))].filter(Boolean).sort();
    const filterDepartamento = document.getElementById('filterDepartamento');
    const currentDept = filterDepartamento.value;
    
    filterDepartamento.innerHTML = '<option value="">Todos Departamentos</option>';
    departamentos.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        filterDepartamento.appendChild(option);
    });
    filterDepartamento.value = currentDept;
    
    // Atualizar responsáveis
    const responsaveis = [...new Set(documentos.map(d => d.responsavel))].filter(Boolean).sort();
    const filterResponsavel = document.getElementById('filterResponsavel');
    const currentResp = filterResponsavel.value;
    
    filterResponsavel.innerHTML = '<option value="">Todos Responsáveis</option>';
    responsaveis.forEach(resp => {
        const option = document.createElement('option');
        option.value = resp;
        option.textContent = resp;
        filterResponsavel.appendChild(option);
    });
    filterResponsavel.value = currentResp;
    
    // Atualizar status
    const statusOptions = ['Pendente', 'Em Análise', 'Processado', 'Atrasado'];
    const filterStatus = document.getElementById('filterStatus');
    const currentStatus = filterStatus.value;
    
    filterStatus.innerHTML = '<option value="">Todos os Status</option>';
    statusOptions.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        filterStatus.appendChild(option);
    });
    filterStatus.value = currentStatus;
}

function filterDocumentos() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filterDept = document.getElementById('filterDepartamento').value;
    const filterResp = document.getElementById('filterResponsavel').value;
    const filterStat = document.getElementById('filterStatus').value;
    
    const mesAtual = currentMonth.getMonth();
    const anoAtual = currentMonth.getFullYear();
    
    const documentosFiltrados = documentos.filter(doc => {
        const dataEmissao = new Date(doc.data_emissao);
        const mesDoc = dataEmissao.getMonth();
        const anoDoc = dataEmissao.getFullYear();
        
        // Filtro de mês
        if (mesDoc !== mesAtual || anoDoc !== anoAtual) return false;
        
        // Filtro de busca
        if (searchTerm) {
            const searchFields = [
                doc.numero_documento,
                doc.tipo_documento,
                doc.departamento,
                doc.responsavel,
                doc.status,
                doc.observacoes
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) return false;
        }
        
        // Filtros de dropdown
        if (filterDept && doc.departamento !== filterDept) return false;
        if (filterResp && doc.responsavel !== filterResp) return false;
        if (filterStat && doc.status !== filterStat) return false;
        
        return true;
    });
    
    renderDocumentos(documentosFiltrados);
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderDocumentos(docs) {
    const container = document.getElementById('documentosContainer');
    
    if (docs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>Nenhum documento encontrado</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="fretes-table">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Departamento</th>
                    <th>Responsável</th>
                    <th>Emissão</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th class="actions-column">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    docs.forEach(doc => {
        const dataEmissao = formatarData(doc.data_emissao);
        const dataVencimento = formatarData(doc.data_vencimento);
        const statusClass = getStatusClass(doc.status);
        
        html += `
            <tr data-id="${doc.id}">
                <td>${escapeHtml(doc.tipo_documento)}</td>
                <td><strong>${escapeHtml(doc.numero_documento)}</strong></td>
                <td>${escapeHtml(doc.departamento)}</td>
                <td>${escapeHtml(doc.responsavel)}</td>
                <td>${dataEmissao}</td>
                <td>${dataVencimento}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(doc.status)}</span></td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="action-btn view-btn" data-action="view" data-id="${doc.id}" title="Visualizar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit-btn" data-action="edit" data-id="${doc.id}" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${doc.id}" title="Excluir">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ============================================
// MODAL DE VISUALIZAÇÃO
// ============================================
function mostrarModalVisualizacao(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    const dataEmissao = formatarData(doc.data_emissao);
    const dataVencimento = formatarData(doc.data_vencimento);
    
    modal.innerHTML = `
        <div class="modal-content view-modal">
            <div class="modal-header">
                <h3 class="modal-title">Detalhes do Documento</h3>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            
            <div class="view-content">
                <div class="view-row">
                    <div class="view-label">Tipo de Documento:</div>
                    <div class="view-value">${escapeHtml(doc.tipo_documento)}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Número do Documento:</div>
                    <div class="view-value"><strong>${escapeHtml(doc.numero_documento)}</strong></div>
                </div>
                <div class="view-row">
                    <div class="view-label">Departamento:</div>
                    <div class="view-value">${escapeHtml(doc.departamento)}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Responsável:</div>
                    <div class="view-value">${escapeHtml(doc.responsavel)}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Data de Emissão:</div>
                    <div class="view-value">${dataEmissao}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Data de Vencimento:</div>
                    <div class="view-value">${dataVencimento}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Status:</div>
                    <div class="view-value"><span class="status-badge ${getStatusClass(doc.status)}">${escapeHtml(doc.status)}</span></div>
                </div>
                ${doc.observacoes ? `
                <div class="view-row full-width">
                    <div class="view-label">Observações:</div>
                    <div class="view-value">${escapeHtml(doc.observacoes)}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="modal-actions">
                <button type="button" onclick="this.closest('.modal-overlay').remove()" class="secondary">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ============================================
// MODAL DE ALERTAS
// ============================================
function showAlertModal() {
    const atrasados = documentos.filter(d => d.status === 'Atrasado');
    
    if (atrasados.length === 0) {
        showToast('Não há documentos atrasados!', 'info');
        return;
    }
    
    const modal = document.getElementById('alertModal');
    const body = document.getElementById('alertModalBody');
    
    let html = `
        <h2 style="color: #EF4444; margin-bottom: 1rem;">Documentos Atrasados</h2>
        <p style="margin-bottom: 1rem;">Foram encontrados ${atrasados.length} documento(s) atrasado(s):</p>
        <div class="alert-list">
    `;
    
    atrasados.forEach(doc => {
        html += `
            <div class="alert-item">
                <div class="alert-item-header">
                    <strong>${escapeHtml(doc.numero_documento)}</strong>
                    <span class="status-badge status-atrasado">${escapeHtml(doc.status)}</span>
                </div>
                <div class="alert-item-details">
                    <div><strong>Tipo:</strong> ${escapeHtml(doc.tipo_documento)}</div>
                    <div><strong>Departamento:</strong> ${escapeHtml(doc.departamento)}</div>
                    <div><strong>Responsável:</strong> ${escapeHtml(doc.responsavel)}</div>
                    <div><strong>Vencimento:</strong> ${formatarData(doc.data_vencimento)}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    body.innerHTML = html;
    modal.style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('alertModal').style.display = 'none';
}

// ============================================
// MODAL DE GRÁFICO
// ============================================
function showGraficoModal() {
    const modal = document.getElementById('graficoModal');
    document.getElementById('graficoYear').textContent = graficoYear;
    
    renderDashboardsAnuais();
    modal.style.display = 'flex';
}

function closeGraficoModal() {
    document.getElementById('graficoModal').style.display = 'none';
}

function changeGraficoYear(delta) {
    graficoYear += delta;
    document.getElementById('graficoYear').textContent = graficoYear;
    renderDashboardsAnuais();
}

function renderDashboardsAnuais() {
    const container = document.getElementById('dashboardsContainer');
    let html = '';
    
    for (let mes = 0; mes < 12; mes++) {
        const documentosMes = documentos.filter(doc => {
            const data = new Date(doc.data_emissao);
            return data.getMonth() === mes && data.getFullYear() === graficoYear;
        });
        
        const stats = {
            processados: documentosMes.filter(d => d.status === 'Processado').length,
            atrasados: documentosMes.filter(d => d.status === 'Atrasado').length,
            emAnalise: documentosMes.filter(d => d.status === 'Em Análise').length,
            pendentes: documentosMes.filter(d => d.status === 'Pendente').length,
            total: documentosMes.length
        };
        
        html += `
            <div class="month-dashboard">
                <h4>${meses[mes]}</h4>
                <div class="dashboard-grid-mini">
                    <div class="mini-stat">
                        <div class="mini-stat-value">${stats.total}</div>
                        <div class="mini-stat-label">Total</div>
                    </div>
                    <div class="mini-stat mini-stat-success">
                        <div class="mini-stat-value">${stats.processados}</div>
                        <div class="mini-stat-label">Processados</div>
                    </div>
                    <div class="mini-stat mini-stat-warning">
                        <div class="mini-stat-value">${stats.emAnalise}</div>
                        <div class="mini-stat-label">Em Análise</div>
                    </div>
                    <div class="mini-stat mini-stat-danger">
                        <div class="mini-stat-value">${stats.atrasados}</div>
                        <div class="mini-stat-label">Atrasados</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// CALENDÁRIO
// ============================================
function toggleCalendar() {
    const modal = document.getElementById('calendarModal');
    const isVisible = modal.classList.contains('show');
    
    if (isVisible) {
        modal.classList.remove('show');
    } else {
        renderCalendar();
        modal.classList.add('show');
    }
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    document.getElementById('calendarYear').textContent = year;
    
    const container = document.getElementById('calendarMonths');
    let html = '';
    
    meses.forEach((mes, index) => {
        const isCurrentMonth = index === currentMonth.getMonth();
        const activeClass = isCurrentMonth ? 'active' : '';
        
        html += `
            <div class="calendar-month ${activeClass}" onclick="selectMonth(${index})">
                ${mes}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selectMonth(monthIndex) {
    currentMonth.setMonth(monthIndex);
    updateCurrentMonth();
    filterDocumentos();
    toggleCalendar();
}

function changeCalendarYear(delta) {
    const year = parseInt(document.getElementById('calendarYear').textContent);
    const newYear = year + delta;
    document.getElementById('calendarYear').textContent = newYear;
    currentMonth.setFullYear(newYear);
    renderCalendar();
}

// ============================================
// SINCRONIZAÇÃO
// ============================================
function sincronizarDados() {
    showToast('Dados sincronizados com sucesso!', 'success');
    console.log('🔄 Sincronização executada');
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
    const classes = {
        'Processado': 'status-processado',
        'Em Análise': 'status-em-analise',
        'Pendente': 'status-pendente',
        'Atrasado': 'status-atrasado'
    };
    return classes[status] || '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    
    .empty-state {
        padding: 4rem 2rem;
        text-align: center;
        color: var(--text-secondary);
    }
    
    .empty-state svg {
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .empty-state p {
        font-size: 1.1rem;
    }
    
    .view-content {
        padding: 1rem 0;
    }
    
    .view-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .view-row.full-width {
        grid-template-columns: 1fr;
    }
    
    .view-label {
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .view-value {
        color: var(--text-primary);
    }
    
    .alert-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .alert-item {
        background: var(--input-bg);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border-left: 4px solid #EF4444;
    }
    
    .alert-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .alert-item-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        font-size: 0.9rem;
    }
    
    .month-dashboard {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .month-dashboard h4 {
        margin-bottom: 1rem;
        color: var(--text-primary);
    }
    
    .dashboard-grid-mini {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    
    .mini-stat {
        text-align: center;
        padding: 0.75rem;
        background: var(--input-bg);
        border-radius: 8px;
    }
    
    .mini-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }
    
    .mini-stat-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .mini-stat-success .mini-stat-value { color: var(--success-color); }
    .mini-stat-warning .mini-stat-value { color: var(--warning-color); }
    .mini-stat-danger .mini-stat-value { color: var(--danger-color); }
`;
document.head.appendChild(style);

console.log('✅ Script carregado com sucesso!');
