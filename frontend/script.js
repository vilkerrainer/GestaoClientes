const API_URL = "http://localhost:8000";
let clienteEditandoId = null;
let compraEditandoId = null;
let modalCompraClienteId = null;

// Verificação inicial do carregamento
console.log("Script carregado completamente");

// Função para escapar strings para uso em HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM totalmente carregado");
    carregarClientes();
    document.getElementById('formCliente').addEventListener('submit', cadastrarCliente);
});

// ========== FUNÇÕES DE CLIENTE ==========
async function carregarClientes() {
    try {
        console.log("Carregando clientes...");
        const response = await fetch(`${API_URL}/clientes`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const text = await response.text();
        console.log("Resposta recebida:", text);
        
        if (!text.trim()) {
            throw new Error("Resposta vazia do servidor");
        }
        
        const clientes = JSON.parse(text);
        renderizarClientes(clientes);
        atualizarDashboard(clientes);
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        alert("Erro ao carregar clientes. Verifique o console para detalhes.");
    }
}

async function cadastrarCliente(e) {
    e.preventDefault();
    
    const cliente = {
        nome: document.getElementById('nome').value.trim(),
        endereco: document.getElementById('endereco').value.trim()
    };

    if (!cliente.nome) {
        alert("O nome do cliente é obrigatório!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao cadastrar cliente');
        }

        document.getElementById('formCliente').reset();
        await carregarClientes();
        alert("Cliente cadastrado com sucesso!");
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);
        alert(`Erro: ${error.message}`);
    }
}

function abrirModalCliente(cliente = null) {
    const modal = document.getElementById('modalCliente');
    if (cliente) {
        clienteEditandoId = cliente.id;
        document.getElementById('editarNome').value = cliente.nome || '';
        document.getElementById('editarEndereco').value = cliente.endereco || '';
    } else {
        clienteEditandoId = null;
    }
    modal.style.display = 'flex';
}

async function salvarEdicaoCliente() {
    const cliente = {
        nome: document.getElementById('editarNome').value.trim(),
        endereco: document.getElementById('editarEndereco').value.trim()
    };

    if (!cliente.nome) {
        alert("O nome do cliente é obrigatório!");
        return;
    }

    try {
        const url = clienteEditandoId ? `${API_URL}/clientes/${clienteEditandoId}` : `${API_URL}/clientes`;
        const method = clienteEditandoId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao salvar cliente');
        }

        fecharModal('modalCliente');
        await carregarClientes();
        alert("Cliente salvo com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        alert(`Erro: ${error.message}`);
    }
}

async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente e todas suas compras?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/clientes/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir cliente');
        }

        await carregarClientes();
        alert("Cliente excluído com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        alert(`Erro: ${error.message}`);
    }
}

// ========== FUNÇÕES DE COMPRA ==========
function abrirModalCompra(clienteId, compraJson = null) {
    modalCompraClienteId = clienteId;
    let compra = null;

    if (compraJson) {
        try {
            if (typeof compraJson === 'string') {
                // Remove aspas extras se existirem
                if (compraJson.startsWith('"') && compraJson.endsWith('"')) {
                    compraJson = compraJson.slice(1, -1);
                }
                compra = JSON.parse(compraJson);
            } else {
                compra = compraJson;
            }
            compraEditandoId = compra.id;
        } catch (e) {
            console.error("Erro ao parsear compra:", e);
            alert("Erro ao carregar dados da compra");
            return;
        }
    } else {
        compraEditandoId = null;
    }

    const form = document.getElementById('modalCompra');
    form.querySelector('#compraDescricao').value = compra ? compra.descricao : '';
    form.querySelector('#compraValor').value = compra ? compra.valor_compra : '';
    form.querySelector('#vendaValor').value = compra ? compra.valor_venda : '';
    
    document.getElementById('modalCompra').style.display = 'flex';
}

