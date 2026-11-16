document.addEventListener("DOMContentLoaded", function() {
    
    async function verificar_token() {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                console.log('Nenhum token encontrado.');
                return null;
            }

            const resposta = await fetch('/api/perfil', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const dados = await resposta.json();
            console.log('Resposta do perfil:', dados);

            if (resposta.ok) {
                return {
                    email: dados.info.email,
                    status: dados.info.status
                };
            } else {
                console.log('Erro ao validar token:', resposta.status, dados);
                return null;
            }

        } catch (error) {
            console.log('Erro ao contatar a API:', error);
            return null;
        }
    }

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

            if (icone === '✓') {icone.style.color = 'green';} else {icone.style.color = 'red';}

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
            console.log('yey')
            const resposta = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    senha: senhaInput.value,
                }),
            });
            console.log('yeyeye');
            const dados = await resposta.json();

            if (resposta.ok) {
                telaLogin.style.display = 'none';
                telaSite.style.display = 'flex';
                localStorage.setItem('token', dados.token);
                info = await verificar_token()

                if (info.email) {
                    alert('UHUUUUUUUUUUUU');
                }
            } else {
                senhaErro.textContent = dados.mensagem || 'Falha no login.';
                btnLogin.disabled = false;
            }
        } catch (erro) {
            senhaErro.textContent = 'Erro de conexão com o servidor.';
            btnLogin.disabled = false;
        }
    });

    verificar_token();

    //troca do modal login para colocar email
    const esqueciLink = document.getElementById('esqueci-a-senha');
    const loginBox = document.getElementById('login-box');
    const esquecibox = document.getElementById('esqueci-box');
    
    esqueciLink.addEventListener('click', () =>{
        loginBox.style.display = 'none';
        esquecibox.style.display = 'flex';
    });

    //troca de modal colocar email para inserir código
    const codigoBox = document.getElementById('inserir-codigo-box');
    const emailBtn = document.getElementById('btn-esqueci');
    emailBtn.addEventListener('click', () =>{
        esquecibox.style.display = 'none';
        codigoBox.style.display = 'flex';
    });

    // FUNÇÃO GENÉRICA DE OTP
    function setupOTP(container) {
        if (!container) return;

        const inputs      = container.querySelectorAll('.otp-input');
        const continueBtn = container.querySelector('#btn-codigo, .continueBtn');
        const resendBtn   = container.querySelector('#resendBtn, .resendBtn');
        const timerText   = container.querySelector('#timerText');

        if (!inputs.length) return;

        if (continueBtn) continueBtn.disabled = true;

        function checkCode() {
            if (!continueBtn) return;
            const code = Array.from(inputs).map(i => i.value).join('');
            continueBtn.disabled = code.length !== 5;
        }

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                input.value = e.target.value.replace(/[^0-9]/g, '');
                if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
                checkCode();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
            });
        });

        container.addEventListener('paste', (e) => {
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            inputs.forEach((input, i) => { input.value = paste[i] || ''; });
            checkCode();
        });

        // TIMER PARA REENVIO DE CÓDIGO
        let timeLeft = 60;
        let interval;

        function startTimer() {
            if (!resendBtn || !timerText) return;
            resendBtn.disabled = true;
            timeLeft = 60;
            clearInterval(interval);
            timerText.textContent = `Reenviar código em ${timeLeft}s`;
            interval = setInterval(() => {
                timeLeft--;
                timerText.textContent = `Reenviar código em ${timeLeft}s`;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    timerText.textContent = '';
                    resendBtn.disabled = false;
                }
            }, 1000);
        }

        return {
            inputs, continueBtn, resendBtn, startTimer,
            getCode: () => Array.from(inputs).map(i => i.value).join(''),
            reset: () => {
                inputs.forEach(i => i.value = '');
                if (continueBtn) continueBtn.disabled = true;
                clearInterval(interval);
                if (timerText) timerText.textContent = '';
            }
        };
    }

    // inicializa um OTP para cada contexto
    const insertCodeModal = document.querySelector('#modal-1 #insert-code') 
        || document.querySelector('#insert-code:not(#modal-3 #insert-code)');
    const otpLogin = insertCodeModal ? setupOTP(insertCodeModal) : null;

    // reenvio — login
    if (otpLogin?.resendBtn) {
        otpLogin.resendBtn.addEventListener('click', () => {
            fetch(base_url +'/resend', { method: 'GET', headers: { 'Content-Type': 'application/json', "X-CSRFToken":csrfToken } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }
});