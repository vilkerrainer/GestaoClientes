from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import logging
from database import get_db_connection

app = Flask(__name__)
CORS(app)

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Middleware para tratamento de erros
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint não encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500

# Rotas Clientes
@app.route('/clientes', methods=['GET'])
def listar_clientes():
    """Lista todos os clientes com suas compras"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM clientes")
        clientes = cursor.fetchall()
        
        clientes_com_compras = []
        for cliente in clientes:
            cursor.execute("""
            SELECT * FROM compras 
            WHERE cliente_id = ?""", (cliente['id'],))
            compras = cursor.fetchall()
            
            cliente_dict = dict(cliente)
            cliente_dict['compras'] = [dict(compra) for compra in compras]
            clientes_com_compras.append(cliente_dict)
        
        conn.close()
        return jsonify(clientes_com_compras)
    
    except Exception as e:
        logger.error(f"Erro ao listar clientes: {str(e)}")
        return jsonify({"error": "Erro ao buscar clientes"}), 500

@app.route('/clientes', methods=['POST'])
def criar_cliente():
    """Cria um novo cliente"""
    try:
        data = request.get_json()
        
        # Validação básica
        if not data.get('nome'):
            return jsonify({"error": "Nome do cliente é obrigatório"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
        INSERT INTO clientes (nome, endereco)
        VALUES (?, ?)""", (data['nome'], data.get('endereco')))
        
        cliente_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": cliente_id,
            "nome": data['nome'],
            "endereco": data.get('endereco'),
            "message": "Cliente criado com sucesso"
        }), 201
    
    except Exception as e:
        logger.error(f"Erro ao criar cliente: {str(e)}")
        return jsonify({"error": "Erro ao criar cliente"}), 500

@app.route('/clientes/<int:id>', methods=['PUT'])
def atualizar_cliente(id):
    """Atualiza um cliente existente"""
    try:
        data = request.get_json()
        
        if not data.get('nome'):
            return jsonify({"error": "Nome do cliente é obrigatório"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se o cliente existe
        cursor.execute("SELECT id FROM clientes WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        cursor.execute("""
        UPDATE clientes
        SET nome = ?, endereco = ?
        WHERE id = ?""", (data['nome'], data.get('endereco'), id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Cliente atualizado com sucesso",
            "id": id,
            "nome": data['nome'],
            "endereco": data.get('endereco')
        })
    
    except Exception as e:
        logger.error(f"Erro ao atualizar cliente: {str(e)}")
        return jsonify({"error": "Erro ao atualizar cliente"}), 500

@app.route('/clientes/<int:id>', methods=['DELETE'])
def excluir_cliente(id):
    """Exclui um cliente e suas compras relacionadas"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se o cliente existe
        cursor.execute("SELECT id FROM clientes WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        cursor.execute("DELETE FROM clientes WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Cliente e compras relacionadas excluídos com sucesso",
            "id": id
        })
    
    except Exception as e:
        logger.error(f"Erro ao excluir cliente: {str(e)}")
        return jsonify({"error": "Erro ao excluir cliente"}), 500

# Rotas Compras
@app.route('/compras', methods=['POST'])
def criar_compra():
    """Cria uma nova compra para um cliente"""
    try:
        data = request.get_json()
        logger.info(f"Dados recebidos para nova compra: {data}")
        
        # Validação dos campos obrigatórios
        required_fields = ['cliente_id', 'descricao', 'valor_compra']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Campos obrigatórios faltando"}), 400
        
        # Conversão e validação dos valores
        try:
            valor_compra = float(data['valor_compra'])
            valor_venda = float(data.get('valor_venda', data['valor_compra']))
            
            if valor_compra <= 0 or valor_venda <= 0:
                return jsonify({"error": "Valores devem ser positivos"}), 400
                
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Valores inválidos: {str(e)}"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se o cliente existe
        cursor.execute("SELECT id FROM clientes WHERE id = ?", (data['cliente_id'],))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        # Insere a nova compra
        cursor.execute("""
        INSERT INTO compras (cliente_id, descricao, valor_compra, valor_venda, data)
        VALUES (?, ?, ?, ?, ?)""", (
            data['cliente_id'],
            data['descricao'],
            valor_compra,
            valor_venda,
            datetime.now().isoformat()
        ))
        
        compra_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Compra adicionada com sucesso",
            "id": compra_id,
            "cliente_id": data['cliente_id'],
            "descricao": data['descricao'],
            "valor_compra": valor_compra,
            "valor_venda": valor_venda
        }), 201
    
    except Exception as e:
        logger.error(f"Erro ao criar compra: {str(e)}")
        return jsonify({"error": "Erro ao criar compra"}), 500

@app.route('/compras/<int:id>/pagar', methods=['PUT'])
def marcar_como_pago(id):
    """Alterna o status de pagamento de uma compra"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se a compra existe
        cursor.execute("SELECT id FROM compras WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Compra não encontrada"}), 404
        
        # Alterna o status de pagamento
        cursor.execute("""
        UPDATE compras
        SET pago = NOT pago
        WHERE id = ?""", (id,))
        
        conn.commit()
        
        # Obtém o novo status
        cursor.execute("SELECT pago FROM compras WHERE id = ?", (id,))
        novo_status = cursor.fetchone()['pago']
        conn.close()
        
        return jsonify({
            "message": "Status de pagamento atualizado",
            "id": id,
            "pago": bool(novo_status)
        })
    
    except Exception as e:
        logger.error(f"Erro ao atualizar status de pagamento: {str(e)}")
        return jsonify({"error": "Erro ao atualizar pagamento"}), 500

@app.route('/compras/<int:id>', methods=['DELETE'])
def excluir_compra(id):
    """Exclui uma compra específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se a compra existe
        cursor.execute("SELECT id FROM compras WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Compra não encontrada"}), 404
        
        cursor.execute("DELETE FROM compras WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Compra excluída com sucesso",
            "id": id
        })
    
    except Exception as e:
        logger.error(f"Erro ao excluir compra: {str(e)}")
        return jsonify({"error": "Erro ao excluir compra"}), 500
    
@app.route('/compras/<int:id>', methods=['PUT'])
def atualizar_compra(id):
    """Atualiza uma compra existente"""
    try:
        data = request.get_json()
        logger.info(f"Dados recebidos para atualização: {data}")

        # Validação dos campos obrigatórios
        required_fields = ['descricao', 'valor_compra', 'valor_venda']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Campos obrigatórios faltando"}), 400

        # Conversão e validação dos valores
        try:
            valor_compra = float(data['valor_compra'])
            valor_venda = float(data['valor_venda'])
            
            if valor_compra <= 0 or valor_venda <= 0:
                return jsonify({"error": "Valores devem ser positivos"}), 400
                
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Valores inválidos: {str(e)}"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se a compra existe
        cursor.execute("SELECT id FROM compras WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Compra não encontrada"}), 404
        
        # Atualiza a compra
        cursor.execute("""
        UPDATE compras 
        SET descricao = ?, valor_compra = ?, valor_venda = ?
        WHERE id = ?""", (
            data['descricao'],
            valor_compra,
            valor_venda,
            id
        ))
        
        conn.commit()
        
        # Obtém a compra atualizada
        cursor.execute("SELECT * FROM compras WHERE id = ?", (id,))
        compra_atualizada = cursor.fetchone()
        conn.close()
        
        return jsonify({
            "message": "Compra atualizada com sucesso",
            "compra": dict(compra_atualizada)
        })
    
    except Exception as e:
        logger.error(f"Erro ao atualizar compra: {str(e)}")
        return jsonify({"error": "Erro ao atualizar compra"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)