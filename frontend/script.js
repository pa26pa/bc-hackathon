document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('login-form');
    const telaLogin = document.getElementById('login-div');
    const telaSite = document.getElementById('home-div');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const btnLogin = document.getElementById('btn-login');
    const emailErro = document.getElementById('email-erro');
    const senhaErro = document.getElementById('senha-erro');
    const listaRequisitos = document.getElementById('requisitos');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;// Regex para validar o formato do email

    // Função para validar a senha
    const requisitos = {
        tamanho: (s) => s.length >= 8,// Verifica se a senha tem pelo menos 8 caracteres
        maiuscula: (s) => /[A-Z]/.test(s),// Verifica se a senha contém pelo menos uma letra maiúscula
        numero: (s) => /\d/.test(s),// Verifica se a senha contém pelo menos um número
        especial: (s) => /[^A-Za-z0-9]/.test(s),// Verifica se a senha contém pelo menos um caractere especial
    };

    //VALIDAÇÕES 
    function validarEmail() {
        const valido = emailRegex.test(emailInput.value.trim());
        emailErro.textContent = valido ? '' : 'Digite um e-mail válido.';
        return valido;
    }

    // atualiza a lista visual e devolve true se todos os requisitos foram cumpridos
    function validarSenha() {
        const senha = senhaInput.value;
        let tudoOk = true;

        for (const [nome, teste] of Object.entries(requisitos)) {
            const li = listaRequisitos.querySelector(`[data-req="${nome}"]`);
            const icone = li.querySelector('.icone');
            const cumprido = teste(senha);

            li.classList.toggle('ok', cumprido);
            icone.textContent = cumprido ? '✓' : '✗';

            if (!cumprido) tudoOk = false;
        }

        return tudoOk;
    }

    function atualizarBotao() {
        const emailOk = emailRegex.test(emailInput.value.trim());
        const senhaOk = Object.values(requisitos).every((teste) => teste(senhaInput.value));
        btnLogin.disabled = !(emailOk && senhaOk);
    }

    // ===== Eventos =====
    emailInput.addEventListener('input', () => {
        validarEmail();
        atualizarBotao();
    });

    senhaInput.addEventListener('focus', () => {
        listaRequisitos.classList.add('visivel');
        validarSenha();
    });

    senhaInput.addEventListener('blur', () => {
        // só esconde a lista se a senha já estiver válida
        if (validarSenha()) listaRequisitos.classList.remove('visivel');
    });

    senhaInput.addEventListener('input', () => {
        senhaErro.textContent = ''; // limpa erro vindo do servidor
        validarSenha();
        atualizarBotao();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // não recarrega a página

        // revalida por segurança (o botão pode ser reativado via DevTools)
        if (!validarEmail() || !validarSenha()) return;

        btnLogin.disabled = true; // evita cliques duplicados

        try {
            console.log(emailInput.value.trim());
            console.log(senhaInput.value.trim());
            const resposta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    senha: senhaInput.value,
                }),
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                telaLogin.style.display = 'none';
                telaSite.style.display = 'flex';
            } else {
                senhaErro.textContent = dados.mensagem || 'Falha no login.';
                btnLogin.disabled = false;
            }
        } catch (erro) {
            senhaErro.textContent = 'Erro de conexão com o servidor.';
            btnLogin.disabled = false;
        }
    });
});

// OI LARI, mano ignora esse código, fiz para termos uma ideia de como chamar a API
// const button = document.getElementById('teste')

// button.addEventListener("click", async() => {
//     const novoUsuario = {
//         email: 'teste@gmail.com',
//         senha: '123456'
//     };
//     try {
//         const resposta = await fetch('http://localhost:3000/api/teste_email', {
//             method: 'POST',

//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(novoUsuario)
//         });

//         const resultado = await resposta.json();

//         if (resposta.ok) {
//             console.log('Login realizado com sucesso:', resultado);
//         } else {
//             console.log('Erro:', resultado.mensagem);         
//         }

//     } catch (error) {
//         console.error('Erro ao conectar com o servidor:', error);
//     }

//     alert("Button was clicked!");
// });
