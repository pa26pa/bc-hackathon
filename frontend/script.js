document.addEventListener("DOMContentLoaded", async function () {

    // ===== CONFIG (ajuste se sua API for outra) =====
    const base_url = '/api';
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    // ===== TOAST simples =====
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
        especial: (s) => /[^A-Za-z0-9]/.test(s),
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
        if (validarSenha()) listaRequisitos.classList.remove('visivel');
    });

    senhaInput.addEventListener('input', () => {
        senhaErro.textContent = '';
        validarSenha();
        atualizarBotao();
    });

    atualizarBotao();

    // ===== LOGIN (registrado cedo, antes de qualquer coisa que possa falhar) =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validarEmail() || !validarSenha()) return;

        btnLogin.disabled = true;

        try {
            const resposta = await fetch('/api/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    senha: senhaInput.value,
                }),
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
            const code = Array.from(inputs).map(i => i.value).join('');
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
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
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
            getCode: () => Array.from(inputs).map(i => i.value).join(''),
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

        // TODO: chamar a API que envia o código por email
        esqueciBox.style.display = 'none';
        codigoBox.style.display = 'flex';
        if (otpLogin) {
            otpLogin.reset();
            otpLogin.startTimer();
        }
    });

    codigoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // TODO: validar o código na API usando otpLogin.getCode()
    });

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
                .catch(() => mostrarToast('Erro ao reenviar código', 'erro'));
        });
    }

    // ===== GRADES DE AULAS (geradas aqui) =====
    const HORARIOS_MANHA = [
        { h: '07:00 - 07:50' },
        { h: '07:50 - 08:40' },
        { h: '08:40 - 09:30' },
        { h: '09:30 - 09:45', fixo: 'Intervalo' },
        { h: '09:45 - 10:35' },
        { h: '10:35 - 11:25' },
        { h: '11:25 - 12:15' },
    ];

    const HORARIOS_TARDE = [
        { h: '12:15 - 13:00', fixo: 'Almoço' },
        { h: '13:00 - 13:50' },
        { h: '13:50 - 14:40' },
        { h: '14:40 - 15:45' },
        { h: '15:45 - 16:35' },
        { h: '16:35 - 17:25' },
        { h: '17:25 - 18:15' }, 
    ];

    const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    const TURMAS = [
        { nome: '1ºano - Manhã', horarios: HORARIOS_MANHA },
        { nome: '1ºano - Tarde', horarios: HORARIOS_TARDE },
        { nome: '2ºano - Manhã', horarios: HORARIOS_MANHA },
        { nome: '2ºano - Tarde', horarios: HORARIOS_TARDE },
        { nome: '3ºano - Manhã', horarios: HORARIOS_MANHA },
        { nome: '3ºano - Tarde', horarios: HORARIOS_TARDE },
    ];

    function criarGrade(turma, indice) {
        const table = document.createElement('table');
        table.className = 'grade';
        table.dataset.turma = turma.nome;

        // caption com seletor de grupo
        const caption = document.createElement('caption');
        caption.className = 'select-grupo';
        caption.appendChild(document.createTextNode(`Grade semana - Turma selecionada: ${turma.nome}`));

        const divGrupo = document.createElement('div');
        divGrupo.className = 'secao-busca-grupo';

        const selectId = `escolher-grupo-${indice}`;
        const label = document.createElement('label');
        label.htmlFor = selectId;
        label.textContent = 'Grupo';

        const select = document.createElement('select');
        select.id = selectId;
        select.name = selectId;
        [['', 'Todos os grupos'], ['Grupo A', 'Grupo A'], ['Grupo B', 'Grupo B']].forEach(([valor, texto]) => {
            const opt = document.createElement('option');
            opt.value = valor;
            opt.textContent = texto;
            select.appendChild(opt);
        });

        divGrupo.append(label, select);
        caption.appendChild(divGrupo);
        table.appendChild(caption);

        // cabeçalho
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        ['Horário', ...DIAS].forEach(texto => {
            const th = document.createElement('th');
            th.textContent = texto;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // corpo
        const tbody = document.createElement('tbody');
        turma.horarios.forEach(linha => {
            const tr = document.createElement('tr');

            const tdHora = document.createElement('td');
            tdHora.textContent = linha.h;
            tr.appendChild(tdHora);

            if (linha.fixo) {
                const td = document.createElement('td');
                td.colSpan = DIAS.length;
                td.textContent = linha.fixo;
                tr.appendChild(td);
            } else {
                DIAS.forEach(() => {
                    const td = document.createElement('td');
                    td.textContent = 'Disciplina';
                    tr.appendChild(td);
                });
            }

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    }

    const gradesContainer = document.getElementById('grades-container');
    if (gradesContainer) {
        gradesContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;';
        TURMAS.forEach((turma, i) => gradesContainer.appendChild(criarGrade(turma, i)));
    }

    // ===== MODAL DE EDIÇÃO DAS AULAS =====
    const modalEditarAula = document.getElementById('modal-editar-aula');
    const fecharEdicaoAula = document.getElementById('fechar-edicao-aula');
    const formEditarAula = document.getElementById('form-editar-aula');
    const inputDisciplina = document.getElementById('editar-disciplina');
    const inputProfessor = document.getElementById('editar-professor');

    let celulaSelecionada = null;

    // Proteção: se algum elemento não existir, o resto do script continua funcionando
    if (modalEditarAula && formEditarAula && inputDisciplina && inputProfessor) {

        document.addEventListener('click', (e) => {
            const celula = e.target.closest('.grade tbody td:not(:first-child):not([colspan])');
            if (!celula) return;

            celulaSelecionada = celula;

            inputDisciplina.value = celula.dataset.disciplina || '';
            inputProfessor.value = celula.dataset.professor || '';

            modalEditarAula.showModal();
        });

        formEditarAula.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!celulaSelecionada) return;

            const disciplina = inputDisciplina.value.trim();
            const professor = inputProfessor.value.trim();

            if (!disciplina || !professor) return;

            celulaSelecionada.dataset.disciplina = disciplina;
            celulaSelecionada.dataset.professor = professor;

            // textContent evita injeção de HTML
            celulaSelecionada.textContent = disciplina;
            const span = document.createElement('span');
            span.className = 'professor-aula';
            span.textContent = professor;
            celulaSelecionada.appendChild(span);

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
        document.querySelectorAll('.busca-box input').forEach(i => i.value = '');
    });

    // ===== VERIFICA SE JÁ EXISTE UMA SESSÃO =====
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
            if (!dropdownMenu.contains(e.target) && !btnDropdown.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // ===== MODO ESCURO =====
    const btnTema = document.querySelectorAll('.btn-tema');
    if (btnTema.length) {
        const temaSalvo = localStorage.getItem('witch-tema') || 'claro';
        document.documentElement.setAttribute('data-tema', temaSalvo === 'escuro' ? 'escuro' : '');
        btnTema.forEach((btn) => {
            btn.checked = temaSalvo === 'escuro';
            btn.addEventListener('change', () => {
                const escuro = btn.checked;
                document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : '');
                localStorage.setItem('witch-tema', escuro ? 'escuro' : 'claro');
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
        edicao: { classe: 'edicao', texto: 'Edição de tabela' },
        senha: { classe: 'senha', texto: 'Troca de senha' },
        email: { classe: 'email', texto: 'Troca de e-mail' }
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
                headers: { 'X-CSRFToken': csrfToken }
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

        fecharHistorico?.addEventListener('click', () => modalHistorico.close());

        modalHistorico.addEventListener('click', e => {
            if (e.target === modalHistorico) modalHistorico.close();
        });
    }

    // ===== ABRIR MODAIS =====
    document.querySelectorAll('.btn-open-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (!modal) return;

            dropdownMenu?.classList.remove('show');

            if (modalId === 'modal-1') carregarHistorico();

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

    let tamanhoFonte = Number(localStorage.getItem('tamanho-fonte')) || tamanhoPadrao;

    function atualizarFonte() {
        document.documentElement.style.fontSize = tamanhoFonte + 'px';

        if (tamanhoAtual) tamanhoAtual.textContent = tamanhoFonte + 'px';
        if (aumentarFonte) aumentarFonte.disabled = tamanhoFonte >= tamanhoMaximo;
        if (diminuirFonte) diminuirFonte.disabled = tamanhoFonte <= tamanhoMinimo;

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
        fecharFonte?.addEventListener('click', () => modalFonte.close());
        fecharFonteX?.addEventListener('click', () => modalFonte.close());

        modalFonte.addEventListener('click', (e) => {
            if (e.target === modalFonte) modalFonte.close();
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