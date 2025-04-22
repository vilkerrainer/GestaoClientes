import sqlite3

def get_db_connection():
    """Estabelece conexão com o banco de dados SQLite"""
    conn = sqlite3.connect('clientes.db')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Inicializa o banco de dados com as tabelas necessárias"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Criação das tabelas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        endereco TEXT
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        descricao TEXT NOT NULL,
        valor_compra REAL NOT NULL,
        valor_venda REAL NOT NULL,
        pago BOOLEAN DEFAULT 0,
        data TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )""")
    
    conn.commit()
    conn.close()

init_db()