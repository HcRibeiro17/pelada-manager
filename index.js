let eventos = [];
let diaSelecionado = "";
let usuarioAtual = null;
const THEME_STORAGE_KEY = "pelada_theme";
const estadoPaginacaoListas = {};
let resizeListasTimeoutId = null;

function aplicarTema(tema) {
  const modoNoturno = tema === "dark";
  document.body.classList.toggle("modo-noturno", modoNoturno);

  const btnTema = document.getElementById("btnTema");
  if (!btnTema) return;

  if (modoNoturno) {
    btnTema.textContent = "Dia";
    btnTema.setAttribute("aria-label", "Ativar modo claro");
    btnTema.setAttribute("title", "Ativar modo claro");
  } else {
    btnTema.textContent = "Noite";
    btnTema.setAttribute("aria-label", "Ativar modo noturno");
    btnTema.setAttribute("title", "Ativar modo noturno");
  }
}

function carregarTema() {
  const temaSalvo = localStorage.getItem(THEME_STORAGE_KEY);
  aplicarTema(temaSalvo === "dark" ? "dark" : "light");
}

function alternarTema() {
  const temaAtual = document.body.classList.contains("modo-noturno") ? "dark" : "light";
  const proximoTema = temaAtual === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, proximoTema);
  aplicarTema(proximoTema);
}

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

function calcularLimiteItensPorPagina(config = {}) {
  const largura = window.innerWidth || document.documentElement.clientWidth || 1280;
  const altura = window.innerHeight || document.documentElement.clientHeight || 800;
  const proporcaoTela = largura / Math.max(altura, 1);
  const min = Number.isFinite(config.min) ? Number(config.min) : 3;
  const max = Number.isFinite(config.max) ? Number(config.max) : 10;
  const alturaItem = largura <= 760
    ? (Number.isFinite(config.alturaItemMobile) ? Number(config.alturaItemMobile) : 148)
    : (Number.isFinite(config.alturaItemDesktop) ? Number(config.alturaItemDesktop) : 122);
  const fatorViewport = Number.isFinite(config.fatorViewport) ? Number(config.fatorViewport) : 0.58;

  let limite = Math.floor((altura * fatorViewport) / Math.max(alturaItem, 1));
  if (proporcaoTela < 0.8) limite -= 1;
  if (proporcaoTela > 1.7) limite += 1;
  if (!Number.isFinite(limite) || limite < 1) limite = min;

  return Math.max(min, Math.min(max, limite));
}

function obterContainerPaginacao(listId, lista) {
  const containerId = `paginacao-${listId}`;
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "paginacao-lista";
    container.dataset.targetList = listId;
    lista.insertAdjacentElement("afterend", container);
  }

  return container;
}

function limparPaginacaoLista(listId) {
  const container = document.getElementById(`paginacao-${listId}`);
  if (!container) return;
  container.innerHTML = "";
  container.classList.add("oculto");
}

function renderizarListaPaginada({ listId, itens, mensagemVazia, renderItem, onChangePagina, config = {} }) {
  const lista = document.getElementById(listId);
  if (!lista) return;

  const itensLista = Array.isArray(itens) ? itens : [];
  lista.innerHTML = "";

  if (itensLista.length === 0) {
    const li = document.createElement("li");
    li.textContent = mensagemVazia || "Nenhum registro encontrado.";
    lista.appendChild(li);
    limparPaginacaoLista(listId);
    return;
  }

  const limitePorPagina = calcularLimiteItensPorPagina(config);
  const totalPaginas = Math.max(1, Math.ceil(itensLista.length / limitePorPagina));
  const paginaArmazenada = Number(estadoPaginacaoListas[listId] || 1);
  const paginaAtual = Math.max(1, Math.min(totalPaginas, paginaArmazenada));
  estadoPaginacaoListas[listId] = paginaAtual;

  const inicio = (paginaAtual - 1) * limitePorPagina;
  const fim = inicio + limitePorPagina;
  const itensPagina = itensLista.slice(inicio, fim);

  itensPagina.forEach((item, indexPagina) => {
    const itemGlobalIndex = inicio + indexPagina;
    const li = renderItem(item, itemGlobalIndex);
    if (li) lista.appendChild(li);
  });

  const paginacao = obterContainerPaginacao(listId, lista);
  if (totalPaginas <= 1) {
    paginacao.innerHTML = "";
    paginacao.classList.add("oculto");
    return;
  }

  paginacao.classList.remove("oculto");
  paginacao.innerHTML = "";

  const btnAnterior = document.createElement("button");
  btnAnterior.type = "button";
  btnAnterior.className = "btn-paginacao";
  btnAnterior.textContent = "Anterior";
  btnAnterior.disabled = paginaAtual <= 1;
  btnAnterior.addEventListener("click", () => {
    if (paginaAtual <= 1) return;
    estadoPaginacaoListas[listId] = paginaAtual - 1;
    if (typeof onChangePagina === "function") onChangePagina();
  });

  const info = document.createElement("span");
  info.className = "paginacao-lista-info";
  info.textContent = `Pagina ${paginaAtual} de ${totalPaginas} | ${itensLista.length} itens`;

  const btnProxima = document.createElement("button");
  btnProxima.type = "button";
  btnProxima.className = "btn-paginacao";
  btnProxima.textContent = "Proxima";
  btnProxima.disabled = paginaAtual >= totalPaginas;
  btnProxima.addEventListener("click", () => {
    if (paginaAtual >= totalPaginas) return;
    estadoPaginacaoListas[listId] = paginaAtual + 1;
    if (typeof onChangePagina === "function") onChangePagina();
  });

  paginacao.appendChild(btnAnterior);
  paginacao.appendChild(info);
  paginacao.appendChild(btnProxima);
}

