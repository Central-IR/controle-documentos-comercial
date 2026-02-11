// ============================================
// CONFIGURAÇÃO
// ============================================
const DEVELOPMENT_MODE = false;
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = window.location.origin + '/api';

let documentos = [];
let isOnline = false;
let sessionToken = null;
let selectedIds = new Set();
let currentPath = []; // Caminho atual da navegação
let navigationHistory = []; // Histórico de navegação
let historyIndex = -1; // Índice atual no histórico

console.log('✅ Gerenciador de Documentos iniciado');
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
    
    navigateToRoot();
    
    console.log('✅ Aplicação inicializada com sucesso!');
}

function carregarDadosExemplo() {
    documentos = [
        {
            id: '1',
            tipo: 'pasta',
            nome: 'Contratos 2026',
            pasta_pai_id: null,
            tamanho: null,
            data_modificacao: '2026-02-10',
            proprietario: 'Roberto Silva'
        },
        {
            id: '2',
            tipo: 'arquivo',
            nome: 'Contrato_Fornecedor_XYZ.pdf',
            pasta_pai_id: '1',
            tamanho: '2.4 MB',
            data_modificacao: '2026-02-11',
            proprietario: 'Maria Santos',
            mime_type: 'application/pdf'
        },
        {
            id: '3',
            tipo: 'arquivo',
            nome: 'NF_45678.pdf',
            pasta_pai_id: null,
            tamanho: '856 KB',
            data_modificacao: '2026-02-10',
            proprietario: 'João Costa',
            mime_type: 'application/pdf'
        },
        {
            id: '4',
            tipo: 'pasta',
            nome: 'Relatórios Mensais',
            pasta_pai_id: null,
            tamanho: null,
            data_modificacao: '2026-02-09',
            proprietario: 'Ana Paula'
        },
        {
            id: '5',
            tipo: 'arquivo',
            nome: 'Proposta_Cliente_ABC.docx',
            pasta_pai_id: null,
            tamanho: '1.2 MB',
            data_modificacao: '2026-02-11',
            proprietario: 'Carlos Mendes',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
    ];
    
    console.log('📄 Documentos de exemplo carregados:', documentos.length);
}

// ============================================
// NAVEGAÇÃO
// ============================================
function navigateToRoot() {
    currentPath = [];
    addToHistory(null);
    updateBreadcrumb();
    filterDocumentos();
    updateNavigationButtons();
}

function navigateToFolder(folderId, folderName) {
    currentPath.push({ id: folderId, name: folderName });
    addToHistory(folderId);
    updateBreadcrumb();
    filterDocumentos();
    updateNavigationButtons();
}

function navigateToPath(pathIndex) {
    currentPath = currentPath.slice(0, pathIndex);
    const folderId = pathIndex > 0 ? currentPath[pathIndex - 1].id : null;
    addToHistory(folderId);
    updateBreadcrumb();
    filterDocumentos();
    updateNavigationButtons();
}

function addToHistory(folderId) {
    // Remove itens à frente do índice atual
    navigationHistory = navigationHistory.slice(0, historyIndex + 1);
    navigationHistory.push(folderId);
    historyIndex = navigationHistory.length - 1;
}

function navigateBack() {
    if (historyIndex > 0) {
        historyIndex--;
        const folderId = navigationHistory[historyIndex];
        restorePathFromFolderId(folderId);
        updateBreadcrumb();
        filterDocumentos();
        updateNavigationButtons();
    }
}

function navigateForward() {
    if (historyIndex < navigationHistory.length - 1) {
        historyIndex++;
        const folderId = navigationHistory[historyIndex];
        restorePathFromFolderId(folderId);
        updateBreadcrumb();
        filterDocumentos();
        updateNavigationButtons();
    }
}

function restorePathFromFolderId(folderId) {
    if (!folderId) {
        currentPath = [];
        return;
    }
    
    // Reconstruir caminho até a pasta
    const path = [];
    let currentId = folderId;
    
    while (currentId) {
        const folder = documentos.find(d => d.id === currentId && d.tipo === 'pasta');
        if (!folder) break;
        
        path.unshift({ id: folder.id, name: folder.nome });
        currentId = folder.pasta_pai_id;
    }
    
    currentPath = path;
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (currentPath.length === 0) {
        breadcrumb.textContent = 'Raiz';
        return;
    }
    
    let pathText = 'Raiz';
    currentPath.forEach((folder, index) => {
        pathText += ` > ${folder.name}`;
    });
    
    breadcrumb.textContent = pathText;
}

function updateNavigationButtons() {
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    
    if (backBtn) {
        backBtn.disabled = historyIndex <= 0;
        backBtn.style.opacity = historyIndex <= 0 ? '0.3' : '1';
    }
    
    if (forwardBtn) {
        forwardBtn.disabled = historyIndex >= navigationHistory.length - 1;
        forwardBtn.style.opacity = historyIndex >= navigationHistory.length - 1 ? '0.3' : '1';
    }
}

function getCurrentFolderId() {
    return currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
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

async function criarPasta(nome) {
    try {
        const formData = {
            tipo: 'pasta',
            nome: nome,
            pasta_pai_id: getCurrentFolderId(),
            tamanho: null,
            data_modificacao: new Date().toISOString().split('T')[0],
            proprietario: 'Usuário'
        };
        
        if (DEVELOPMENT_MODE) {
            const novoId = String(Math.max(...documentos.map(d => parseInt(d.id) || 0)) + 1);
            documentos.push({ id: novoId, ...formData });
            return { id: novoId, ...formData };
        } else {
            const response = await fetch(`${API_URL}/documentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Erro ao criar pasta');
            }

            const data = await response.json();
            documentos.push(data);
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao criar pasta:', error);
        throw error;
    }
}

async function uploadArquivo(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pasta_pai_id', getCurrentFolderId() || '');
        formData.append('tipo', 'arquivo');
        formData.append('nome', file.name);
        formData.append('tamanho', formatFileSize(file.size));
        formData.append('data_modificacao', new Date().toISOString().split('T')[0]);
        formData.append('proprietario', 'Usuário');
        formData.append('mime_type', file.type);
        
        if (DEVELOPMENT_MODE) {
            const novoId = String(Math.max(...documentos.map(d => parseInt(d.id) || 0)) + 1);
            const novoDoc = {
                id: novoId,
                tipo: 'arquivo',
                nome: file.name,
                pasta_pai_id: getCurrentFolderId(),
                tamanho: formatFileSize(file.size),
                data_modificacao: new Date().toISOString().split('T')[0],
                proprietario: 'Usuário',
                mime_type: file.type
            };
            documentos.push(novoDoc);
            return novoDoc;
        } else {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'X-Session-Token': sessionToken
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro ao fazer upload');
            }

            const data = await response.json();
            documentos.push(data);
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao fazer upload:', error);
        throw error;
    }
}

async function excluirDocumentos(ids) {
    try {
        for (const id of ids) {
            if (!DEVELOPMENT_MODE) {
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
        const currentFolderId = getCurrentFolderId();
        const visibleDocs = documentos.filter(d => d.pasta_pai_id === currentFolderId);
        visibleDocs.forEach(doc => {
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
    
    const currentFolderId = getCurrentFolderId();
    const visibleDocs = documentos.filter(d => d.pasta_pai_id === currentFolderId);
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedIds.size === visibleDocs.length && visibleDocs.length > 0;
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
            deleteBtn.style.opacity = '1';
            moveBtn.style.opacity = '1';
        } else {
            deleteBtn.disabled = true;
            moveBtn.disabled = true;
            deleteBtn.style.opacity = '0.3';
            moveBtn.style.opacity = '0.3';
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
        await excluirDocumentos(Array.from(selectedIds));
        
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
    
    const todasPastas = documentos.filter(d => d.tipo === 'pasta');
    
    let optionsPastas = '<option value="">📁 Raiz</option>';
    todasPastas.forEach(pasta => {
        optionsPastas += `<option value="${pasta.id}">📁 ${escapeHtml(pasta.nome)}</option>`;
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
    const destinoId = select.value || null;
    const destinoNome = select.options[select.selectedIndex].text;
    
    // Atualizar pasta_pai_id dos itens selecionados
    selectedIds.forEach(id => {
        const doc = documentos.find(d => d.id === id);
        if (doc) {
            doc.pasta_pai_id = destinoId;
        }
    });
    
    showToast(`${selectedIds.size} item(ns) movido(s) para ${destinoNome}`, 'success');
    
    selectedIds.clear();
    updateActionButtons();
    
    document.querySelector('.modal-overlay').remove();
    
    filterDocumentos();
}

// ============================================
// UPLOAD DE ARQUIVOS
// ============================================
function showUploadDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = handleFileSelect;
    input.click();
}

async function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    const uploadPromises = [];
    
    for (let i = 0; i < files.length; i++) {
        uploadPromises.push(uploadArquivo(files[i]));
    }
    
    try {
        showToast(`Fazendo upload de ${files.length} arquivo(s)...`, 'info');
        await Promise.all(uploadPromises);
        showToast(`${files.length} arquivo(s) enviado(s) com sucesso!`, 'success');
        filterDocumentos();
    } catch (error) {
        showToast('Erro ao fazer upload de arquivos', 'error');
    }
}

// ============================================
// CRIAÇÃO DE PASTA
// ============================================
function toggleForm() {
    showNovaPassaModal();
}

function showNovaPassaModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Nova Pasta</h3>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            
            <form onsubmit="handleNovaPastaSubmit(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="nomePasta">Nome da Pasta *</label>
                        <input type="text" id="nomePasta" required placeholder="Digite o nome da pasta">
                    </div>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        📁 A pasta será criada em: <strong>${currentPath.length > 0 ? currentPath[currentPath.length - 1].name : 'Raiz'}</strong>
                    </p>
                </div>
                
                <div class="modal-actions">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="secondary">Cancelar</button>
                    <button type="submit" class="primary">Criar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function handleNovaPastaSubmit(event) {
    event.preventDefault();
    
    const nomePasta = document.getElementById('nomePasta').value;
    
    try {
        await criarPasta(nomePasta);
        showToast(`Pasta "${nomePasta}" criada com sucesso!`, 'success');
        document.querySelector('.modal-overlay').remove();
        filterDocumentos();
    } catch (error) {
        showToast('Erro ao criar pasta', 'error');
    }
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
            case 'open':
                handleOpenClick(id);
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
function handleOpenClick(id) {
    const doc = documentos.find(d => String(d.id) === String(id));
    if (!doc) return;
    
    if (doc.tipo === 'pasta') {
        navigateToFolder(doc.id, doc.nome);
    } else {
        // Abrir/baixar arquivo
        showToast(`Abrindo ${doc.nome}...`, 'info');
    }
}

async function handleDeleteClick(id) {
    const doc = documentos.find(d => String(d.id) === String(id));
    if (!doc) {
        showToast('Item não encontrado!', 'error');
        return;
    }
    
    const confirmado = confirm(`Tem certeza que deseja excluir "${doc.nome}"?`);
    if (!confirmado) return;
    
    try {
        await excluirDocumentos([id]);
        filterDocumentos();
        showToast(`"${doc.nome}" excluído com sucesso!`, 'success');
    } catch (error) {
        showToast('Erro ao excluir item', 'error');
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
    const searchTerm = document.getElementById('search')?.value.toLowerCase() || '';
    const currentFolderId = getCurrentFolderId();
    
    const documentosFiltrados = documentos.filter(doc => {
        // Filtrar pela pasta atual
        if (doc.pasta_pai_id !== currentFolderId) return false;
        
        // Filtrar por termo de busca
        if (searchTerm) {
            const searchFields = [
                doc.nome,
                doc.proprietario
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
    
    // Separar pastas e arquivos
    const pastas = docs.filter(d => d.tipo === 'pasta').sort((a, b) => a.nome.localeCompare(b.nome));
    const arquivos = docs.filter(d => d.tipo === 'arquivo').sort((a, b) => a.nome.localeCompare(b.nome));
    const sorted = [...pastas, ...arquivos];
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Pasta vazia</p>
                <button onclick="showUploadDialog()" class="btn-upload-empty">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Fazer Upload
                </button>
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
                    <th style="width: 150px;">Tamanho</th>
                    <th style="width: 180px;">Última Modificação</th>
                    <th style="width: 180px;">Proprietário</th>
                    <th class="actions-column" style="width: 100px;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sorted.forEach(doc => {
        const isChecked = selectedIds.has(String(doc.id)) ? 'checked' : '';
        const icon = doc.tipo === 'pasta' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
        
        html += `
            <tr data-id="${doc.id}" style="cursor: ${doc.tipo === 'pasta' ? 'pointer' : 'default'};">
                <td onclick="event.stopPropagation()">
                    <input type="checkbox" class="doc-checkbox" ${isChecked} onchange="toggleSelectDoc(this, '${doc.id}')">
                </td>
                <td data-action="open" data-id="${doc.id}">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${icon}
                        <strong>${escapeHtml(doc.nome)}</strong>
                    </div>
                </td>
                <td>${escapeHtml(doc.tamanho || '-')}</td>
                <td>${formatarData(doc.data_modificacao)}</td>
                <td>${escapeHtml(doc.proprietario)}</td>
                <td class="actions-column">
                    <button class="action-btn delete-btn" data-action="delete" data-id="${doc.id}" title="Excluir" onclick="event.stopPropagation()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    updateActionButtons();
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
        margin-bottom: 1.5rem;
    }
    
    .btn-upload-empty {
        background: var(--info-color);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
    }
    
    .btn-upload-empty:hover {
        background: #2563EB;
        transform: translateY(-1px);
    }
    
    .doc-checkbox, .doc-checkbox-header {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--primary);
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
        cursor: not-allowed;
    }
    
    .bulk-action-btn:not(:disabled):hover {
        background: var(--input-bg);
        color: var(--text-primary);
    }
    
    .bulk-action-btn.delete:not(:disabled):hover {
        color: #EF4444;
        background: rgba(239, 68, 68, 0.1);
    }
    
    .bulk-action-btn.move:not(:disabled):hover {
        color: #3B82F6;
        background: rgba(59, 130, 246, 0.1);
    }
`;
document.head.appendChild(style);

console.log('✅ Script carregado com sucesso!');
