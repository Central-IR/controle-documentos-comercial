require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase configurado:', supabaseUrl);

// MIDDLEWARES
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisições
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// AUTENTICAÇÃO
const PORTAL_URL = process.env.PORTAL_URL || 'https://ir-comercio-portal-zcan.onrender.com';

async function verificarAutenticacao(req, res, next) {
    const publicPaths = ['/', '/health'];
    if (publicPaths.includes(req.path)) {
        return next();
    }

    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
        return res.status(401).json({
            error: 'Não autenticado',
            message: 'Token de sessão não encontrado'
        });
    }

    try {
        const verifyResponse = await fetch(`${PORTAL_URL}/api/verify-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        if (!verifyResponse.ok) {
            return res.status(401).json({
                error: 'Sessão inválida',
                message: 'Sua sessão expirou'
            });
        }

        const sessionData = await verifyResponse.json();

        if (!sessionData.valid) {
            return res.status(401).json({
                error: 'Sessão inválida',
                message: sessionData.message || 'Sua sessão expirou'
            });
        }

        req.user = sessionData.session;
        req.sessionToken = sessionToken;
        next();
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return res.status(500).json({
            error: 'Erro interno',
            message: 'Erro ao verificar autenticação'
        });
    }
}

// SERVIR ARQUIVOS ESTÁTICOS
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// HEALTH CHECK
app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase
            .from('controle_documentos')
            .select('count', { count: 'exact', head: true });
        
        res.json({
            status: error ? 'unhealthy' : 'healthy',
            database: error ? 'disconnected' : 'connected',
            timestamp: new Date().toISOString(),
            service: 'Controle de Documentos API'
        });
    } catch (error) {
        res.json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ROTAS DA API
app.use('/api', verificarAutenticacao);

// GET - Listar todos os documentos
app.get('/api/documentos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('controle_documentos')
            .select('*')
            .order('data_emissao', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao buscar documentos:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar documentos',
            details: error.message 
        });
    }
});

// GET - Buscar por ID
app.get('/api/documentos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('controle_documentos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao buscar documento:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar documento',
            details: error.message 
        });
    }
});

// POST - Criar documento
app.post('/api/documentos', async (req, res) => {
    try {
        console.log('📝 Criando documento:', req.body);
        
        const {
            tipo_documento,
            numero_documento,
            departamento,
            responsavel,
            data_emissao,
            data_vencimento,
            status,
            observacoes
        } = req.body;

        // Validações mínimas
        if (!numero_documento || !departamento || !responsavel) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios faltando: numero_documento, departamento, responsavel'
            });
        }

        // Validar status
        const statusValidos = ['Pendente', 'Em Análise', 'Processado', 'Atrasado'];
        const statusFinal = statusValidos.includes(status) ? status : 'Pendente';

        const { data, error } = await supabase
            .from('controle_documentos')
            .insert([{
                tipo_documento: tipo_documento || 'Outros',
                numero_documento,
                departamento,
                responsavel,
                data_emissao: data_emissao || new Date().toISOString().split('T')[0],
                data_vencimento: data_vencimento || null,
                status: statusFinal,
                observacoes: observacoes || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Documento criado:', data.id);
        res.status(201).json(data);
    } catch (error) {
        console.error('❌ Erro ao criar documento:', error);
        res.status(500).json({ 
            error: 'Erro ao criar documento',
            details: error.message 
        });
    }
});

// PUT - Atualizar documento
app.put('/api/documentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`✏️ Atualizando documento: ${id}`);
        console.log('📦 Dados recebidos:', req.body);
        
        const {
            tipo_documento,
            numero_documento,
            departamento,
            responsavel,
            data_emissao,
            data_vencimento,
            status,
            observacoes
        } = req.body;

        // Validar status
        const statusValidos = ['Pendente', 'Em Análise', 'Processado', 'Atrasado'];
        const statusFinal = statusValidos.includes(status) ? status : 'Pendente';

        // Verificar se o documento existe
        const { data: documentoExiste } = await supabase
            .from('controle_documentos')
            .select('id')
            .eq('id', id)
            .single();

        if (!documentoExiste) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const updateData = {
            tipo_documento,
            numero_documento,
            departamento,
            responsavel,
            data_emissao,
            data_vencimento: data_vencimento || null,
            status: statusFinal,
            observacoes: observacoes || '',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('controle_documentos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Documento atualizado:', data);
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao atualizar documento:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar documento',
            details: error.message 
        });
    }
});

// PATCH - Atualizar status
app.patch('/api/documentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`🔄 Atualizando status do documento ${id} para: ${status}`);

        // Validar status
        const statusValidos = ['Pendente', 'Em Análise', 'Processado', 'Atrasado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ 
                error: 'Status inválido',
                message: `Status deve ser um de: ${statusValidos.join(', ')}`
            });
        }

        const updateData = { 
            status,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('controle_documentos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        console.log('✅ Status atualizado');
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar status',
            details: error.message 
        });
    }
});

// DELETE - Excluir documento
app.delete('/api/documentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ Deletando documento: ${id}`);

        // Verificar se o documento existe antes de deletar
        const { data: documentoExiste } = await supabase
            .from('controle_documentos')
            .select('numero_documento')
            .eq('id', id)
            .single();

        if (!documentoExiste) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const { error } = await supabase
            .from('controle_documentos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log('✅ Documento deletado:', documentoExiste.numero_documento);
        res.json({ 
            message: 'Documento excluído com sucesso',
            numero_documento: documentoExiste.numero_documento
        });
    } catch (error) {
        console.error('❌ Erro ao excluir documento:', error);
        res.status(500).json({ 
            error: 'Erro ao excluir documento',
            details: error.message 
        });
    }
});