function mostrarEstadoListaEventos(mensagem) {
  const lista = document.getElementById("listaEventos");
  if (!lista) return;

  lista.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = mensagem;
  lista.appendChild(li);
  limparPaginacaoLista("listaEventos");
}

function normalizarEventos() {
  const filtrados = [];
  const eventosParaPersistir = [];

  eventos.forEach((evento) => {
    if (!eventoPertenceAoUsuario(evento)) {
      return;
    }

    const atualizado = { ...evento };
    let itemAlterado = false;

    if (!atualizado.id) {
      atualizado.id = gerarIdEvento();
      itemAlterado = true;
    }

    if (!Array.isArray(atualizado.jogadores)) {
      atualizado.jogadores = [];
      itemAlterado = true;
    }

    const resultado = aplicarVinculoDaConta(atualizado);
    if (resultado.alterado) {
      itemAlterado = true;
    }

    if (itemAlterado) {
      eventosParaPersistir.push(resultado.evento);
    }

    filtrados.push(resultado.evento);
  });

  eventos = filtrados;

  if (eventosParaPersistir.length > 0) {
    Promise.allSettled(
      eventosParaPersistir.map((evento) => window.appSupabase.salvarEventoBasico(evento))
    ).then((resultados) => {
      const falha = resultados.find((resultado) => resultado.status === "rejected");
      if (falha) {
        console.warn("Falha ao persistir normalizacao de evento:", falha.reason || falha);
      }
    });
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

async function excluirEvento(eventId) {
  const indice = eventos.findIndex((evento) => evento.id === eventId);
  const evento = indice >= 0 ? eventos[indice] : null;
  if (!evento) return;
  await window.appSupabase.excluirEventoConta(evento.id);
  eventos.splice(indice, 1);
  listarEventos();
}

function listarEventos() {
  renderizarListaPaginada({
    listId: "listaEventos",
    itens: eventos,
    mensagemVazia: "Nenhum evento cadastrado ainda.",
    onChangePagina: listarEventos,
    config: {
      min: 3,
      max: 9,
      alturaItemDesktop: 124,
      alturaItemMobile: 146,
      fatorViewport: 0.58
    },
    renderItem: (evento) => {
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
        excluirEvento(evento.id);
      });

      acoes.appendChild(linkDetalhes);
      acoes.appendChild(btnExcluir);

      li.appendChild(titulo);
      li.appendChild(detalhes);
      li.appendChild(limites);
      li.appendChild(acoes);
      return li;
    }
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
  carregarTema();
  mostrarEstadoListaEventos("Carregando eventos...");

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
  normalizarEventos();
  inicializarDiasSemana();

  document.getElementById("cancelarEvento").addEventListener("click", fecharFormularioEvento);
  document.getElementById("btnTema").addEventListener("click", alternarTema);
  window.addEventListener("resize", () => {
    clearTimeout(resizeListasTimeoutId);
    resizeListasTimeoutId = setTimeout(() => {
      listarEventos();
    }, 140);
  });

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

    await window.appSupabase.salvarEventoBasico(novoEvento);
    eventos.unshift(novoEvento);
    estadoPaginacaoListas.listaEventos = 1;
    listarEventos();
    fecharFormularioEvento();
  });

  listarEventos();
});
