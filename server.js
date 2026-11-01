//IMPORTAÇÕES
import express from 'express';//facilita/acelera a criação de servidor web e APIs
import dotenv from 'dotenv';//gerencia variáveis de ambiente do .env pra usar no objeto process.env
import authRoutes from './backend/endpoints/auth.js'; 
import connection from './backend/database/connection.js';
import path from 'path';//trabalha com caminhos de arquivos e diretórios (módulo nativo do node.js)
import { fileURLToPath } from 'url';//acha o path respectivo do arquivo

//CONFIGURAÇÃO INICIAL
dotenv.config();//carrega as variáveis de ambiente do arquivo .env para o objeto process.env

/*middleware = função que intercepta a requisição antes de chegar na rota, podendo modificar a requisição ou resposta, ou até mesmo encerrar a requisição 
sem chegar na rota. Ex: autenticação, log, tratamento de erros, etc.*/
const app = express();//cria aplicação Express que registra middlewares, rotas e, no final, inicia o servidor.

app.use(express.json());//middleware que converte o corpo da requisição em JSON, permitindo acessar os dados via req.body

app.use('/api', authRoutes);//middleware que define a rota base para os endpoints de autenticação, prefixando com /api

const __filename = fileURLToPath(import.meta.url);//converte a URL do módulo atual em um caminho de arquivo absoluto
const __dirname = path.dirname(__filename);//obtém o diretório do arquivo atual

//SERVINDO O FRONTEND
app.use(express.static(path.join(__dirname, 'frontend')));
//path.join(__dirname, 'frontend') monta o caminho absoluto até a pasta frontend
//express.static transforma essa pasta em arquivos estáticos públicos: HTML, CSS, JS do navegador, imagens etc
//Ex: o arquivo frontend/css/style.css fica acessível em http://localhost:3000/css/style.css

// '/' = rota raiz do servidor, acessível em http://localhost:3000/
app.get('/', (req, res) => {//req = dados da requisição; res = objeto para responder
    res.sendFile(path.join(__dirname, 'frontend', 'home.html'));//envia o arquivo frontend/home.html como resposta
});

app.get('/api/funcionarios', async (req, res) => {
    try {
        const [resultado] = await connection.query(
            'SELECT * FROM funcionarios'
        );
        //O mysql2 retorna um array [linhas, metadados], a const [resultado] usa desestruturação para pegar só o primeiro item (as linhas) e ignorar os metadados
        //await pausa a função até o banco responder
        //connection.query(...) executa o SQL
        res.json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({//status 500 = erro interno do servidor
            erro: 'Erro ao consultar funcionários'
        });
    }
});

app.listen(3000, () => {//inicia o servidor na porta 3000, acessível em http://localhost:3000/
    console.log('Servidor rodando na porta 3000: http://localhost:3000/');
})
