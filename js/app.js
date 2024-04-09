let auth0Client;
let user = null;
let tarefasContainer = null;

document.addEventListener('DOMContentLoaded', async () => {
    tarefasContainer = document.getElementById('tasks-list');
    try {
        auth0Client = await createAuth0Client({
            domain: 'dev-6je86woartrc1pi1.us.auth0.com',
            client_id: 'W167A9iGNOl6wtYnkNAkFbgkmclnFf4W',
            redirect_uri: 'https://avelando.github.io/js-dom-api/'
        });

        if (window.location.search.includes('code=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, '/'); 
        }

        updateUI(await auth0Client.isAuthenticated());
        user = await auth0Client.getUser();
        carregarTarefasLocais();
    } catch (error) {
        console.error('Erro na autenticação:', error);
    }

    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('form-tarefa').addEventListener('submit', adicionarTarefa);
});

async function login() {
    await auth0Client.loginWithRedirect();
}

async function logout() {
    await auth0Client.logout({ returnTo: window.location.origin });
    user = null;
    updateUI(false);
}

function updateUI(isAuthenticated) {
    document.getElementById('btn-login').style.display = isAuthenticated ? 'none' : 'block';
    document.getElementById('btn-logout').style.display = isAuthenticated ? 'block' : 'none';
}

function adicionarTarefa(event) {
    event.preventDefault();
    if (!user) {
        alert("Você precisa estar logado para adicionar tarefas.");
        return;
    }

    const title = document.getElementById('title').value;
    const info = document.getElementById('info').value;
    const label = document.getElementById('label').value;
    const date = document.getElementById('date').value;

    const tarefaData = { id: Date.now().toString(), title, info, label, date, userId: user.sub };

    salvarTarefaLocalmente(tarefaData);
    adicionarTarefaDOM(tarefaData);

    document.getElementById('form-tarefa').reset();
}

function salvarTarefaLocalmente(tarefaData) {
    let tarefas = JSON.parse(localStorage.getItem(user.sub)) || [];
    tarefas.push(tarefaData);
    localStorage.setItem(user.sub, JSON.stringify(tarefas));
}

function carregarTarefasLocais() {
    if (!user) {
        return;
    }
    let tarefas = JSON.parse(localStorage.getItem(user.sub)) || [];
    const tasksListUl = document.querySelector('#tasks-list ul');
    tasksListUl.innerHTML = '';
    tarefas.forEach(tarefaData => {
        const tarefaLi = criarElementoTarefa(tarefaData);
        tasksListUl.appendChild(tarefaLi);
    });
    applyCompletionListeners();
}

function adicionarTarefaDOM(tarefaData) {
    const tarefaLi = criarElementoTarefa(tarefaData);
    const tasksListUl = document.querySelector('#tasks-list ul');
    tasksListUl.appendChild(tarefaLi);
}

function criarElementoTarefa(tarefaData) {
    const tarefaLi = document.createElement('li');
    tarefaLi.classList.add('tarefa');
    tarefaLi.setAttribute('data-task-id', tarefaData.id);

    const titleEl = document.createElement('h3');
    titleEl.textContent = tarefaData.title;

    const infoEl = document.createElement('p');
    infoEl.textContent = tarefaData.info;

    const labelEl = document.createElement('span');
    labelEl.textContent = tarefaData.label;

    const dateEl = document.createElement('time');
    dateEl.textContent = tarefaData.date;

    const concluirBtn = document.createElement('button');
    concluirBtn.textContent = 'Concluir';
    concluirBtn.classList.add('concluir');
    concluirBtn.addEventListener('click', () => toggleTaskCompletion(tarefaData.id));

    const excluirBtn = document.createElement('button');
    excluirBtn.textContent = 'Excluir';
    excluirBtn.classList.add('excluir');
    excluirBtn.addEventListener('click', () => {
        tarefaLi.remove();
        removerTarefa(tarefaData.id);
    });

    tarefaLi.appendChild(titleEl);
    tarefaLi.appendChild(infoEl);
    tarefaLi.appendChild(labelEl);
    tarefaLi.appendChild(dateEl);
    tarefaLi.appendChild(concluirBtn);
    tarefaLi.appendChild(excluirBtn);

    return tarefaLi;
}


function removerTarefa(tarefaId) {
    let tarefas = JSON.parse(localStorage.getItem(user.sub));
    tarefas = tarefas.filter(tarefa => tarefa.id !== tarefaId);
    localStorage.setItem(user.sub, JSON.stringify(tarefas));
}

function atualizarStatusTarefa(tarefaId) {
    let tarefas = JSON.parse(localStorage.getItem(user.sub));
    const tarefaIndex = tarefas.findIndex(tarefa => tarefa.id === tarefaId);
    if (tarefaIndex !== -1) {
        tarefas[tarefaIndex].concluida = !tarefas[tarefaIndex].concluida;
    }
    localStorage.setItem(user.sub, JSON.stringify(tarefas));
}

function toggleTaskCompletion(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    taskElement.classList.toggle('concluida');
    atualizarStatusTarefa(taskId);

    setTimeout(() => {
        if (taskElement.classList.contains('concluida')) {
            taskElement.parentNode.appendChild(taskElement);
        } else {
            taskElement.parentNode.prepend(taskElement);
        }
        salvarOrdemTarefas();
    }, 100);
}

function salvarOrdemTarefas() {
    let tarefas = [];
    document.querySelectorAll('.tarefa').forEach(taskElement => {
        const taskId = taskElement.getAttribute('data-task-id');
        const tarefa = JSON.parse(localStorage.getItem(user.sub)).find(t => t.id === taskId);
        if (tarefa) {
            tarefas.push(tarefa);
        }
    });
    localStorage.setItem(user.sub, JSON.stringify(tarefas));
}

function carregarTarefasNoDOM() {
    const tarefasSalvas = JSON.parse(localStorage.getItem(user.sub)) || [];
    tarefasContainer.innerHTML = '';
    tarefasSalvas.forEach(tarefaData => {
        const tarefaElement = criarElementoTarefa(tarefaData);
        tarefasContainer.appendChild(tarefaElement);
        if(tarefaData.concluida) {
            tarefaElement.classList.add('concluida');
            tarefasContainer.appendChild(tarefaElement);
        }
    });
    applyCompletionListeners();
}

function applyCompletionListeners() {
    document.querySelectorAll('.tarefa .concluir').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = this.closest('.tarefa').getAttribute('data-task-id');
            toggleTaskCompletion(taskId);
        });
    });
}

carregarTarefasNoDOM();