async function salvarCompra() {
    const descricao = document.getElementById('compraDescricao').value.trim();
    const valorCompra = document.getElementById('compraValor').value.trim();
    const valorVenda = document.getElementById('vendaValor').value.trim() || valorCompra;

    if (!descricao || !valorCompra) {
        alert("Por favor, preencha todos os campos obrigatórios!");
        return;
    }

    // Validação dos valores numéricos
    let valorCompraNum, valorVendaNum;
    try {
        valorCompraNum = parseFloat(valorCompra);
        valorVendaNum = parseFloat(valorVenda);
        
        if (isNaN(valorCompraNum) || isNaN(valorVendaNum)) {
            throw new Error("Valores inválidos");
        }
        
        if (valorCompraNum <= 0 || valorVendaNum <= 0) {
            throw new Error("Valores devem ser positivos");
        }
    } catch (error) {
        alert(`Erro: ${error.message}`);
        return;
    }

    const compra = {
        descricao: descricao,
        valor_compra: valorCompraNum,
        valor_venda: valorVendaNum
    };

    try {
        let url, method;
        
        if (compraEditandoId) {
            // Edição de compra existente
            url = `${API_URL}/compras/${compraEditandoId}`;
            method = 'PUT';
        } else {
            // Nova compra
            url = `${API_URL}/compras`;
            method = 'POST';
            compra.cliente_id = modalCompraClienteId;
        }
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compra)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar compra');
        }

        const data = await response.json();
        console.log("Resposta do servidor:", data);

        fecharModal('modalCompra');
        await carregarClientes();
        alert(compraEditandoId ? "Compra atualizada com sucesso!" : "Compra cadastrada com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar compra:", error);
        alert(`Erro: ${error.message}`);
    } finally {
        compraEditandoId = null;
        modalCompraClienteId = null;
    }
}

async function togglePagamento(compraId, elemento) {
    try {
        const response = await fetch(`${API_URL}/compras/${compraId}/pagar`, {
            method: 'PUT'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao atualizar pagamento');
        }
        
        elemento.textContent = data.pago ? '✅ Pago' : '❌ Pendente';
        elemento.className = data.pago ? 'pago' : 'pendente';
    } catch (error) {
        console.error("Erro ao atualizar pagamento:", error);
        alert(`Erro: ${error.message}`);
    }
}

async function excluirCompra(id) {
    if (!confirm('Tem certeza que deseja excluir esta compra?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/compras/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir compra');
        }

        await carregarClientes();
        alert("Compra excluída com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir compra:", error);
        alert(`Erro: ${error.message}`);
    }
}

// ========== FUNÇÕES DE RENDERIZAÇÃO ==========
function renderizarClientes(clientes) {
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = '<h2>Clientes Cadastrados</h2>';
    
    if (!clientes || clientes.length === 0) {
        listaClientes.innerHTML += '<p>Nenhum cliente cadastrado</p>';
        return;
    }
    
    clientes.forEach(cliente => {
        const clienteElement = document.createElement('div');
        clienteElement.className = 'cliente-item';
        
        // Processa as compras para garantir que é um array
        const compras = Array.isArray(cliente.compras) ? cliente.compras : [];
        
        // Prepara os dados para exibição
        const nomeCliente = escapeHtml(cliente.nome || 'Sem nome');
        const enderecoCliente = escapeHtml(cliente.endereco || 'Não informado');
        const clienteJson = escapeHtml(JSON.stringify(cliente));
        
        clienteElement.innerHTML = `
            <div class="cliente-cabecalho">
                <h3>${nomeCliente}</h3>
                <div class="cliente-acoes">
                    <button onclick="abrirModalCompra(${cliente.id})">+ Compra</button>
                    <button onclick="abrirModalCliente(${clienteJson})">Editar</button>
                    <button class="btn-excluir" onclick="excluirCliente(${cliente.id})">Excluir</button>
                </div>
            </div>
            <div class="cliente-info">
                <p><strong>Endereço:</strong> ${enderecoCliente}</p>
            </div>
            <div class="compras-lista" id="compras-${cliente.id}">
                <h4>Compras:</h4>
                ${compras.length > 0 ? 
                    compras.map(compra => renderizarCompra(compra)).join('') : 
                    '<p>Nenhuma compra registrada</p>'
                }
            </div>
        `;
        
        listaClientes.appendChild(clienteElement);
    });
}

