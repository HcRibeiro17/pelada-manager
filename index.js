const CHAVE_USUARIOS = "usuarios";
const CHAVE_USUARIO_ATUAL = "usuarioAtualId";
const CHAVE_EVENTOS_POR_USUARIO = "eventosPorUsuario";

let eventos = [];
let diaSelecionado = "";
let usuarioAtual = null;

function carregarUsuarios() {
  return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
}

function obterUsuarioAtual() {
  const usuarios = carregarUsuarios();
  const usuarioAtualId = localStorage.getItem(CHAVE_USUARIO_ATUAL);
  return usuarios.find((usuario) => usuario.id === usuarioAtualId) || null;
}

function carregarEventosDoUsuario(idUsuario) {
  const eventosPorUsuario = JSON.parse(localStorage.getItem(CHAVE_EVENTOS_POR_USUARIO)) || {};

  if (!eventosPorUsuario[idUsuario]) {
    const eventosLegado = JSON.parse(localStorage.getItem("eventos")) || [];
    const semContasMigradas = Object.keys(eventosPorUsuario).length === 0;
    eventosPorUsuario[idUsuario] = semContasMigradas ? eventosLegado : [];
    localStorage.setItem(CHAVE_EVENTOS_POR_USUARIO, JSON.stringify(eventosPorUsuario));
  }

  return eventosPorUsuario[idUsuario] || [];
}

function salvarEventos() {
  const eventosPorUsuario = JSON.parse(localStorage.getItem(CHAVE_EVENTOS_POR_USUARIO)) || {};
  eventosPorUsuario[usuarioAtual.id] = eventos;
  localStorage.setItem(CHAVE_EVENTOS_POR_USUARIO, JSON.stringify(eventosPorUsuario));
}

function gerarIdEvento() {
  return `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function normalizarEventos() {
  let alterado = false;

  eventos = eventos.map((evento) => {
    const atualizado = { ...evento };

    if (!atualizado.id) {
      atualizado.id = gerarIdEvento();
      alterado = true;
    }

    if (!Array.isArray(atualizado.jogadores)) {
      atualizado.jogadores = [];
      alterado = true;
    }

    return atualizado;
  });

  if (alterado) {
    salvarEventos();
  }
}

function abrirFormularioEvento() {
  const container = document.getElementById("formEventoContainer");
  const form = document.getElementById("formEvento");
  const nomeInput = document.getElementById("nomeEvento");

  form.reset();
  diaSelecionado = "";
  document.querySelectorAll(".dia-btn").forEach((btn) => btn.classList.remove("selecionado"));

  container.classList.remove("oculto");
  nomeInput.focus();
}

function fecharFormularioEvento() {
  const container = document.getElementById("formEventoContainer");
  container.classList.add("oculto");
}

function inicializarDiasSemana() {
  const botoesDia = document.querySelectorAll(".dia-btn");

  botoesDia.forEach((botao) => {
    botao.addEventListener("click", () => {
      botoesDia.forEach((b) => b.classList.remove("selecionado"));
      botao.classList.add("selecionado");
      diaSelecionado = botao.dataset.dia;
    });
  });
}

function excluirEvento(indice) {
  eventos.splice(indice, 1);
  salvarEventos();
  listarEventos();
}

function listarEventos() {
  const lista = document.getElementById("listaEventos");
  lista.innerHTML = "";

  eventos.forEach((evento, indice) => {
    const li = document.createElement("li");

    const titulo = document.createElement("h3");
    titulo.textContent = evento.nome;

    const detalhes = document.createElement("p");
    detalhes.textContent = `${evento.diaSemana} | ${evento.horaInicio} | ${evento.tipo}`;

    const limites = document.createElement("p");
    limites.textContent = `Jogadores: ${evento.limiteJogadores} | Goleiros: ${evento.limiteGoleiros}`;

    const acoes = document.createElement("div");
    acoes.className = "acoes-evento";

    const linkDetalhes = document.createElement("a");
    linkDetalhes.className = "btn-detalhes";
    linkDetalhes.href = `evento.html?id=${encodeURIComponent(evento.id)}`;
    linkDetalhes.textContent = "Ver detalhes";

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn-excluir";
    btnExcluir.type = "button";
    btnExcluir.textContent = "Excluir evento";
    btnExcluir.addEventListener("click", () => excluirEvento(indice));

    acoes.appendChild(linkDetalhes);
    acoes.appendChild(btnExcluir);

    li.appendChild(titulo);
    li.appendChild(detalhes);
    li.appendChild(limites);
    li.appendChild(acoes);
    lista.appendChild(li);
  });
}

function toggleMenu() {
  const menu = document.getElementById("menuLateral");
  const btn = document.getElementById("menuBtn");
  const aberto = menu.classList.toggle("aberto");

  document.body.classList.toggle("menu-aberto", aberto);

  if (btn) {
    btn.textContent = aberto ? "X" : "☰";
    btn.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    btn.setAttribute("aria-expanded", aberto.toString());
  }
}

function trocarConta() {
  localStorage.removeItem(CHAVE_USUARIO_ATUAL);
  window.location.href = "pessoas.html";
}

document.addEventListener("DOMContentLoaded", () => {
  usuarioAtual = obterUsuarioAtual();

  if (!usuarioAtual) {
    window.location.href = "pessoas.html";
    return;
  }

  eventos = carregarEventosDoUsuario(usuarioAtual.id);
  normalizarEventos();
  inicializarDiasSemana();

  document.getElementById("cancelarEvento").addEventListener("click", fecharFormularioEvento);

  document.getElementById("formEvento").addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = document.getElementById("nomeEvento").value.trim();
    const horaInicio = document.getElementById("horaInicio").value;
    const tipo = document.getElementById("tipoEvento").value;
    const limiteJogadores = Number(document.getElementById("limiteJogadores").value);
    const limiteGoleiros = Number(document.getElementById("limiteGoleiros").value);

    if (!diaSelecionado) {
      alert("Selecione o dia da semana do evento.");
      return;
    }

    if (limiteGoleiros > limiteJogadores) {
      alert("O limite de goleiros nao pode ser maior que o limite de jogadores.");
      return;
    }

    eventos.push({
      id: gerarIdEvento(),
      nome,
      diaSemana: diaSelecionado,
      horaInicio,
      tipo,
      limiteJogadores,
      limiteGoleiros,
      jogadores: [],
      dataCriacao: new Date().toISOString()
    });

    salvarEventos();
    listarEventos();
    fecharFormularioEvento();
  });

  listarEventos();
});
