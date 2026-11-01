// OI LARI, mano ignora esse código, fiz para termos uma ideia de como chamar a API
const button = document.getElementById('teste')

button.addEventListener("click", async() => {
    const novoUsuario = {
        email: 'teste@gmail.com',
        senha: '123456'
    };
    try {
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoUsuario)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            console.log('Login realizado com sucesso:', resultado);
        } else {
            console.log('Erro:', resultado.mensagem);         
        }

    } catch (error) {
        console.error('Erro ao conectar com o servidor:', error);
    }

    alert("Button was clicked!");
});