function renderizarCompra(compra) {
    // Garante que os valores numéricos são válidos
    const valorCompra = parseFloat(compra.valor_compra) || 0;
    const valorVenda = parseFloat(compra.valor_venda) || valorCompra;
    const lucro = valorVenda - valorCompra;
    const lucroClass = lucro >= 0 ? 'positivo' : 'negativo';
    const pagoClass = compra.pago ? 'pago' : 'pendente';
    const pagoText = compra.pago ? '✅ Pago' : '❌ Pendente';
    
    // Formata a data
    let dataFormatada = 'Data não informada';
    try {
        dataFormatada = compra.data ? new Date(compra.data).toLocaleDateString() : 'Data não informada';
    } catch (e) {
        console.error("Erro ao formatar data:", e);
    }
    
    // Prepara os dados para exibição
    const descricao = escapeHtml(compra.descricao || 'Sem descrição');
    const compraJson = escapeHtml(JSON.stringify(compra));
    
    return `
        <div class="compra-item">
            <div class="compra-info">
                <p><strong>${descricao}</strong></p>
                <p>${dataFormatada}</p>
            </div>
            <div class="compra-valores">
                <span class="valor-compra">Compra: R$ ${valorCompra.toFixed(2)}</span>
                <span class="valor-venda">Venda: R$ ${valorVenda.toFixed(2)}</span>
                <span class="lucro ${lucroClass}">Lucro: R$ ${Math.abs(lucro).toFixed(2)}</span>
            </div>
            <div class="compra-status">
                <span class="${pagoClass}" onclick="togglePagamento(${compra.id}, this)">
                    ${pagoText}
                </span>
            </div>
            <div class="compra-acoes">
                <button onclick="abrirModalCompra(${compra.cliente_id}, '${compraJson}')">Editar</button>
                <button class="btn-excluir" onclick="excluirCompra(${compra.id})">Excluir</button>
            </div>
        </div>
    `;
}

function atualizarDashboard(clientes) {
    const dashboard = document.getElementById('dashboard');
    
    if (!clientes || clientes.length === 0) {
        dashboard.innerHTML = '<h2>Dashboard</h2><p>Nenhum dado disponível</p>';
        return;
    }

    // Inicializa os totais
    let totalClientes = 0;
    let totalCompras = 0;
    let totalCompra = 0;
    let totalVenda = 0;
    let totalPago = 0;
    let totalPendente = 0;

    // Calcula os totais
    clientes.forEach(cliente => {
        totalClientes++;
        
        if (cliente.compras && Array.isArray(cliente.compras)) {
            totalCompras += cliente.compras.length;
            
            cliente.compras.forEach(compra => {
                const valorCompra = parseFloat(compra.valor_compra) || 0;
                const valorVenda = parseFloat(compra.valor_venda) || valorCompra;
                
                totalCompra += valorCompra;
                totalVenda += valorVenda;
                
                if (compra.pago) {
                    totalPago += valorVenda;
                } else {
                    totalPendente += valorVenda;
                }
            });
        }
    });
    
    const lucroTotal = totalVenda - totalCompra;
    
    dashboard.innerHTML = `
        <h2>Dashboard Financeiro</h2>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h3>Clientes</h3>
                <p>Total: ${totalClientes}</p>
            </div>
            <div class="dashboard-card">
                <h3>Vendas</h3>
                <p>Total: ${totalCompras}</p>
            </div>
            <div class="dashboard-card">
                <h3>Valores</h3>
                <p>Total Compra: R$ ${totalCompra.toFixed(2)}</p>
                <p>Total Venda: R$ ${totalVenda.toFixed(2)}</p>
            </div>
            <div class="dashboard-card">
                <h3>Pagamentos</h3>
                <p>Pago: R$ ${totalPago.toFixed(2)}</p>
                <p>Pendente: R$ ${totalPendente.toFixed(2)}</p>
            </div>
            <div class="dashboard-card">
                <h3>Lucro Total</h3>
                <p class="${lucroTotal >= 0 ? 'positivo' : 'negativo'}">
                    R$ ${lucroTotal.toFixed(2)}
                </p>
            </div>
        </div>
    `;
}

// ========== FUNÇÕES AUXILIARES ==========
function fecharModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Previne fechamento do modal ao clicar dentro dele
document.querySelectorAll('.modal-conteudo').forEach(modal => {
    modal.addEventListener('click', e => e.stopPropagation());
});

// Fecha modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function() {
        this.style.display = 'none';
    });
});

// Verificação final
console.log("Script inicializado com sucesso");