// GET - Estatísticas
app.get('/api/estatisticas', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        
        let query = supabase.from('controle_documentos').select('*');
        
        // Filtrar por mês/ano se fornecido
        if (mes && ano) {
            const mesNum = String(mes).padStart(2, '0');
            const inicioMes = `${ano}-${mesNum}-01`;
            const fimMes = `${ano}-${mesNum}-31`;
            
            query = query
                .gte('data_emissao', inicioMes)
                .lte('data_emissao', fimMes);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Calcular estatísticas
        const stats = {
            total: data.length,
            processados: data.filter(d => d.status === 'Processado').length,
            atrasados: data.filter(d => d.status === 'Atrasado').length,
            emAnalise: data.filter(d => d.status === 'Em Análise').length,
            pendentes: data.filter(d => d.status === 'Pendente').length,
            porDepartamento: {},
            porResponsavel: {},
            porTipo: {}
        };

        // Agrupar por departamento
        data.forEach(doc => {
            stats.porDepartamento[doc.departamento] = (stats.porDepartamento[doc.departamento] || 0) + 1;
            stats.porResponsavel[doc.responsavel] = (stats.porResponsavel[doc.responsavel] || 0) + 1;
            stats.porTipo[doc.tipo_documento] = (stats.porTipo[doc.tipo_documento] || 0) + 1;
        });

        res.json(stats);
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar estatísticas',
            details: error.message 
        });
    }
});

// ROTA PRINCIPAL
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'Controle de Documentos API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            documentos: '/api/documentos',
            estatisticas: '/api/estatisticas',
            health: '/health'
        }
    });
});

// ROTA 404
app.use((req, res) => {
    res.status(404).json({
        error: '404 - Rota não encontrada',
        path: req.path
    });
});

// TRATAMENTO DE ERROS
app.use((error, req, res, next) => {
    console.error('💥 Erro no servidor:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
    });
});

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ================================');
    console.log(`🚀 Controle de Documentos API v1.0.0`);
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);
    console.log(`📁 Public folder: ${publicPath}`);
    console.log(`🔐 Autenticação: Ativa`);
    console.log(`🌐 Portal URL: ${PORTAL_URL}`);
    console.log('🚀 ================================\n');
});
