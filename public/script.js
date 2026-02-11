// ============================================
// CONFIGURAÇÃO
// ============================================
const DEVELOPMENT_MODE = false;
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = window.location.origin + '/api';

let documentos = [];
let isOnline = false;
let sessionToken = null;
let editingId = null;
let selectedIds = new Set();

console.log('✅ Controle de Documentos iniciado');
console.log('📍 API URL:', API_URL);

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicação...');
    
    if (DEVELOPMENT_MODE) {
        console.log('⚠️ MODO DESENVOLVIMENTO ATIVADO');
        sessionToken = 'dev-mode';
        inicializarApp();
    } else {
        obterSessionToken();
    }
    
    setTimeout(setupEventDelegation, 100);
});

// ============================================
// AUTENTICAÇÃO
// ============================================
function obterSessionToken() {
    const params = new URLSearchParams(window.location.search);
    sessionToken = params.get('sessionToken');
    
    console.log('🔑 SessionToken obtido:', sessionToken ? 'SIM' : 'NÃO');
    
    if (!sessionToken) {
        console.error('❌ SessionToken não encontrado na URL');
        showToast('Sessão inválida, redirecionando...', 'error');
        setTimeout(() => {
            window.location.href = PORTAL_URL;
        }, 2000);
        return;
    }
    
    verificarSessionToken();
}

async function verificarSessionToken() {
    try {
        console.log('🔍 Verificando sessionToken...');
        
        const response = await fetch(`${PORTAL_URL}/api/verify-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionToken })
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        const data = await response.json();
        
        if (!data.valid) {
            throw new Error('Sessão expirada');
        }
        
        console.log('✅ Sessão válida, inicializando...');
        inicializarApp();
        
    } catch (error) {
        console.error('❌ Erro ao verificar sessão:', error);
        showToast('Sessão inválida, redirecionando...', 'error');
        setTimeout(() => {
            window.location.href = PORTAL_URL;
        }, 2000);
    }
}

function inicializarApp() {
    console.log('🔧 Configurando aplicação...');
    
    if (DEVELOPMENT_MODE) {
        carregarDadosExemplo();
        updateConnectionStatus(true);
    } else {
        carregarDocumentos();
    }
    
    console.log('✅ Aplicação inicializada com sucesso!');
}

function carregarDadosExemplo() {
    documentos = [
        {
            id: '1',
            tipo: 'pasta',
            nome: 'Contratos 2026',
            tamanho: null,
            data_modificacao: '2026-02-10',
            proprietario: 'Roberto Silva'
        },
        {
            id: '2',
            tipo: 'arquivo',
            nome: 'Contrato_Fornecedor_XYZ.pdf',
            tamanho: '2.4 MB',
            data_modificacao: '2026-02-11',
            proprietario: 'Maria Santos'
        },
        {
            id: '3',
            tipo: 'arquivo',
            nome: 'NF_45678.pdf',
            tamanho: '856 KB',
            data_modificacao: '2026-02-10',
            proprietario: 'João Costa'
        },
        {
            id: '4',
            tipo: 'pasta',
            nome: 'Relatórios Mensais',
            tamanho: null,
            data_modificacao: '2026-02-09',
            proprietario: 'Ana Paula'
        },
        {
            id: '5',
            tipo: 'arquivo',
            nome: 'Proposta_Cliente_ABC.docx',
            tamanho: '1.2 MB',
            data_modificacao: '2026-02-11',
            proprietario: 'Carlos Mendes'
        }
    ];
    
    renderDocumentos(documentos);
    console.log('📄 Documentos de exemplo carregados:', documentos.length);
}

// ============================================
// INTEGRAÇÃO COM API
// ============================================
async function carregarDocumentos() {
    try {
        console.log('📥 Carregando documentos do servidor...');
        
        const response = await fetch(`${API_URL}/documentos`, {
            method: 'GET',
            headers: {
                'X-Session-Token': sessionToken,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar documentos');
        }

        const data = await response.json();
        documentos = data;
        
        updateConnectionStatus(true);
        filterDocumentos();
        
        console.log('✅ Documentos carregados:', documentos.length);
    } catch (error) {
        console.error('❌ Erro ao carregar documentos:', error);
        updateConnectionStatus(false);
        showToast('Erro ao carregar documentos', 'error');
    }
}

async function salvarDocumento(formData) {
    try {
        const url = editingId 
            ? `${API_URL}/documentos/${editingId}`
            : `${API_URL}/documentos`;
        
        const method = editingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar documento');
        }

        const data = await response.json();
        
        if (editingId) {
            const index = documentos.findIndex(d => String(d.id) === String(editingId));
            if (index !== -1) {
                documentos[index] = data;
            }
        } else {
            documentos.push(data);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Erro ao salvar documento:', error);
        throw error;
    }
}

async function excluirDocumentos(ids) {
    try {
        for (const id of ids) {
            const response = await fetch(`${API_URL}/documentos/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Session-Token': sessionToken,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir documento');
            }
        }
        
        documentos = documentos.filter(d => !ids.includes(String(d.id)));
        return true;
    } catch (error) {
        console.error('❌ Erro ao excluir documentos:', error);
        throw error;
    }
}

