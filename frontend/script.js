
document.addEventListener("DOMContentLoaded", async function() {

    async function verificar_token() {
        try {
            const resposta = await fetch('/api/perfil', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!resposta.ok) {
                console.log('Erro ao validar token:', resposta.status);
                return null;
            }

            const dados = await resposta.json();
            console.log('Resposta do perfil:', dados);

            return {
                email: dados.info.email,
                status: dados.info.status
            };

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Função para validar a senha
    const requisitos = {
        tamanho: (s) => s.length >= 8,
        maiuscula: (s) => /[A-Z]/.test(s),
        numero: (s) => /\d/.test(s),
        especial: (s) => /[^A-Za-z0-9]/.test(s),
    };

    // VALIDACOES
    function validarEmail() {
        const valido = emailRegex.test(emailInput.value.trim());
        emailErro.textContent = valido ? '' : 'Digite um e-mail válido.';
        return valido;
    }

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
        const senhaOk = Object.values(requisitos).every(
            (teste) => teste(senhaInput.value)
        );

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
        if (validarSenha()) listaRequisitos.classList.remove('visivel');
    });

    senhaInput.addEventListener('input', () => {
        senhaErro.textContent = '';
        validarSenha();
        atualizarBotao();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validarEmail() || !validarSenha()) return;

        btnLogin.disabled = true;

        let botao_enviou = e.submitter;

        
        try {
            console.log('yey');

            const resposta = await fetch('/api/login', {
                method: 'POST',
                credentials: 'same-origin',
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

                // O cookie é salvo automaticamente pelo navegador.
                // Agora verificamos se ele funciona.
                const info = await verificar_token();

                if (info && info.email) {
                    telaLogin.style.display = 'none';
                    telaSite.style.display = 'flex';


                } else {
                    senhaErro.textContent = 'Não foi possível validar sua sessão.';
                    btnLogin.disabled = false;
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

    // troca do modal login para colocar email
    const esqueciLink = document.getElementById('esqueci-a-senha');
    const loginBox = document.getElementById('login-box');
    const esquecibox = document.getElementById('esqueci-box');

    esqueciLink.addEventListener('click', () => {
        loginBox.style.display = 'none';
        esquecibox.style.display = 'flex';
    });

    // troca de modal colocar email para inserir código
    const codigoBox = document.getElementById('inserir-codigo-box');
    const emailBtn = document.getElementById('btn-esqueci');

    emailBtn.addEventListener('click', () => {
        esquecibox.style.display = 'none';
        codigoBox.style.display = 'flex';
    });

    // FUNÇÃO GENÉRICA DE OTP
    function setupOTP(container) {
        if (!container) return;

        const inputs = container.querySelectorAll('.otp-input');
        const continueBtn = container.querySelector('#btn-codigo, .continueBtn');
        const resendBtn = container.querySelector('#resendBtn, .resendBtn');
        const timerText = container.querySelector('#timerText');

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

                if (input.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }

                checkCode();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });

        container.addEventListener('paste', (e) => {
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');

            inputs.forEach((input, i) => {
                input.value = paste[i] || '';
            });

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
            inputs,
            continueBtn,
            resendBtn,
            startTimer,

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
            fetch(base_url + '/resend', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": csrfToken
                }
            })
            .then(r => r.json())
            .then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // VERIFICA SE JÁ EXISTE UMA SESSÃO
    let respostinha = await verificar_token();

    if (respostinha == null) {
    }

    if (respostinha && respostinha.email) {
        telaLogin.style.display = 'none';
        telaSite.style.display = 'flex';

        if (respostinha.status == 'teste') {

        }
    }

    //MENU DROPDOWN
    const btnDropdown = document.getElementById('menu-dropdown');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (btnDropdown && dropdownMenu) {
        btnDropdown.addEventListener('click', (e) => {
            e.stopPropagation(); //evita que o clique feche o menu imediatamente
            dropdownMenu.classList.toggle('show');
        });

        //fecha ao clicar fora
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && e.target !== btnDropdown) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    //MODO ESCURO
    const btnTema = document.querySelectorAll('.btn-tema');
    if (btnTema) {
        // aplica tema salvo ao carregar
        const temaSalvo = localStorage.getItem('witch-tema') || 'claro';
        document.documentElement.setAttribute('data-tema', temaSalvo === 'escuro' ? 'escuro' : '');
        btnTema.forEach((btn) => {
            btn.checked = temaSalvo === 'escuro';
        });

        btnTema.forEach((btn) => {
            btn.addEventListener('change', () => {
                const escuro = btn.checked;
                document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : '');
                localStorage.setItem('witch-tema', escuro ? 'escuro' : 'claro');
            });
        });
    }

    // ABRIR MODAIS
    const openButtons = document.querySelectorAll('.btn-open-modal');
    openButtons.forEach(button => { // para cada botão de abrir modal
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) { // ← proteção para evitar erros se o modal não existir
                modal.showModal(); // método nativo para mostrar modais <dialog>
                document.body.classList.add('modal-open');// classe para evitar scroll do fundo
            }
        });
    });

    //MODAL DO HISTÓRICO
    const modalHistorico = document.getElementById('modal-1');
    const historicoTable = document.getElementById('historico-table');
    const historicoBody = document.getElementById('historico-body');
    const historicoEmpty = document.getElementById('historico-empty');
    const fecharHistorico = document.getElementById('fechar-historico');

    let historico = [];

    //tipos de ação: classe de cor + texto exibido
    const TIPOS_ACAO = {
        edicao: { classe: 'edicao', texto: 'Edição de tabela' },
        senha:  { classe: 'senha',  texto: 'Troca de senha' },
        email:  { classe: 'email',  texto: 'Troca de e-mail' }
    };

    if (modalHistorico) {

        //função para montar a tabela do histórico
        function renderHistorico() {
            historicoBody.innerHTML = ''; //limpa linhas antigas

            if (historico.length === 0) {
                historicoEmpty.style.display = 'block';
                historicoTable.style.display = 'none';
                return;
            }

            historicoEmpty.style.display = 'none';
            historicoTable.style.display = 'table';

            historico.forEach(item => {
                const tipo = TIPOS_ACAO[item.tipo] || TIPOS_ACAO.edicao;

                const tr = document.createElement('tr');
                tr.className = 'acao-' + tipo.classe; //cor da linha

                //coluna 1: tipo da ação (etiqueta colorida)
                const td1 = document.createElement('td');
                const tag = document.createElement('span');
                tag.className = 'tag-acao ' + tipo.classe;
                tag.textContent = tipo.texto;
                td1.appendChild(tag);

                //coluna 2: descrição
                const td2 = document.createElement('td');
                td2.textContent = item.descricao;

                //coluna 3: data
                const td3 = document.createElement('td');
                td3.textContent = item.data;

                tr.append(td1, td2, td3);
                historicoBody.appendChild(tr);
            });
        }

        //busca o histórico no servidor
        async function carregarHistorico() {
            try {
                const res = await fetch(base_url + "/historico", {
                    method: "GET",
                    headers: { "X-CSRFToken": csrfToken }
                });
                const data = await res.json();

                //esperado: [{tipo:'senha', descricao:'Senha redefinida', data:'21/11/2026 14:30'}, ...]
                historico = data.historico;
                renderHistorico();
            } catch {
                mostrarToast('Erro ao carregar histórico', 'erro');
            }
        }

        //abre o modal (use o botão que você já tem com a classe open-modal)
        function abrirHistorico() {
            carregarHistorico();
            modalHistorico.showModal();
        }

        fecharHistorico.addEventListener('click', () => modalHistorico.close());

        //fecha ao clicar fora do modal
        modalHistorico.addEventListener('click', e => {
            if (e.target === modalHistorico) modalHistorico.close();
        });
    }

    const btnLogout = document.getElementById('btn-logout');

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {

            try {
                const resposta = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    console.log(dados.mensagem);

                    // Esconde a tela principal
                    telaSite.style.display = 'none';

                    // Exibe novamente a tela de login
                    telaLogin.style.display = 'flex';

                    // Limpa os campos
                    emailInput.value = '';
                    senhaInput.value = '';

                    // Habilita novamente o botão
                    btnLogin.disabled = false;

                } else {
                    console.log(dados.mensagem);
                }

            } catch (error) {
                console.error('Erro ao realizar logout:', error);
            }

        });
    }
});