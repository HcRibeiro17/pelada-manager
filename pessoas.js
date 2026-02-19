const CHAVE_USUARIOS = "usuarios";
const CHAVE_USUARIO_ATUAL = "usuarioAtualId";

function carregarUsuarios() {
  return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
}

function salvarUsuarios(usuarios) {
  localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
}

function gerarIdUsuario() {
  return `usr_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function selecionarUsuario(idUsuario) {
  localStorage.setItem(CHAVE_USUARIO_ATUAL, idUsuario);
  window.location.href = "index.html";
}

function excluirUsuario(idUsuario) {
  const usuarios = carregarUsuarios().filter((usuario) => usuario.id !== idUsuario);
  salvarUsuarios(usuarios);

  const eventosPorUsuario = JSON.parse(localStorage.getItem("eventosPorUsuario")) || {};
  delete eventosPorUsuario[idUsuario];
  localStorage.setItem("eventosPorUsuario", JSON.stringify(eventosPorUsuario));

  const atual = localStorage.getItem(CHAVE_USUARIO_ATUAL);
  if (atual === idUsuario) {
    localStorage.removeItem(CHAVE_USUARIO_ATUAL);
  }

  renderizarPessoas();
}

function renderizarPessoas() {
  const lista = document.getElementById("listaPessoas");
  const usuarios = carregarUsuarios();
  const usuarioAtualId = localStorage.getItem(CHAVE_USUARIO_ATUAL);

  lista.innerHTML = "";

  if (usuarios.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma pessoa cadastrada.";
    lista.appendChild(li);
    return;
  }

  usuarios.forEach((usuario) => {
    const li = document.createElement("li");

    const nome = document.createElement("span");
    nome.textContent = usuarioAtualId === usuario.id ? `${usuario.nome} (conta ativa)` : usuario.nome;

    const acoes = document.createElement("div");
    acoes.className = "acoes-evento";

    const btnEntrar = document.createElement("button");
    btnEntrar.type = "button";
    btnEntrar.className = "btn-detalhes";
    btnEntrar.textContent = "Entrar";
    btnEntrar.addEventListener("click", () => selecionarUsuario(usuario.id));

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn-excluir";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", () => excluirUsuario(usuario.id));

    acoes.appendChild(btnEntrar);
    acoes.appendChild(btnExcluir);

    li.appendChild(nome);
    li.appendChild(acoes);
    lista.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("formPessoa").addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = document.getElementById("nomePessoa").value.trim();
    if (!nome) {
      return;
    }

    const usuarios = carregarUsuarios();
    usuarios.push({ id: gerarIdUsuario(), nome });
    salvarUsuarios(usuarios);

    document.getElementById("formPessoa").reset();
    renderizarPessoas();
  });

  renderizarPessoas();
});
