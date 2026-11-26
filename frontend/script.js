
document.addEventListener("DOMContentLoaded", async function () {

    // ===== CONFIGURAÇÕES =====
    const base_url = '/api';
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    // ===== TOAST =====
    // tipo: 'erro' (vermelho), 'aviso' (amarelo), 'info' (azul) ou 'sucesso' (verde)
    // Obs.: o toast fica ATRÁS de um <dialog> aberto, por isso os modais
    // mostram suas mensagens dentro deles.
    function mostrarToast(mensagem, tipo = 'info', duracao = 3500) {
        const toast = document.createElement('div');
        toast.textContent = mensagem;

        const cores = {
            erro: '#ef4444',
            aviso: '#f59e0b',
            info: '#3b82f6'
        };

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            maxWidth: 'min(380px, 90vw)',
            padding: '12px 20px',
            borderRadius: '10px',
            color: '#fff',
            background: cores[tipo] || '#22c55e',
            zIndex: 99999,
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,.3)'
        });

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duracao);
    }

    // Envia JSON para a API e devolve { ok, status, dados }.
    async function enviarJson(url, metodo, corpo) {
        const resposta = await fetch(url, {
            method: metodo,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });

        let dados = {};

        try {
            dados = await resposta.json();
        } catch (erro) {
            dados = {};
        }

        return { ok: resposta.ok, status: resposta.status, dados };
    }

    // ===== VERIFICAR SESSÃO =====
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

    // ===== ELEMENTOS PRINCIPAIS =====
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

    const requisitos = {
        tamanho: (s) => s.length >= 8,
        maiuscula: (s) => /[A-Z]/.test(s),
        numero: (s) => /\d/.test(s),
        especial: (s) => /[^A-Za-z0-9]/.test(s)
    };

    // ===== VALIDAÇÕES =====
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
            icone.classList.toggle('ok', cumprido);
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

    emailInput.addEventListener('input', () => {
        validarEmail();
        atualizarBotao();
    });

    senhaInput.addEventListener('focus', () => {
        listaRequisitos.classList.add('visivel');
        validarSenha();
    });

    senhaInput.addEventListener('blur', () => {
        if (validarSenha()) {
            listaRequisitos.classList.remove('visivel');
        }
    });

    senhaInput.addEventListener('input', () => {
        senhaErro.textContent = '';
        validarSenha();
        atualizarBotao();
    });

    atualizarBotao();

    // ===== LOGIN =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validarEmail() || !validarSenha()) return;

        btnLogin.disabled = true;

        try {
            const resposta = await fetch('/api/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    senha: senhaInput.value
                })
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                const info = await verificar_token();

                if (info && info.email) {
                    telaLogin.style.display = 'none';
                    telaSite.style.display = 'flex';

                    mostrarToast(
                        'Login realizado! Abra o menu (☰) e vá em "Segurança" para cadastrar o seu e-mail e a sua senha.',
                        'info',
                        9000
                    );

                    await carregarHorariosPadrao();
                } else {
                    senhaErro.textContent = 'Não foi possível validar sua sessão.';
                    btnLogin.disabled = false;
                }

            } else {
                senhaErro.textContent = dados.mensagem || 'Falha no login.';
                btnLogin.disabled = false;
            }

        } catch (erro) {
            console.error('Erro no login:', erro);
            senhaErro.textContent = 'Erro de conexão com o servidor.';
            btnLogin.disabled = false;
        }
    });

    // ===== ESQUECI A SENHA / CÓDIGO OTP =====
    const esqueciLink = document.getElementById('esqueci-a-senha');
    const loginBox = document.getElementById('login-box');
    const esqueciBox = document.getElementById('esqueci-box');
    const esqueciForm = document.getElementById('esqueci-form');
    const esqueciEmail = document.getElementById('esqueci-email');
    const esqueciEmailErro = document.getElementById('esqueci-email-erro');
    const codigoBox = document.getElementById('inserir-codigo-box');
    const codigoForm = document.getElementById('inserir-codigo-form');

    function setupOTP(container) {
        if (!container) return null;

        const inputs = container.querySelectorAll('.otp-input');
        const continueBtn = container.querySelector('#btn-codigo');
        const resendBtn = container.querySelector('#resendBtn');
        const timerText = container.querySelector('#timerText');

        if (!inputs.length) return null;

        if (continueBtn) continueBtn.disabled = true;

        function checkCode() {
            if (!continueBtn) return;

            const code = Array.from(inputs)
                .map(i => i.value)
                .join('');

            continueBtn.disabled = code.length !== inputs.length;
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
            e.preventDefault();

            const paste = e.clipboardData
                .getData('text')
                .replace(/[^0-9]/g, '');

            inputs.forEach((input, i) => {
                input.value = paste[i] || '';
            });

            checkCode();
        });

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

            getCode: () => {
                return Array.from(inputs)
                    .map(i => i.value)
                    .join('');
            },

            reset: () => {
                inputs.forEach(i => i.value = '');

                if (continueBtn) continueBtn.disabled = true;

                clearInterval(interval);

                if (timerText) timerText.textContent = '';
            }
        };
    }

    const otpLogin = setupOTP(codigoBox);

    esqueciLink.addEventListener('click', (e) => {
        e.preventDefault();

        loginBox.style.display = 'none';
        esqueciBox.style.display = 'flex';
    });

    
    esqueciForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const email = esqueciEmail.value.trim();

        if (!emailRegex.test(email)) {
            esqueciEmailErro.textContent = 'Digite um e-mail válido.';
            return;
        }

        esqueciEmailErro.textContent = '';

        try {

            const resposta = await fetch('/api/enviando_codigo', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarToast(dados.mensagem || 'Não foi possível enviar o código.', 'erro');
                return;
            }

            mostrarToast(dados.mensagem, 'sucesso');

            esqueciBox.style.display = 'none';
            codigoBox.style.display = 'flex';

            if (otpLogin) {
                otpLogin.reset();
                otpLogin.startTimer();
            }

        } catch (erro) {

            console.error('Erro ao solicitar código:', erro);

            mostrarToast('Erro de conexão com o servidor.', 'erro');
        }
    });


    //MUDANÇA COM IAAAAAAAAAAA
    // ===== VERIFICAR CÓDIGO =====
    const senhaBox = document.getElementById('senha-box');
    const codigoErro = document.getElementById('codigo-erro');

    
    codigoForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const btnCodigo = document.getElementById('btn-codigo');

        btnCodigo.disabled = true;
        codigoErro.textContent = '';

        try {

            const resposta = await fetch('/api/checar_codigo', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    codigo_inserido: otpLogin.getCode()
                })
            });

            const dados = await resposta.json();

            if (resposta.ok) {

                codigoBox.style.display = 'none';
                senhaBox.style.display = 'flex';

                otpLogin.reset();

            } else {

                codigoErro.textContent = dados.mensagem || 'Código inválido.';
                btnCodigo.disabled = false;
            }

        } catch (erro) {

            console.error('Erro ao verificar código:', erro);

            codigoErro.textContent = 'Erro de conexão com o servidor.';
            btnCodigo.disabled = false;
        }
    });


    // ===== NOVA SENHA =====
    const senhaForm = document.getElementById('senha-form');
    const novaSenhaInput = document.getElementById('nova-senha');
    const confirmarSenhaInput = document.getElementById('confirmar-senha');
    const confirmarSenhaErro = document.getElementById('confirmar-senha-erro');
    const listaRequisitosNova = document.getElementById('requisitos-nova');
    const btnSenha = document.getElementById('btn-senha');

    function validarNovaSenha() {
        const senha = novaSenhaInput.value;
        let tudoOk = true;

        for (const [nome, teste] of Object.entries(requisitos)) {
            const li = listaRequisitosNova.querySelector(`[data-req="${nome}"]`);
            const icone = li.querySelector('.icone');
            const cumprido = teste(senha);

            li.classList.toggle('ok', cumprido);
            icone.classList.toggle('ok', cumprido);
            icone.textContent = cumprido ? '✓' : '✗';

            if (!cumprido) tudoOk = false;
        }
        return tudoOk;
    }

    function validarConfirmacao() {
        const confirmacao = confirmarSenhaInput.value;
        const iguais = confirmacao === novaSenhaInput.value;

        // só mostra erro depois que o usuário começou a digitar a confirmação
        confirmarSenhaErro.textContent =
            confirmacao && !iguais ? 'As senhas não coincidem.' : '';

        return iguais && confirmacao.length > 0;
    }

    function atualizarBotaoSenha() {
        btnSenha.disabled = !(validarNovaSenha() && validarConfirmacao());
    }

    novaSenhaInput.addEventListener('focus', () => {
        listaRequisitosNova.classList.add('visivel');
        validarNovaSenha();
    });

    novaSenhaInput.addEventListener('blur', () => {
        if (validarNovaSenha()) {
            listaRequisitosNova.classList.remove('visivel');
        }
    });

    novaSenhaInput.addEventListener('input', atualizarBotaoSenha);
    confirmarSenhaInput.addEventListener('input', atualizarBotaoSenha);

    function voltarParaLogin() {
        senhaForm.reset();
        listaRequisitosNova.classList.remove('visivel');
        confirmarSenhaErro.textContent = '';
        validarNovaSenha();
        btnSenha.disabled = true;

        senhaBox.style.display = 'none';
        loginBox.style.display = 'flex';

        // limpa o formulário de login também
        form.reset();
        emailErro.textContent = '';
        senhaErro.textContent = '';
        validarSenha();
        atualizarBotao();
    }

    
    senhaForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        if (!validarNovaSenha() || !validarConfirmacao()) return;

        btnSenha.disabled = true;

        try {

            const resposta = await fetch('/api/redefinir_senha', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    senha_nova: novaSenhaInput.value
                })
            });

            const dados = await resposta.json();

            if (resposta.ok) {

                mostrarToast('Senha alterada com sucesso!', 'sucesso');

                voltarParaLogin();

            } else {

                confirmarSenhaErro.textContent =
                    dados.mensagem || 'Não foi possível redefinir a senha.';

                btnSenha.disabled = false;
            }

        } catch (erro) {

            console.error('Erro ao redefinir senha:', erro);

            confirmarSenhaErro.textContent = 'Erro de conexão com o servidor.';
            btnSenha.disabled = false;
        }
    });


    document.getElementById('voltar-senha').addEventListener('click', voltarParaLogin);

    document.getElementById('voltar-esqueci').addEventListener('click', () => {
        esqueciBox.style.display = 'none';
        loginBox.style.display = 'flex';
    });

    document.getElementById('voltar-codigo').addEventListener('click', () => {
        codigoBox.style.display = 'none';
        esqueciBox.style.display = 'flex';

        if (otpLogin) otpLogin.reset();
    });

        
    if (otpLogin?.resendBtn) {

        otpLogin.resendBtn.addEventListener('click', async () => {

            try {

                const resposta = await fetch('/api/enviando_codigo', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: esqueciEmail.value.trim()
                    })
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    mostrarToast(dados.mensagem || 'Erro ao reenviar código.', 'erro');
                    return;
                }

                mostrarToast('Novo código enviado!', 'sucesso');
                otpLogin.reset();
                otpLogin.startTimer();

            } catch (erro) {

                console.error('Erro ao reenviar código:', erro);

                mostrarToast('Erro ao reenviar código.', 'erro');
            }
        });
    }


    // aaa
    // ===== HORÁRIOS DAS TURMAS =====

    // Os horários são os horários de início das aulas,
    // conforme aparecem no PDF.

    const HORARIOS_MTEC_1A = [
        { h: '07:00' },
        { h: '07:50' },
        { h: '08:40' },
        { h: '09:30', fixo: 'Intervalo' },
        { h: '09:45' },
        { h: '10:35' },
        { h: '11:25' },
        { h: '12:15', fixo: 'Almoço' },
        { h: '13:15' },
        { h: '14:05' },
        { h: '14:40' }
    ];

    const HORARIOS_MTEC_1B = [
        { h: '09:45' },
        { h: '10:20' },
        { h: '11:10' },
        { h: '12:00', fixo: 'Almoço' },
        { h: '13:00' },
        { h: '13:50' },
        { h: '14:40' },
        { h: '15:45' },
        { h: '16:35' },
        { h: '17:25' }
    ];

    const HORARIOS_MANHA = [
        { h: '07:00' },
        { h: '07:50' },
        { h: '08:40' },
        { h: '09:30', fixo: 'Intervalo' },
        { h: '09:45' },
        { h: '10:35' },
        { h: '11:25' }
    ];

    const HORARIOS_TARDE = [
        { h: '13:00' },
        { h: '13:50' },
        { h: '14:40' },
        { h: '15:45' },
        { h: '16:35' },
        { h: '17:25' }
    ];

    const DIAS = [
        'Segunda',
        'Terça',
        'Quarta',
        'Quinta',
        'Sexta'
    ];

    // ===== SEIS TURMAS =====

    const TURMAS = [
        {
            nome: 'MTEC – 1ª Série A',
            serie: 1,
            curso: 'MTEC - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MTEC_1A
        },
        {
            nome: 'MTEC – 1ª Série B',
            serie: 1,
            curso: 'MTEC - Turma B',
            periodo: 'Tarde',
            horarios: HORARIOS_MTEC_1B
        },
        {
            nome: 'Novotec Integrado – 2ª Série A',
            serie: 2,
            curso: 'Novotec Integrado - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: 'Novotec Integrado – 3ª Série A',
            serie: 3,
            curso: 'Novotec Integrado - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: 'Novotec Integrado – 2ª Série B',
            serie: 2,
            curso: 'Novotec Integrado - Turma B',
            periodo: 'Tarde',
            horarios: HORARIOS_TARDE
        },
        {
            nome: 'Novotec Integrado – 3ª Série B',
            serie: 3,
            curso: 'Novotec Integrado - Turma B',
            periodo: 'Tarde',
            horarios: HORARIOS_TARDE
        }
    ];

    const gradesContainer = document.getElementById('grades-container');
    const controlesFiltro = {
        turma: document.getElementById('filtro-turma'),
        grupo: document.getElementById('filtro-grupo'),
        professor: document.getElementById('filtro-professor'),
        disciplina: document.getElementById('filtro-disciplina'),
        sala: document.getElementById('filtro-sala')
    };

        // Normaliza o horário para comparar os registros.
    function normalizarHorario(horario) {
        if (!horario) return '';
        return String(horario).slice(0, 5);
    }


    // Monta as aulas de acordo com o grupo selecionado.
    function montarAulasDoGrupo(aulas, grupoSelecionado) {

        const aulasA = aulas.filter(aula =>
            aula.grupo === 'A/Inteira'
        );

        if (grupoSelecionado !== 'B') {
            return aulasA;
        }

        const aulasB = aulas.filter(aula =>
            aula.grupo === 'B'
        );

        const resultado = [...aulasA];

        aulasB.forEach(aulaB => {
            const horarioB = normalizarHorario(aulaB.horario);

            const indices = resultado
                .map((aula, index) => ({ aula, index }))
                .filter(item =>
                    item.aula.dia_semana === aulaB.dia_semana &&
                    normalizarHorario(item.aula.horario) === horarioB
                )
                .map(item => item.index);

            indices.reverse().forEach(index => {
                resultado.splice(index, 1);
            });

            resultado.push(aulaB);
        });

        return resultado;
    }
    function preencherSelect(select, textoPadrao, opcoes) {
        if (!select) return;

        select.innerHTML = '';
        const primeiraOpcao = document.createElement('option');
        primeiraOpcao.value = '';
        primeiraOpcao.textContent = textoPadrao;
        select.appendChild(primeiraOpcao);

        opcoes.forEach(({ valor, texto }) => {
            const opcao = document.createElement('option');
            opcao.value = valor;
            opcao.textContent = texto;
            select.appendChild(opcao);
        });
    }

    function obterNomeTurma(item) {
        const turmaEncontrada = TURMAS.find(turma =>
            Number(turma.serie) === Number(item.serie) &&
            String(turma.curso || '').trim() === String(item.curso || '').trim() &&
            String(turma.periodo || '').trim() === String(item.periodo || '').trim()
        );

        return turmaEncontrada
            ? turmaEncontrada.nome
            : `${item.serie}º ano - ${item.curso}`;
    }

    function popularFiltros(horarios) {
        const turmas = new Map();
        const professores = new Map();
        const disciplinas = new Map();
        const salas = new Set();

        horarios.forEach(item => {
            const chaveTurma = `${item.serie}|${item.curso}`;

            turmas.set(
                chaveTurma,
                obterNomeTurma(item)
            );

            if (item.id_professor && item.professor) {
                professores.set(
                    String(item.id_professor),
                    item.professor
                );
            }

            if (item.id_materia && item.materia) {
                disciplinas.set(
                    String(item.id_materia),
                    item.materia
                );
            }

            if (item.sala) {
                salas.add(String(item.sala));
            }
        });

        preencherSelect(
            controlesFiltro.turma,
            'Todas as turmas',
            [...turmas]
                .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
                .map(([valor, texto]) => ({ valor, texto }))
        );

        preencherSelect(
            controlesFiltro.grupo,
            'Todos os grupos',
            [
                { valor: 'A/Inteira', texto: 'Grupo A ou Classe Inteira' },
                { valor: 'B', texto: 'Grupo B' }
            ]
        );

        preencherSelect(
            controlesFiltro.professor,
            'Todos os professores',
            [...professores]
                .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
                .map(([valor, texto]) => ({ valor, texto }))
        );

        preencherSelect(
            controlesFiltro.disciplina,
            'Todas as disciplinas',
            [...disciplinas]
                .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
                .map(([valor, texto]) => ({ valor, texto }))
        );

        preencherSelect(
            controlesFiltro.sala,
            'Todas as salas',
            [...salas]
                .sort()
                .map(valor => ({ valor, texto: valor }))
        );
    }

    async function buscarHorarios(filtros = {}) {
        const parametros = new URLSearchParams();
        Object.entries(filtros).forEach(([chave, valor]) => {
            if (valor) parametros.set(chave, valor);
        });

        const query = parametros.toString();
        const resposta = await fetch(base_url + '/horarios' + (query ? `?${query}` : ''), {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-CSRFToken': csrfToken }
        });

        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || `Erro HTTP: ${resposta.status}`);
        return dados.horarios || [];
    }

    function renderizarGradesPadrao(horariosBanco) {
        gradesContainer.innerHTML = '';
        TURMAS.forEach((turma, indice) => {
            gradesContainer.appendChild(criarGrade(turma, indice, horariosBanco));
        });
    }

    
    function criarGrade(turma, indice, horariosBanco) {
        const table = document.createElement('table');

        table.className = 'grade';
        table.dataset.turma = turma.nome;

        // ===== TÍTULO =====
        const caption = document.createElement('caption');
        caption.className = 'select-grupo';

        caption.appendChild(
            document.createTextNode(`${turma.nome} `)
        );

        const divGrupo = document.createElement('div');
        divGrupo.className = 'secao-busca-grupo';

        const selectId = `escolher-grupo-${indice}`;

        const label = document.createElement('label');
        label.htmlFor = selectId;
        label.textContent = 'Grupo';

        const select = document.createElement('select');
        select.id = selectId;
        select.name = selectId;

        [
            ['TODOS', 'Todos os grupos'],
            ['A/Inteira', 'Grupo A'],
            ['B', 'Grupo B']
        ].forEach(([valor, texto]) => {
            const opcao = document.createElement('option');
            opcao.value = valor;
            opcao.textContent = texto;
            select.appendChild(opcao);
        });

        select.value = 'TODOS';

        divGrupo.append(label, select);
        caption.appendChild(divGrupo);
        table.appendChild(caption);

        // ===== CABEÇALHO =====
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');

        ['Horário', ...DIAS].forEach(texto => {
            const th = document.createElement('th');
            th.textContent = texto;
            trHead.appendChild(th);
        });

        thead.appendChild(trHead);
        table.appendChild(thead);

        // ===== CORPO =====
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        function obterChaveHorario(item) {
            return `${item.dia_semana}|${normalizarHorario(item.horario)}`;
        }

        function preencherTabela() {
            tbody.innerHTML = '';

            // Busca somente os horários da turma atual.
            const horariosDaTurma = horariosBanco.filter(item =>
                Number(item.serie) === Number(turma.serie) &&
                String(item.curso || '').trim() === turma.curso &&
                String(item.periodo || '').trim() === turma.periodo
            );

            const horariosA = horariosDaTurma.filter(item =>
                String(item.grupo || '').trim() === 'A/Inteira'
            );

            const horariosB = horariosDaTurma.filter(item =>
                String(item.grupo || '').trim() === 'B'
            );

            let horariosFiltrados = [];

            if (select.value === 'A/Inteira') {

                // Grupo A: somente os registros A/Inteira.
                horariosFiltrados = [...horariosA];

            } else if (select.value === 'B') {

                // Grupo B: começa com as aulas compartilhadas.
                horariosFiltrados = [...horariosA];

                // Identifica os horários que possuem aulas próprias do B.
                const horariosSubstituidos = new Set(
                    horariosB.map(obterChaveHorario)
                );

                // Remove as aulas A apenas nos horários substituídos pelo B.
                horariosFiltrados = horariosFiltrados.filter(item =>
                    !horariosSubstituidos.has(obterChaveHorario(item))
                );

                // Adiciona todas as aulas específicas do B.
                horariosFiltrados.push(...horariosB);

            } else {

                // Todos os grupos: apresenta os registros dos dois grupos.
                // Não utiliza Map por horário, pois isso poderia apagar
                // aulas diferentes ou professores compartilhando o horário.
                horariosFiltrados = [...horariosA, ...horariosB];
            }

            // ===== HORÁRIOS DAS LINHAS =====
            const linhasGrade = [...turma.horarios];

            const horariosExistentes = new Set(
                linhasGrade.map(linha => normalizarHorario(linha.h))
            );

            // Inclui horários adicionais cadastrados no banco.
            horariosDaTurma.forEach(item => {
                const horario = normalizarHorario(item.horario);

                if (horario && !horariosExistentes.has(horario)) {
                    linhasGrade.push({
                        h: horario,
                        extra: true
                    });

                    horariosExistentes.add(horario);
                }
            });

            // Organiza cronologicamente.
            linhasGrade.sort((a, b) => {
                const converterMinutos = horario => {
                    const [hora, minuto] = horario.split(':').map(Number);
                    return hora * 60 + minuto;
                };

                return converterMinutos(a.h) - converterMinutos(b.h);
            });

            // ===== CRIAÇÃO DAS LINHAS =====
            linhasGrade.forEach(linha => {
                const tr = document.createElement('tr');

                const tdHora = document.createElement('td');
                tdHora.textContent = linha.h;

                if (linha.extra) {
                    tdHora.classList.add('horario-extra');
                }

                tr.appendChild(tdHora);

                // Intervalo e almoço.
                if (linha.fixo) {
                    const td = document.createElement('td');
                    td.colSpan = DIAS.length;
                    td.textContent = linha.fixo;
                    tr.appendChild(td);

                } else {
                    const horarioLinha = normalizarHorario(linha.h);

                    DIAS.forEach(dia => {
                        const td = document.createElement('td');
                        const nomeDia = `${dia}-feira`;

                        const aulas = horariosFiltrados.filter(item =>
                            item.dia_semana === nomeDia &&
                            normalizarHorario(item.horario) === horarioLinha
                        );

                        aulas.forEach(aula => {

                            // Cada aula fica em seu próprio bloco: assim, na
                            // visualização "Todos os grupos", dá para editar
                            // a aula do Grupo A e a do Grupo B separadamente.
                            const item = document.createElement('div');
                            item.className = 'aula-item';
                            item.dataset.idHorario = aula.id_horario;

                            const disciplina = document.createElement('span');
                            disciplina.textContent = aula.materia || 'Disciplina';
                            item.appendChild(disciplina);

                            const professor = document.createElement('span');
                            professor.className = 'professor-aula';
                            professor.textContent =
                                aula.professor || 'Professor não definido';

                            item.appendChild(professor);

                            const sala = document.createElement('span');
                            sala.className = 'sala-aula';
                            sala.textContent = aula.sala || '—';

                            if (!aula.sala) {
                                sala.title = 'Sala não cadastrada';
                            }

                            item.appendChild(sala);
                            td.appendChild(item);
                        });

                        tr.appendChild(td);
                    });
                }

                tbody.appendChild(tr);
            });
        }

        select.addEventListener('change', preencherTabela);

        // Permite redesenhar a grade depois de uma edição,
        // mantendo o grupo que estava selecionado.
        table.atualizarGrade = preencherTabela;

        preencherTabela();

        return table;
    }


    function renderizarTabelaPesquisa(horarios) {
        gradesContainer.innerHTML = '';

        if (!horarios.length) {
            const mensagem = document.createElement('p');

            mensagem.className = 'sem-resultados';
            mensagem.textContent =
                'Nenhum horário encontrado para os filtros selecionados.';

            gradesContainer.appendChild(mensagem);
            return;
        }

        const tabela = document.createElement('table');
        tabela.className = 'grade tabela-pesquisa';

        const thead = document.createElement('thead');
        const cabecalho = document.createElement('tr');

        [
            'Turma',
            'Grupo',
            'Dia',
            'Aula',
            'Horário',
            'Disciplina',
            'Professor',
            'Sala'
        ].forEach(titulo => {
            const th = document.createElement('th');
            th.textContent = titulo;
            cabecalho.appendChild(th);
        });

        thead.appendChild(cabecalho);
        tabela.appendChild(thead);

        const tbody = document.createElement('tbody');

        horarios.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.idHorario = item.id_horario;

            const grupoTexto =
                item.grupo === 'A/Inteira'
                    ? 'Grupo A ou Classe Inteira'
                    : item.grupo === 'B'
                        ? 'Grupo B'
                        : '—';

            const valores = [
                obterNomeTurma(item),
                grupoTexto,
                item.dia_semana || '—',
                item.aula ?? '—',
                normalizarHorario(item.horario) || '—',
                item.materia || '—',
                item.professor || 'Professor não definido',
                item.sala || '—'
            ];

            valores.forEach(valor => {
                const td = document.createElement('td');
                td.textContent = String(valor);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        tabela.appendChild(tbody);
        gradesContainer.appendChild(tabela);
    }

    // Horários atualmente carregados (usados pela edição de aulas).
    let todosHorarios = [];
    let horariosPesquisa = null; // null = as seis grades estão na tela

    async function carregarHorariosPadrao() {
        try {
            const horarios = await buscarHorarios();
            todosHorarios = horarios;
            horariosPesquisa = null;
            popularFiltros(horarios);
            renderizarGradesPadrao(horarios);
        } catch (erro) {
            console.error('ERRO AO CARREGAR HORÁRIOS:', erro);
            mostrarToast('Erro ao carregar horários!', 'erro');
        }
    }

    const btnConsultar = document.getElementById('btn-consultar');
    const btnLimparBusca = document.getElementById('btn-limpar');

    btnConsultar?.addEventListener('click', async () => {
        try {
            const filtros = {
                turma: controlesFiltro.turma?.value || '',
                grupo: controlesFiltro.grupo?.value || '',
                professor: controlesFiltro.professor?.value || '',
                disciplina: controlesFiltro.disciplina?.value || '',
                sala: controlesFiltro.sala?.value || ''
            };

            const existeFiltro = Object.values(filtros).some(Boolean);
            if (!existeFiltro) {
                await carregarHorariosPadrao();
                return;
            }

            const horarios = await buscarHorarios(filtros);
            horariosPesquisa = horarios;
            renderizarTabelaPesquisa(horarios);
        } catch (erro) {
            console.error('ERRO NA CONSULTA:', erro);
            mostrarToast(erro.message || 'Erro ao consultar horários!', 'erro');
        }
    });

    btnLimparBusca?.addEventListener('click', async () => {
        Object.values(controlesFiltro).forEach(select => {
            if (select) select.value = '';
        });
        await carregarHorariosPadrao();
    });

    // As grades só são carregadas quando existe sessão (logo após o login
    // ou, se o cookie ainda for válido, ao abrir a página).
    // ===== MODAL DE EDIÇÃO DAS AULAS =====
    const modalEditarAula = document.getElementById('modal-editar-aula');
    const fecharEdicaoAula = document.getElementById('fechar-edicao-aula');
    const formEditarAula = document.getElementById('form-editar-aula');
    const inputDisciplina = document.getElementById('editar-disciplina');
    const inputProfessor = document.getElementById('editar-professor');
    const inputSala = document.getElementById('editar-sala');
    const editarErro = document.getElementById('editar-erro');
    const editarInfo = document.getElementById('editar-aula-info');
    const btnSalvarEdicao = document.getElementById('salvar-edicao-aula');
    const listaDisciplinas = document.getElementById('lista-disciplinas');
    const listaProfessores = document.getElementById('lista-professores');

    let aulaEmEdicao = null;
    let opcoesEdicaoCarregadas = false;

    // Preenche as sugestões (datalist) de disciplina e professor.
    async function carregarOpcoesEdicao() {
        if (opcoesEdicaoCarregadas) return;

        try {
            const resposta = await fetch(base_url + '/opcoes_edicao', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!resposta.ok) return;

            const dados = await resposta.json();

            const preencher = (datalist, nomes) => {
                datalist.innerHTML = '';

                (nomes || []).forEach(nome => {
                    const opcao = document.createElement('option');
                    opcao.value = nome;
                    datalist.appendChild(opcao);
                });
            };

            preencher(listaDisciplinas, dados.materias);
            preencher(listaProfessores, dados.professores);

            opcoesEdicaoCarregadas = true;

        } catch (erro) {
            console.error('Erro ao carregar opções de edição:', erro);
        }
    }

    function buscarAulaPorId(id) {
        return (
            todosHorarios.find(h => Number(h.id_horario) === id) ||
            horariosPesquisa?.find(h => Number(h.id_horario) === id) ||
            null
        );
    }

    // Recria os filtros (novas salas, professores...) sem perder a seleção.
    function atualizarOpcoesFiltros() {
        const selecionados = {};

        Object.entries(controlesFiltro).forEach(([chave, select]) => {
            selecionados[chave] = select?.value || '';
        });

        popularFiltros(todosHorarios);

        Object.entries(controlesFiltro).forEach(([chave, select]) => {
            if (select) select.value = selecionados[chave];
        });
    }

    // Redesenha o que está na tela (grades ou resultado da pesquisa).
    function atualizarVisaoAtual() {
        if (horariosPesquisa) {
            renderizarTabelaPesquisa(horariosPesquisa);
            return;
        }

        document.querySelectorAll('table.grade').forEach(tabela => {
            tabela.atualizarGrade?.();
        });
    }

    // Copia para a memória o que o servidor acabou de salvar.
    function aplicarEdicao(aula) {
        [todosHorarios, horariosPesquisa || []].forEach(lista => {
            lista.forEach(item => {
                if (Number(item.id_horario) !== Number(aula.id_horario)) return;

                item.id_materia = aula.id_materia;
                item.materia = aula.materia;
                item.id_professor = aula.id_professor;
                item.professor = aula.professor;
                item.sala = aula.sala;
            });
        });

        atualizarOpcoesFiltros();
        atualizarVisaoAtual();
    }

    function abrirEdicao(id) {
        const aula = buscarAulaPorId(id);

        if (!aula) return;

        aulaEmEdicao = aula;

        const grupo = aula.grupo === 'B' ? 'Grupo B' : 'Grupo A ou Classe Inteira';

        editarInfo.textContent = [
            aula.dia_semana,
            normalizarHorario(aula.horario),
            obterNomeTurma(aula),
            grupo
        ].join(' · ');

        inputDisciplina.value = aula.materia || '';
        inputProfessor.value = aula.professor || '';
        inputSala.value = aula.sala || '';
        editarErro.textContent = '';

        carregarOpcoesEdicao();
        modalEditarAula.showModal();
    }

    function fecharEdicao() {
        modalEditarAula.close();
        aulaEmEdicao = null;
    }

    if (
        modalEditarAula &&
        formEditarAula &&
        inputDisciplina &&
        inputProfessor &&
        inputSala
    ) {

        // Clique em uma aula (grade) ou em uma linha (pesquisa) abre a edição.
        document.addEventListener('click', (e) => {

            const alvo = e.target.closest('.grade [data-id-horario]');

            if (alvo) {
                abrirEdicao(Number(alvo.dataset.idHorario));
                return;
            }

            const celulaVazia = e.target.closest(
                '.grade:not(.tabela-pesquisa) tbody td:not(:first-child):not([colspan])'
            );

            if (celulaVazia) {
                mostrarToast('Não há aula cadastrada neste horário para editar.', 'aviso');
            }
        });

        formEditarAula.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!aulaEmEdicao) return;

            const disciplina = inputDisciplina.value.trim();
            const professor = inputProfessor.value.trim();
            const sala = inputSala.value.trim();

            if (!disciplina) {
                editarErro.textContent = 'Informe a disciplina.';
                return;
            }

            editarErro.textContent = '';
            btnSalvarEdicao.disabled = true;

            try {
                const { ok, dados } = await enviarJson(
                    `${base_url}/horarios/${aulaEmEdicao.id_horario}`,
                    'PUT',
                    { disciplina, professor, sala }
                );

                if (!ok) {
                    editarErro.textContent =
                        dados.mensagem || 'Não foi possível salvar a aula.';
                    return;
                }

                aplicarEdicao(dados.aula);
                fecharEdicao();

                if (dados.alterado) {
                    mostrarToast('Aula atualizada com sucesso!', 'sucesso');
                } else {
                    mostrarToast('Nenhuma alteração foi feita.', 'aviso');
                }

            } catch (erro) {
                console.error('Erro ao salvar aula:', erro);
                editarErro.textContent = 'Erro de conexão com o servidor.';

            } finally {
                btnSalvarEdicao.disabled = false;
            }
        });

        fecharEdicaoAula?.addEventListener('click', fecharEdicao);

        modalEditarAula.addEventListener('click', (e) => {
            if (e.target === modalEditarAula) {
                fecharEdicao();
            }
        });

        // Esc também fecha o modal: garante que nada fique selecionado.
        modalEditarAula.addEventListener('close', () => {
            aulaEmEdicao = null;
        });
    }

    // ===== MODAL DE SEGURANÇA (trocar e-mail e senha) =====
    const modalSeguranca = document.getElementById('modal-2');
    const fecharSeguranca = document.getElementById('fechar-seguranca');

    const formAlterarEmail = document.getElementById('form-alterar-email');
    const segEmailAtual = document.getElementById('seg-email-atual');
    const segEmailNovo = document.getElementById('seg-email-novo');
    const segEmailConfirmar = document.getElementById('seg-email-confirmar');
    const segEmailErro = document.getElementById('seg-email-erro');
    const segEmailSucesso = document.getElementById('seg-email-sucesso');
    const btnSalvarEmail = document.getElementById('btn-salvar-email');

    const formAlterarSenha = document.getElementById('form-alterar-senha');
    const segSenhaAtual = document.getElementById('seg-senha-atual');
    const segSenhaNova = document.getElementById('seg-senha-nova');
    const segSenhaConfirmar = document.getElementById('seg-senha-confirmar');
    const segRequisitos = document.getElementById('seg-requisitos');
    const segSenhaErro = document.getElementById('seg-senha-erro');
    const segSenhaSucesso = document.getElementById('seg-senha-sucesso');
    const btnSalvarSenha = document.getElementById('btn-salvar-senha');

    // Atualiza a lista de requisitos e diz se a senha cumpre todos.
    function atualizarRequisitosSeguranca() {
        let tudoOk = true;

        for (const [nome, teste] of Object.entries(requisitos)) {
            const li = segRequisitos.querySelector(`[data-req="${nome}"]`);
            const icone = li.querySelector('.icone');
            const cumprido = teste(segSenhaNova.value);

            li.classList.toggle('ok', cumprido);
            icone.classList.toggle('ok', cumprido);
            icone.textContent = cumprido ? '✓' : '✗';

            if (!cumprido) tudoOk = false;
        }

        return tudoOk;
    }

    function limparModalSeguranca() {
        formAlterarEmail.reset();
        formAlterarSenha.reset();

        [segEmailErro, segEmailSucesso, segSenhaErro, segSenhaSucesso].forEach(p => {
            p.textContent = '';
        });

        segRequisitos.classList.remove('visivel');
        atualizarRequisitosSeguranca();
    }

    fecharSeguranca?.addEventListener('click', () => {
        modalSeguranca.close();
    });

    // Limpa os campos sempre que fechar (pelo X ou pela tecla Esc).
    modalSeguranca?.addEventListener('close', limparModalSeguranca);

    // --- Trocar e-mail ---
    formAlterarEmail?.addEventListener('submit', async (e) => {
        e.preventDefault();

        segEmailErro.textContent = '';
        segEmailSucesso.textContent = '';

        const emailAtual = segEmailAtual.value.trim();
        const novoEmail = segEmailNovo.value.trim();
        const confirmar = segEmailConfirmar.value.trim();

        if (!emailRegex.test(emailAtual) || !emailRegex.test(novoEmail)) {
            segEmailErro.textContent = 'Digite e-mails válidos.';
            return;
        }

        if (novoEmail.toLowerCase() !== confirmar.toLowerCase()) {
            segEmailErro.textContent = 'Os e-mails não coincidem.';
            return;
        }

        btnSalvarEmail.disabled = true;

        try {
            const { ok, dados } = await enviarJson(
                base_url + '/alterar_email',
                'POST',
                { email_atual: emailAtual, novo_email: novoEmail }
            );

            if (!ok) {
                segEmailErro.textContent =
                    dados.mensagem || 'Não foi possível alterar o e-mail.';
                return;
            }

            formAlterarEmail.reset();
            segEmailSucesso.textContent =
                'E-mail alterado! Use o novo e-mail no próximo login.';

        } catch (erro) {
            console.error('Erro ao alterar e-mail:', erro);
            segEmailErro.textContent = 'Erro de conexão com o servidor.';

        } finally {
            btnSalvarEmail.disabled = false;
        }
    });

    // --- Trocar senha ---
    if (segSenhaNova && segRequisitos) {
        segSenhaNova.addEventListener('focus', () => {
            segRequisitos.classList.add('visivel');
            atualizarRequisitosSeguranca();
        });

        segSenhaNova.addEventListener('blur', () => {
            if (atualizarRequisitosSeguranca()) {
                segRequisitos.classList.remove('visivel');
            }
        });

        segSenhaNova.addEventListener('input', atualizarRequisitosSeguranca);
    }

    formAlterarSenha?.addEventListener('submit', async (e) => {
        e.preventDefault();

        segSenhaErro.textContent = '';
        segSenhaSucesso.textContent = '';

        if (!segSenhaAtual.value) {
            segSenhaErro.textContent = 'Informe a senha atual.';
            return;
        }

        if (!atualizarRequisitosSeguranca()) {
            segRequisitos.classList.add('visivel');
            segSenhaErro.textContent = 'A nova senha não atende aos requisitos.';
            return;
        }

        if (segSenhaNova.value !== segSenhaConfirmar.value) {
            segSenhaErro.textContent = 'As senhas não coincidem.';
            return;
        }

        btnSalvarSenha.disabled = true;

        try {
            const { ok, dados } = await enviarJson(
                base_url + '/alterar_senha',
                'POST',
                {
                    senha_atual: segSenhaAtual.value,
                    senha_nova: segSenhaNova.value
                }
            );

            if (!ok) {
                segSenhaErro.textContent =
                    dados.mensagem || 'Não foi possível alterar a senha.';
                return;
            }

            formAlterarSenha.reset();
            segRequisitos.classList.remove('visivel');
            atualizarRequisitosSeguranca();
            segSenhaSucesso.textContent =
                'Senha alterada! Use a nova senha no próximo login.';

        } catch (erro) {
            console.error('Erro ao alterar senha:', erro);
            segSenhaErro.textContent = 'Erro de conexão com o servidor.';

        } finally {
            btnSalvarSenha.disabled = false;
        }
    });

    // ===== LIMPAR BUSCA =====
    document.getElementById('btn-limpar')?.addEventListener('click', () => {
        document.querySelectorAll('.busca-box input').forEach(i => {
            i.value = '';
        });
    });

    // ===== VERIFICAR SE JÁ EXISTE UMA SESSÃO =====
    const sessao = await verificar_token();

    if (sessao && sessao.email) {
        telaLogin.style.display = 'none';
        telaSite.style.display = 'flex';

        await carregarHorariosPadrao();
    }

    // ===== MENU DROPDOWN =====
    const btnDropdown = document.getElementById('menu-dropdown');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (btnDropdown && dropdownMenu) {

        btnDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (
                !dropdownMenu.contains(e.target) &&
                !btnDropdown.contains(e.target)
            ) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // ===== MODO ESCURO =====
    const btnTema = document.querySelectorAll('.btn-tema');

    if (btnTema.length) {

        const temaSalvo = localStorage.getItem('witch-tema') || 'claro';

        document.documentElement.setAttribute(
            'data-tema',
            temaSalvo === 'escuro' ? 'escuro' : ''
        );

        btnTema.forEach((btn) => {

            btn.checked = temaSalvo === 'escuro';

            btn.addEventListener('change', () => {

                const escuro = btn.checked;

                document.documentElement.setAttribute(
                    'data-tema',
                    escuro ? 'escuro' : ''
                );

                localStorage.setItem(
                    'witch-tema',
                    escuro ? 'escuro' : 'claro'
                );
            });
        });
    }

    // ===== HISTÓRICO =====
    const modalHistorico = document.getElementById('modal-1');
    const historicoTable = document.getElementById('historico-table');
    const historicoBody = document.getElementById('historico-body');
    const historicoEmpty = document.getElementById('historico-empty');
    const fecharHistorico = document.getElementById('fechar-historico');

    let historico = [];

    const TIPOS_ACAO = {
        edicao: {
            classe: 'edicao',
            texto: 'Edição de tabela'
        },
        senha: {
            classe: 'senha',
            texto: 'Troca de senha'
        },
        email: {
            classe: 'email',
            texto: 'Troca de e-mail'
        }
    };

    function renderHistorico() {

        historicoBody.innerHTML = '';

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
            tr.className = 'acao-' + tipo.classe;

            const td1 = document.createElement('td');

            const tag = document.createElement('span');
            tag.className = 'tag-acao ' + tipo.classe;
            tag.textContent = tipo.texto;

            td1.appendChild(tag);

            const td2 = document.createElement('td');
            td2.textContent = item.descricao;

            const td3 = document.createElement('td');
            td3.textContent = item.data;

            tr.append(td1, td2, td3);

            historicoBody.appendChild(tr);
        });
    }

    async function carregarHistorico() {
        try {
            const resposta = await fetch(base_url + '/historico', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!resposta.ok) {
                throw new Error('Erro ao buscar histórico.');
            }

            const dados = await resposta.json();

            historico = dados.historico || [];

        } catch (erro) {
            console.error('Erro ao carregar histórico:', erro);
            historico = [];
            mostrarToast('Erro ao carregar histórico.', 'erro');
        }

        renderHistorico();
    }

    // Fechar o modal do histórico pelo X
    fecharHistorico?.addEventListener('click', () => {
        modalHistorico.close();
    });

    // ===== ABRIR MODAIS =====
    document.querySelectorAll('.btn-open-modal').forEach(button => {

        button.addEventListener('click', () => {

            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);

            if (!modal) return;

            dropdownMenu?.classList.remove('show');

            if (modalId === 'modal-1') {
                carregarHistorico();
            }

            modal.showModal();
        });
    });

    // ===== TAMANHO DA LETRA =====
    const aumentarFonte = document.getElementById('aumentar-fonte');
    const diminuirFonte = document.getElementById('diminuir-fonte');
    const tamanhoAtual = document.getElementById('tamanho-atual');
    const modalFonte = document.getElementById('modal-fonte');
    const fecharFonte = document.getElementById('fechar-fonte');
    const fecharFonteX = document.getElementById('fechar-fonte-x');
    const resetarFonte = document.getElementById('resetar-fonte');

    const tamanhoPadrao = 16;
    const tamanhoMinimo = 14;
    const tamanhoMaximo = 20;

    let tamanhoFonte =
        Number(localStorage.getItem('tamanho-fonte')) || tamanhoPadrao;

    function atualizarFonte() {

        document.documentElement.style.fontSize = tamanhoFonte + 'px';

        if (tamanhoAtual) {
            tamanhoAtual.textContent = tamanhoFonte + 'px';
        }

        if (aumentarFonte) {
            aumentarFonte.disabled = tamanhoFonte >= tamanhoMaximo;
        }

        if (diminuirFonte) {
            diminuirFonte.disabled = tamanhoFonte <= tamanhoMinimo;
        }

        localStorage.setItem('tamanho-fonte', tamanhoFonte);
    }

    aumentarFonte?.addEventListener('click', () => {

        if (tamanhoFonte < tamanhoMaximo) {
            tamanhoFonte += 2;
            atualizarFonte();
        }
    });

    diminuirFonte?.addEventListener('click', () => {

        if (tamanhoFonte > tamanhoMinimo) {
            tamanhoFonte -= 2;
            atualizarFonte();
        }
    });

    resetarFonte?.addEventListener('click', () => {
        tamanhoFonte = tamanhoPadrao;
        atualizarFonte();
    });

    if (modalFonte) {

        fecharFonte?.addEventListener('click', () => {
            modalFonte.close();
        });

        fecharFonteX?.addEventListener('click', () => {
            modalFonte.close();
        });

        modalFonte.addEventListener('click', (e) => {
            if (e.target === modalFonte) {
                modalFonte.close();
            }
        });
    }

    atualizarFonte();

    // ===== LOGOUT =====
    const btnLogout = document.getElementById('btn-logout');

    btnLogout?.addEventListener('click', async () => {

        try {
            const resposta = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });

            const dados = await resposta.json();

            if (resposta.ok) {

                console.log(dados.mensagem);

                telaSite.style.display = 'none';
                telaLogin.style.display = 'flex';

                dropdownMenu?.classList.remove('show');

                emailInput.value = '';
                senhaInput.value = '';

                validarSenha();
                atualizarBotao();

            } else {
                console.log(dados.mensagem);
            }

        } catch (error) {
            console.error('Erro ao realizar logout:', error);
        }
    });

});
