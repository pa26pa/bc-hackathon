
document.addEventListener("DOMContentLoaded", async function () {

    // ===== CONFIGURAÇÕES =====
    const base_url = '/api';
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    // ===== TOAST =====
    function mostrarToast(mensagem, tipo = 'info') {
        const toast = document.createElement('div');
        toast.textContent = mensagem;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '10px',
            color: '#fff',
            background: tipo === 'erro' ? '#ef4444' : '#22c55e',
            zIndex: 99999,
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,.3)'
        });

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
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

    esqueciForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!emailRegex.test(esqueciEmail.value.trim())) {
            esqueciEmailErro.textContent = 'Digite um e-mail válido.';
            return;
        }

        esqueciEmailErro.textContent = '';

        // TODO: chamar a API que envia o código por e-mail
        esqueciBox.style.display = 'none';
        codigoBox.style.display = 'flex';

        if (otpLogin) {
            otpLogin.reset();
            otpLogin.startTimer();
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
            // AJUSTE a rota/corpo conforme o seu back-end
            const resposta = await fetch('/api/verificar-codigo', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: esqueciEmail.value.trim(),
                    codigo: otpLogin.getCode()
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
            // AJUSTE a rota/corpo conforme o seu back-end
            const resposta = await fetch('/api/redefinir-senha', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: esqueciEmail.value.trim(),
                    senha: novaSenhaInput.value
                })
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                voltarParaLogin();
            } else {
                confirmarSenhaErro.textContent = dados.mensagem || 'Não foi possível redefinir a senha.';
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
        otpLogin.resendBtn.addEventListener('click', () => {
            fetch(base_url + '/resend', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
                .then(r => r.json())
                .then(data => {
                    mostrarToast(data.mensagem, data.status);
                    otpLogin.startTimer();
                })
                .catch(() => {
                    mostrarToast('Erro ao reenviar código', 'erro');
                });
        });
    }

    // aaa
    const HORARIOS_MANHA = [
        { h: '07:00 - 07:50' },
        { h: '07:50 - 08:40' },
        { h: '08:40 - 09:30' },
        { h: '09:30 - 09:45', fixo: 'Intervalo' },
        { h: '09:45 - 10:35' },
        { h: '10:35 - 11:25' },
        { h: '11:25 - 12:15' }
    ];

    const HORARIOS_TARDE = [
        { h: '12:15 - 13:00', fixo: 'Almoço' },
        { h: '13:00 - 13:50' },
        { h: '13:50 - 14:40' },
        { h: '14:40 - 15:45' },
        { h: '15:45 - 16:35' },
        { h: '16:35 - 17:25' },
        { h: '17:25 - 18:15' }
    ];

    const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    // Cada uma das seis grades corresponde a uma turma/curso específico do SQL.
    const TURMAS = [
        {
            nome: '1ª série - MTEC - Turma A (Manhã)',
            serie: 1,
            curso: 'MTEC - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: '1ª série - MTEC - Turma B (Manhã)',
            serie: 1,
            curso: 'MTEC - Turma B',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: '2ª série - Novotec Integrado - Turma A (Manhã)',
            serie: 2,
            curso: 'Novotec Integrado - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: '3ª série - Novotec Integrado - Turma A (Manhã)',
            serie: 3,
            curso: 'Novotec Integrado - Turma A',
            periodo: 'Manhã',
            horarios: HORARIOS_MANHA
        },
        {
            nome: '2ª série - Novotec Integrado - Turma B (Tarde)',
            serie: 2,
            curso: 'Novotec Integrado - Turma B',
            periodo: 'Tarde',
            horarios: HORARIOS_TARDE
        },
        {
            nome: '3ª série - Novotec Integrado - Turma B (Tarde)',
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

    function normalizarHorario(horario) {
        return horario ? String(horario).substring(0, 5) : '';
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

    function popularFiltros(horarios) {
        const turmas = new Map();
        const grupos = new Set();
        const professores = new Map();
        const disciplinas = new Map();
        const salas = new Set();

        horarios.forEach(item => {
            const chaveTurma = `${item.serie}|${item.curso}`;
            turmas.set(chaveTurma, `${item.serie}º ano - ${item.curso}`);

            if (item.grupo) grupos.add(item.grupo);
            if (item.id_professor && item.professor) professores.set(String(item.id_professor), item.professor);
            if (item.id_materia && item.materia) disciplinas.set(String(item.id_materia), item.materia);
            if (item.sala) salas.add(String(item.sala));
        });

        preencherSelect(controlesFiltro.turma, 'Todas as turmas',
            [...turmas].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([valor, texto]) => ({ valor, texto })));
        preencherSelect(controlesFiltro.grupo, 'Todos os grupos',
            [...grupos].sort().map(valor => ({ valor, texto: valor === 'A/Inteira' ? 'Grupo A / Classe inteira' : `Grupo ${valor}` })));
        preencherSelect(controlesFiltro.professor, 'Todos os professores',
            [...professores].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([valor, texto]) => ({ valor, texto })));
        preencherSelect(controlesFiltro.disciplina, 'Todas as disciplinas',
            [...disciplinas].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([valor, texto]) => ({ valor, texto })));
        preencherSelect(controlesFiltro.sala, 'Todas as salas',
            [...salas].sort().map(valor => ({ valor, texto: valor })));
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

        const caption = document.createElement('caption');
        caption.className = 'select-grupo';

        caption.appendChild(
            document.createTextNode(
                `${turma.nome}`
            )
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

        [['', 'Todos os grupos'], ['A/Inteira', 'Grupo A / Classe inteira'], ['B', 'Grupo B']].forEach(([valor, texto]) => {
            const opcao = document.createElement('option');
            opcao.value = valor;
            opcao.textContent = texto;
            select.appendChild(opcao);
        });

        divGrupo.append(label, select);
        caption.appendChild(divGrupo);
        table.appendChild(caption);

        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        ['Horário', ...DIAS].forEach(texto => {
            const th = document.createElement('th');
            th.textContent = texto;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        function preencherTabela() {
            tbody.innerHTML = '';
            const horariosDaTurma = horariosBanco.filter(item =>
                Number(item.serie) === Number(turma.serie) &&
                String(item.curso || '').trim() === turma.curso &&
                String(item.periodo || '').trim() === turma.periodo
            );

            const grupoSelecionado = select.value;

            let horariosFiltrados = horariosDaTurma;

            if (grupoSelecionado === 'A/Inteira') {

                horariosFiltrados = horariosDaTurma.filter(item =>
                    String(item.grupo || '').trim() === 'A/Inteira'
                );

            } else if (grupoSelecionado === 'B') {

                const horariosBase = horariosDaTurma.filter(item =>
                    String(item.grupo || '').trim() === 'A/Inteira'
                );

                const horariosB = horariosDaTurma.filter(item =>
                    String(item.grupo || '').trim() === 'B'
                );

                horariosFiltrados = horariosBase.filter(base => {
                    const possuiSubstituicao = horariosB.some(item =>
                        item.dia_semana === base.dia_semana &&
                        String(item.horario).substring(0, 5) ===
                        String(base.horario).substring(0, 5)
                    );

                    return !possuiSubstituicao;
                }).concat(horariosB);
            }

            console.log('TURMA:', turma.nome);
            console.log('GRUPO SELECIONADO:', grupoSelecionado || 'Todos');

            console.table(horariosFiltrados.map(item => ({
                grupo: item.grupo,
                dia: item.dia_semana,
                horario: item.horario,
                disciplina: item.materia,
                professor: item.professor
            })));

            const converterMinutos = horario => {
                const [hora, minuto] = horario.split(':').map(Number);
                return hora * 60 + minuto;
            };

            const linhasGrade = [...turma.horarios];
            const horariosExistentes = new Set(linhasGrade.map(linha => linha.h.split(' - ')[0]));

            horariosDaTurma.forEach(item => {
                const horario = normalizarHorario(item.horario);
                if (horario && !horariosExistentes.has(horario)) {
                    linhasGrade.push({ h: horario, extra: true });
                    horariosExistentes.add(horario);
                }
            });

            linhasGrade.sort((a, b) => converterMinutos(a.h.split(' - ')[0]) - converterMinutos(b.h.split(' - ')[0]));

            linhasGrade.forEach(linha => {
                const tr = document.createElement('tr');
                const tdHora = document.createElement('td');
                tdHora.textContent = linha.h;
                if (linha.extra) tdHora.classList.add('horario-extra');
                tr.appendChild(tdHora);

                if (linha.fixo) {
                    const td = document.createElement('td');
                    td.colSpan = DIAS.length;
                    td.textContent = linha.fixo;
                    tr.appendChild(td);
                } else {
                    const horarioLinha = normalizarHorario(linha.h.split(' - ')[0]);
                    DIAS.forEach(dia => {
                        const td = document.createElement('td');
                        const nomeDia = dia + '-feira';
                        const aulas = horariosFiltrados.filter(item =>
                            item.dia_semana === nomeDia && normalizarHorario(item.horario) === horarioLinha
                        );

                        aulas.forEach((aula, index) => {
                            if (index > 0) td.appendChild(document.createElement('br'));

                            const disciplina = document.createElement('span');
                            disciplina.textContent = aula.materia || 'Disciplina';
                            td.appendChild(disciplina);

                            const professor = document.createElement('span');
                            professor.className = 'professor-aula';
                            professor.textContent = aula.professor || 'Professor não definido';
                            td.appendChild(professor);

                            const sala = document.createElement('span');
                            sala.className = 'sala-aula';
                            sala.textContent = aula.sala || '—';

                            if (!aula.sala) {
                                sala.title = 'Sala não cadastrada';
                            }
                            td.appendChild(sala);

                            if (index === 0) {
                                td.dataset.disciplina = aula.materia || '';
                                td.dataset.professor = aula.professor || '';
                                td.dataset.sala = aula.sala || '';
                                td.dataset.idHorario = aula.id_horario;
                            }
                        });
                        tr.appendChild(td);
                    });
                }
                tbody.appendChild(tr);
            });
        }

        select.addEventListener('change', preencherTabela);
        preencherTabela();
        return table;
    }

    function renderizarTabelaPesquisa(horarios) {
        gradesContainer.innerHTML = '';

        if (!horarios.length) {
            const mensagem = document.createElement('p');
            mensagem.className = 'sem-resultados';
            mensagem.textContent = 'Nenhum horário encontrado para os filtros selecionados.';
            gradesContainer.appendChild(mensagem);
            return;
        }

        const tabela = document.createElement('table');
        tabela.className = 'grade tabela-pesquisa';
        const thead = document.createElement('thead');
        const cabecalho = document.createElement('tr');
        ['Turma', 'Grupo', 'Dia', 'Aula', 'Horário', 'Disciplina', 'Professor', 'Sala'].forEach(titulo => {
            const th = document.createElement('th');
            th.textContent = titulo;
            cabecalho.appendChild(th);
        });
        thead.appendChild(cabecalho);
        tabela.appendChild(thead);

        const tbody = document.createElement('tbody');
        horarios.forEach(item => {
            const tr = document.createElement('tr');
            const valores = [
                `${item.serie}º ano - ${item.curso}`,
                item.grupo || '—',
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

    async function carregarHorariosPadrao() {
        try {
            const horarios = await buscarHorarios();
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

    // Primeira exibição: as seis grades padrão.
    await carregarHorariosPadrao();

    // ===== MODAL DE EDIÇÃO DAS AULAS =====
    const modalEditarAula = document.getElementById('modal-editar-aula');
    const fecharEdicaoAula = document.getElementById('fechar-edicao-aula');
    const formEditarAula = document.getElementById('form-editar-aula');
    const inputDisciplina = document.getElementById('editar-disciplina');
    const inputProfessor = document.getElementById('editar-professor');
    const inputSala = document.getElementById('editar-sala');

    let celulaSelecionada = null;

    if (
        modalEditarAula &&
        formEditarAula &&
        inputDisciplina &&
        inputProfessor && 
        inputSala
    ) {

        document.addEventListener('click', (e) => {

            const celula = e.target.closest(
                '.grade tbody td:not(:first-child):not([colspan])'
            );

            if (!celula) return;

            celulaSelecionada = celula;

            inputDisciplina.value = celula.dataset.disciplina || '';
            inputProfessor.value = celula.dataset.professor || '';
            inputSala.value = celula.dataset.sala || '';

            modalEditarAula.showModal();
        });

        formEditarAula.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!celulaSelecionada) return;

            const disciplina = inputDisciplina.value.trim();
            const professor = inputProfessor.value.trim();
            const sala = inputSala.value.trim();

            if (!disciplina || !professor) return;

            celulaSelecionada.dataset.disciplina = disciplina;
            celulaSelecionada.dataset.professor = professor;
            celulaSelecionada.dataset.sala = sala;

            celulaSelecionada.innerHTML = '';

            const spanDisciplina = document.createElement('span');
            spanDisciplina.textContent = disciplina;

            const spanProfessor = document.createElement('span');
            spanProfessor.className = 'professor-aula';
            spanProfessor.textContent = professor;

            const spanSala = document.createElement('span');
            spanSala.className = 'sala-aula';
            spanSala.textContent = sala || '—';

            if (!sala) {
                spanSala.title = 'Sala não cadastrada';
            }

            celulaSelecionada.append(
                spanDisciplina,
                spanProfessor,
                spanSala
            );

            modalEditarAula.close();
            celulaSelecionada = null;
        });

        fecharEdicaoAula?.addEventListener('click', () => {
            modalEditarAula.close();
            celulaSelecionada = null;
        });

        modalEditarAula.addEventListener('click', (e) => {
            if (e.target === modalEditarAula) {
                modalEditarAula.close();
                celulaSelecionada = null;
            }
        });
    }

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
            const res = await fetch(base_url + '/historico', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            const data = await res.json();

            historico = data.historico || [];

        } catch {
            historico = [];
            mostrarToast('Erro ao carregar histórico', 'erro');
        }

        renderHistorico();
    }

    if (modalHistorico) {

        renderHistorico();

        fecharHistorico?.addEventListener('click', () => {
            modalHistorico.close();
        });

        modalHistorico.addEventListener('click', e => {
            if (e.target === modalHistorico) {
                modalHistorico.close();
            }
        });
    }

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

    //botão para fechar os modais
    const closeButtons = document.querySelectorAll('.btn-close-modal');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {//=> : é uma função anônima, mais curta que function(){} e mantém o contexto de 'this'
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {  // ← proteção
                modal.close();
            }
        });
    });
});
