let eventos = [];
let diaSelecionado = "";
let usuarioAtual = null;

function gerarIdEvento() {
  return `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function eventoPertenceAoUsuario(evento) {
  if (!usuarioAtual) return true;
  const ownerId = String(evento?.ownerUserId || "").trim();
  return !ownerId || ownerId === usuarioAtual.id;
}

function aplicarVinculoDaConta(evento) {
  const atualizado = { ...evento };
  let alterado = false;

  if (usuarioAtual && atualizado.ownerUserId !== usuarioAtual.id) {
    atualizado.ownerUserId = usuarioAtual.id;
    alterado = true;
  }

  if (usuarioAtual && atualizado.ownerUsername !== (usuarioAtual.username || "")) {
    atualizado.ownerUsername = usuarioAtual.username || "";
    alterado = true;
  }

  if (usuarioAtual && atualizado.ownerEmail !== (usuarioAtual.email || "")) {
    atualizado.ownerEmail = usuarioAtual.email || "";
    alterado = true;
  }

  return { evento: atualizado, alterado };
}

async function carregarEventosDoUsuario() {
  const lista = await window.appSupabase.carregarEventosConta();
  return (lista || []).filter(eventoPertenceAoUsuario);
}

async function salvarEventos() {
  for (const evento of eventos) {
    await window.appSupabase.salvarEventoCompleto(evento);
  }
}

async function normalizarEventos() {
  let alterado = false;
  const filtrados = [];

  eventos.forEach((evento) => {
    if (!eventoPertenceAoUsuario(evento)) {
      alterado = true;
      return;
    }

    const atualizado = { ...evento };

    if (!atualizado.id) {
      atualizado.id = gerarIdEvento();
      alterado = true;
    }

    if (!Array.isArray(atualizado.jogadores)) {
      atualizado.jogadores = [];
      alterado = true;
    }

    const resultado = aplicarVinculoDaConta(atualizado);
    if (resultado.alterado) {
      alterado = true;
    }

    filtrados.push(resultado.evento);
  });

  eventos = filtrados;

  if (alterado) {
    await salvarEventos();
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

async function excluirEvento(indice) {
  const evento = eventos[indice];
  if (!evento) return;
  await window.appSupabase.excluirEventoConta(evento.id);
  eventos.splice(indice, 1);
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
    btnExcluir.addEventListener("click", () => {
      excluirEvento(indice);
    });

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

async function trocarConta() {
  await window.appSupabase.deslogar();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    window.appSupabase.getSupabaseClient();
  } catch (error) {
    alert(`${error.message} Consulte SUPABASE_SETUP.md`);
    window.location.href = "login.html";
    return;
  }

  const authUser = await window.appSupabase.obterUsuarioAtualAuth();
  usuarioAtual = window.appSupabase.mapearUsuario(authUser);

  if (!usuarioAtual) {
    window.location.href = "login.html";
    return;
  }

  eventos = await carregarEventosDoUsuario();
  await normalizarEventos();
  inicializarDiasSemana();

  document.getElementById("cancelarEvento").addEventListener("click", fecharFormularioEvento);

  document.getElementById("formEvento").addEventListener("submit", async (event) => {
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

    const novoEvento = {
      id: gerarIdEvento(),
      nome,
      diaSemana: diaSelecionado,
      horaInicio,
      tipo,
      limiteJogadores,
      limiteGoleiros,
      jogadores: [],
      dataCriacao: new Date().toISOString(),
      ownerUserId: usuarioAtual.id,
      ownerUsername: usuarioAtual.username || "",
      ownerEmail: usuarioAtual.email || ""
    };

    await window.appSupabase.salvarEventoCompleto(novoEvento);
    eventos.unshift(novoEvento);
    listarEventos();
    fecharFormularioEvento();
  });

  listarEventos();
});