async function sincronizarDados() {
    if (DEVELOPMENT_MODE) {
        showToast('Dados sincronizados com sucesso!', 'success');
        console.log('🔄 Sincronização executada (modo dev)');
        return;
    }
    
    try {
        showToast('Sincronizando...', 'info');
        await carregarDocumentos();
        showToast('Dados sincronizados com sucesso!', 'success');
        console.log('🔄 Sincronização executada');
    } catch (error) {
        showToast('Erro ao sincronizar', 'error');
    }
}

// ============================================
// SELEÇÃO MÚLTIPLA
// ============================================
function toggleSelectAll(checkbox) {
    selectedIds.clear();
    
    if (checkbox.checked) {
        documentos.forEach(doc => {
            selectedIds.add(String(doc.id));
        });
    }
    
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    updateActionButtons();
}

function toggleSelectDoc(checkbox, id) {
    if (checkbox.checked) {
        selectedIds.add(String(id));
    } else {
        selectedIds.delete(String(id));
    }
    
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedIds.size === documentos.length && documentos.length > 0;
    }
    
    updateActionButtons();
}

function updateActionButtons() {
    const deleteBtn = document.getElementById('bulkDeleteBtn');
    const moveBtn = document.getElementById('bulkMoveBtn');
    
    if (deleteBtn && moveBtn) {
        if (selectedIds.size > 0) {
            deleteBtn.disabled = false;
            moveBtn.disabled = false;
        } else {
            deleteBtn.disabled = true;
            moveBtn.disabled = true;
        }
    }
}

// ============================================
// AÇÕES EM LOTE
// ============================================
function bulkDelete() {
    if (selectedIds.size === 0) {
        showToast('Nenhum item selecionado', 'error');
        return;
    }
    
    const confirmado = confirm(`Tem certeza que deseja excluir ${selectedIds.size} item(ns) selecionado(s)?`);
    if (!confirmado) return;
    
    handleBulkDelete();
}

async function handleBulkDelete() {
    try {
        if (DEVELOPMENT_MODE) {
            documentos = documentos.filter(d => !selectedIds.has(String(d.id)));
        } else {
            await excluirDocumentos(Array.from(selectedIds));
        }
        
        selectedIds.clear();
        filterDocumentos();
        updateActionButtons();
        
        showToast('Itens excluídos com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao excluir itens', 'error');
    }
}

function bulkMove() {
    if (selectedIds.size === 0) {
        showToast('Nenhum item selecionado', 'error');
        return;
    }
    
    showMoveModal();
}

function showMoveModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    // Buscar todas as pastas
    const pastas = documentos.filter(d => d.tipo === 'pasta');
    
    let optionsPastas = '<option value="">Selecione uma pasta</option>';
    pastas.forEach(pasta => {
        optionsPastas += `<option value="${pasta.id}">${escapeHtml(pasta.nome)}</option>`;
    });
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Mover ${selectedIds.size} item(ns)</h3>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            
            <div class="modal-body">
                <div class="form-group">
                    <label for="destinoPasta">Pasta de Destino</label>
                    <select id="destinoPasta" required>
                        ${optionsPastas}
                    </select>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" onclick="this.closest('.modal-overlay').remove()" class="secondary">Cancelar</button>
                <button type="button" onclick="confirmMove()" class="primary">Mover</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function confirmMove() {
    const select = document.getElementById('destinoPasta');
    const destinoId = select.value;
    
    if (!destinoId) {
        showToast('Selecione uma pasta de destino', 'error');
        return;
    }
    
    const destino = documentos.find(d => d.id === destinoId);
    
    showToast(`${selectedIds.size} item(ns) movido(s) para "${destino.nome}"`, 'success');
    
    // Limpar seleção
    selectedIds.clear();
    updateActionButtons();
    
    // Fechar modal
    document.querySelector('.modal-overlay').remove();
    
    // Recarregar lista
    filterDocumentos();
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
    
    const confirmado = confirm(`Tem certeza que deseja excluir "${doc.nome}"?`);
    if (!confirmado) return;
    
    try {
        if (DEVELOPMENT_MODE) {
            documentos = documentos.filter(d => String(d.id) !== String(id));
        } else {
            await excluirDocumentos([id]);
        }
        
        filterDocumentos();
        
        showToast(`"${doc.nome}" excluído com sucesso!`, 'success');
    } catch (error) {
        showToast('Erro ao excluir documento', 'error');
    }
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
        title.textContent = 'Editar Item';
    } else {
        title.textContent = 'Novo Item';
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
    document.getElementById('tipoItem').value = doc.tipo || 'arquivo';
    document.getElementById('nomeItem').value = doc.nome || '';
    document.getElementById('tamanhoItem').value = doc.tamanho || '';
    document.getElementById('proprietarioItem').value = doc.proprietario || '';
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        tipo: document.getElementById('tipoItem').value,
        nome: document.getElementById('nomeItem').value,
        tamanho: document.getElementById('tipoItem').value === 'pasta' ? null : document.getElementById('tamanhoItem').value,
        data_modificacao: new Date().toISOString().split('T')[0],
        proprietario: document.getElementById('proprietarioItem').value
    };
    
    try {
        if (DEVELOPMENT_MODE) {
            if (editingId) {
                const index = documentos.findIndex(d => String(d.id) === String(editingId));
                if (index !== -1) {
                    documentos[index] = { ...documentos[index], ...formData };
                    showToast('Item atualizado com sucesso!', 'success');
                }
            } else {
                const novoId = String(Math.max(...documentos.map(d => parseInt(d.id) || 0)) + 1);
                documentos.push({ id: novoId, ...formData });
                showToast('Item criado com sucesso!', 'success');
            }
        } else {
            await salvarDocumento(formData);
            showToast(editingId ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!', 'success');
        }
        
        closeFormModal();
        filterDocumentos();
    } catch (error) {
        showToast('Erro ao salvar item', 'error');
    }
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

// ============================================
// FILTROS
// ============================================
function filterDocumentos() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    const documentosFiltrados = documentos.filter(doc => {
        if (searchTerm) {
            const searchFields = [
                doc.nome,
                doc.tipo,
                doc.proprietario,
                doc.tamanho
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) return false;
        }
        
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
                <p>Nenhum item encontrado</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="fretes-table">
            <thead>
                <tr>
                    <th style="width: 50px;">
                        <input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)" class="doc-checkbox-header">
                    </th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Tamanho</th>
                    <th>Última Modificação</th>
                    <th>Proprietário</th>
                    <th class="actions-column">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    docs.forEach(doc => {
        const isChecked = selectedIds.has(String(doc.id)) ? 'checked' : '';
        const icon = doc.tipo === 'pasta' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
        
        html += `
            <tr data-id="${doc.id}">
                <td>
                    <input type="checkbox" class="doc-checkbox" ${isChecked} onchange="toggleSelectDoc(this, '${doc.id}')">
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${icon}
                        <strong>${escapeHtml(doc.nome || doc.numero_documento)}</strong>
                    </div>
                </td>
                <td>${escapeHtml(doc.tipo || 'arquivo')}</td>
                <td>${escapeHtml(doc.tamanho || '-')}</td>
                <td>${formatarData(doc.data_modificacao || doc.data_emissao)}</td>
                <td>${escapeHtml(doc.proprietario || doc.responsavel)}</td>
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
    
    // Restaurar estado dos checkboxes
    updateActionButtons();
}

// ============================================
// MODAL DE VISUALIZAÇÃO
// ============================================
function mostrarModalVisualizacao(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content view-modal">
            <div class="modal-header">
                <h3 class="modal-title">Detalhes do Item</h3>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            
            <div class="view-content">
                <div class="view-row">
                    <div class="view-label">Nome:</div>
                    <div class="view-value"><strong>${escapeHtml(doc.nome || doc.numero_documento)}</strong></div>
                </div>
                <div class="view-row">
                    <div class="view-label">Tipo:</div>
                    <div class="view-value">${escapeHtml(doc.tipo || 'arquivo')}</div>
                </div>
                ${doc.tamanho ? `
                <div class="view-row">
                    <div class="view-label">Tamanho:</div>
                    <div class="view-value">${escapeHtml(doc.tamanho)}</div>
                </div>
                ` : ''}
                <div class="view-row">
                    <div class="view-label">Última Modificação:</div>
                    <div class="view-value">${formatarData(doc.data_modificacao || doc.data_emissao)}</div>
                </div>
                <div class="view-row">
                    <div class="view-label">Proprietário:</div>
                    <div class="view-value">${escapeHtml(doc.proprietario || doc.responsavel)}</div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" onclick="this.closest('.modal-overlay').remove()" class="secondary">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
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
    
    .view-label {
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .view-value {
        color: var(--text-primary);
    }
    
    .doc-checkbox, .doc-checkbox-header {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
    
    .bulk-action-btn {
        padding: 0.5rem;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }
    
    .bulk-action-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    
    .bulk-action-btn:not(:disabled):hover {
        background: var(--input-bg);
        color: var(--text-primary);
    }
    
    .bulk-action-btn.delete:not(:disabled):hover {
        color: #EF4444;
    }
    
    .bulk-action-btn.move:not(:disabled):hover {
        color: #3B82F6;
    }
`;
document.head.appendChild(style);

console.log('✅ Script carregado com sucesso!');
