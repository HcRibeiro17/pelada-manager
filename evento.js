
const params = new URLSearchParams(window.location.search);
const eventoId = params.get("id");
let eventoAtual = null;
let diaSelecionado = "";
let nivelSelecionado = 0;
let usuarioAtual = null;
let selectedHistoryMatchId = "";
let selectedChampionshipId = "";
let matchIntervalId = null;
let salvarCounter = 0;
let partidasCarregadas = false;
let cargaPartidasPromise = null;
let campeonatos = [];
let campeonatosCarregados = false;
let cargaCampeonatosPromise = null;
const estadoPaginacaoListas = {};
let resizePaginacaoTimeoutId = null;

function gerarId(prefixo) {
  return `${prefixo}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function segundosParaDuracao(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function duracaoParaSegundos(duracaoTexto) {
  const texto = String(duracaoTexto || "").trim();
  const match = texto.match(/^(\d{2}):([0-5]\d)$/);
  if (!match) return null;
  const minutos = Number(match[1]);
  const segundos = Number(match[2]);
  return (minutos * 60) + segundos;
}

function aplicarVinculoDaConta(evento) {
  let alterado = false;

  if (usuarioAtual && evento.ownerUserId !== usuarioAtual.id) {
    evento.ownerUserId = usuarioAtual.id;
    alterado = true;
  }

  if (usuarioAtual && evento.ownerUsername !== (usuarioAtual.username || "")) {
    evento.ownerUsername = usuarioAtual.username || "";
    alterado = true;
  }

  if (usuarioAtual && evento.ownerEmail !== (usuarioAtual.email || "")) {
    evento.ownerEmail = usuarioAtual.email || "";
    alterado = true;
  }

  return alterado;
}

function salvarEventos() {
  if (!eventoAtual) return Promise.resolve();
  if (!partidasCarregadas) {
    return garantirPartidasCarregadas().then(() => window.appSupabase.salvarEventoCompleto(eventoAtual));
  }
  return window.appSupabase.salvarEventoCompleto(eventoAtual);
}

async function garantirPartidasCarregadas() {
  if (partidasCarregadas) return;

  if (cargaPartidasPromise) {
    await cargaPartidasPromise;
    return;
  }

  cargaPartidasPromise = (async () => {
    const dadosPartidas = await window.appSupabase.carregarDadosPartidasEvento(eventoId);
    if (!dadosPartidas) {
      partidasCarregadas = true;
      return;
    }

    eventoAtual.matches = Array.isArray(dadosPartidas.matches) ? dadosPartidas.matches : [];
    eventoAtual.activeMatchId = dadosPartidas.activeMatchId || "";
    if (Number.isFinite(dadosPartidas.matchDurationMinutes)) {
      eventoAtual.matchDurationMinutes = dadosPartidas.matchDurationMinutes;
    }
    partidasCarregadas = true;
  })();

  try {
    await cargaPartidasPromise;
  } finally {
    cargaPartidasPromise = null;
  }
}

async function garantirCampeonatosCarregados() {
  if (campeonatosCarregados) return;

  if (cargaCampeonatosPromise) {
    await cargaCampeonatosPromise;
    return;
  }

  cargaCampeonatosPromise = (async () => {
    campeonatos = await window.appSupabase.carregarCampeonatosEvento(eventoId);
    campeonatosCarregados = true;
  })();

  try {
    await cargaCampeonatosPromise;
  } finally {
    cargaCampeonatosPromise = null;
  }
}

async function trocarConta() {
  await window.appSupabase.deslogar();
  window.location.href = "login.html";
}

function inicializarEstruturaEvento() {
  if (!Array.isArray(eventoAtual.jogadores)) {
    eventoAtual.jogadores = [];
  }

  eventoAtual.jogadores = eventoAtual.jogadores.map((jogador) => ({
    ...jogador,
    golsTotal: Number.isFinite(jogador.golsTotal) ? jogador.golsTotal : 0,
    assistsTotal: Number.isFinite(jogador.assistsTotal) ? jogador.assistsTotal : 0,
    vitoriasTotal: Number.isFinite(jogador.vitoriasTotal) ? jogador.vitoriasTotal : 0
  }));

  if (!Array.isArray(eventoAtual.times)) {
    eventoAtual.times = [];
  }

  if (!Array.isArray(eventoAtual.matches)) {
    eventoAtual.matches = [];
  }

  if (!Number.isFinite(eventoAtual.matchDurationMinutes)) {
    eventoAtual.matchDurationMinutes = 10;
  }

  if (typeof eventoAtual.activeMatchId !== "string") {
    eventoAtual.activeMatchId = "";
  }
}

async function carregarEvento() {
  eventoAtual = await window.appSupabase.carregarEventoBasico(eventoId);

  if (!eventoAtual) {
    alert("Evento nao encontrado.");
    window.location.href = "index.html";
    return false;
  }

  inicializarEstruturaEvento();
  if (aplicarVinculoDaConta(eventoAtual)) {
    window.appSupabase.salvarEventoBasico(eventoAtual);
  }
  partidasCarregadas = false;
  return true;
}

function preencherInfoEvento() {
  document.getElementById("tituloEvento").textContent = eventoAtual.nome;
  document.getElementById("nomeEvento").value = eventoAtual.nome || "";
  document.getElementById("horaInicio").value = eventoAtual.horaInicio || "";
  document.getElementById("tipoEvento").value = eventoAtual.tipo || "";
  document.getElementById("limiteJogadores").value = eventoAtual.limiteJogadores || "";
  document.getElementById("limiteGoleiros").value = eventoAtual.limiteGoleiros || "";
  const duracaoPadraoSec = Math.max(1, Math.round(Number(eventoAtual.matchDurationMinutes || 10) * 60));
  document.getElementById("duracaoPartida").value = segundosParaDuracao(duracaoPadraoSec);

  diaSelecionado = eventoAtual.diaSemana || "";
  atualizarDiaSelecionado();
}

function atualizarDiaSelecionado() {
  document.querySelectorAll("#diasSemanaInfo .dia-btn").forEach((botao) => {
    const selecionado = botao.dataset.dia === diaSelecionado;
    botao.classList.toggle("selecionado", selecionado);
  });
}

function inicializarDiasSemana() {
  document.querySelectorAll("#diasSemanaInfo .dia-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      diaSelecionado = botao.dataset.dia;
      atualizarDiaSelecionado();
    });
  });
}

function inicializarAbas() {
  document.querySelectorAll(".aba-btn").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const aba = botao.dataset.aba;

      document.querySelectorAll(".aba-btn").forEach((b) => b.classList.remove("ativa"));
      document.querySelectorAll(".aba-conteudo").forEach((c) => c.classList.remove("ativa"));

      botao.classList.add("ativa");
      document.getElementById(`aba-${aba}`).classList.add("ativa");

      if (aba === "partidas") {
        try {
          await garantirPartidasCarregadas();
        } catch (error) {
          alert(`Falha ao carregar partidas: ${error.message || error}`);
          return;
        }
        renderizarPartidas();
        retomarCronometroSeNecessario();
        return;
      }

      if (aba === "campeonatos") {
        try {
          await garantirCampeonatosCarregados();
        } catch (error) {
          alert(`Falha ao carregar peladas: ${error.message || error}`);
          return;
        }
        renderizarCampeonatos();
      }
    });
  });
}

function salvarInfoEvento(event) {
  event.preventDefault();

  const nome = document.getElementById("nomeEvento").value.trim();
  const horaInicio = document.getElementById("horaInicio").value;
  const tipo = document.getElementById("tipoEvento").value;
  const limiteJogadores = Number(document.getElementById("limiteJogadores").value);
  const limiteGoleiros = Number(document.getElementById("limiteGoleiros").value);

  if (!diaSelecionado) {
    alert("Selecione o dia da semana.");
    return;
  }

  if (limiteGoleiros > limiteJogadores) {
    alert("O limite de goleiros nao pode ser maior que o limite de jogadores.");
    return;
  }

  eventoAtual.nome = nome;
  eventoAtual.diaSemana = diaSelecionado;
  eventoAtual.horaInicio = horaInicio;
  eventoAtual.tipo = tipo;
  eventoAtual.limiteJogadores = limiteJogadores;
  eventoAtual.limiteGoleiros = limiteGoleiros;

  window.appSupabase.salvarEventoBasico(eventoAtual);
  document.getElementById("tituloEvento").textContent = nome;
  alert("Informacoes do evento atualizadas.");
}

function atualizarNivelSelecionado() {
  document.querySelectorAll(".estrela-btn").forEach((botao) => {
    const nivel = Number(botao.dataset.nivel);
    botao.classList.toggle("ativa", nivel <= nivelSelecionado);
  });
}

function inicializarEstrelas() {
  document.querySelectorAll(".estrela-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      nivelSelecionado = Number(botao.dataset.nivel);
      atualizarNivelSelecionado();
    });
  });
}

function adicionarJogador(event) {
  event.preventDefault();

  const nome = document.getElementById("nomeJogador").value.trim();
  const posicao = document.getElementById("posicaoJogador").value;
  const mensalista = document.getElementById("mensalistaJogador").checked;

  if (!nome || !posicao) {
    alert("Preencha nome e posicao do jogador.");
    return;
  }

  if (nivelSelecionado < 1) {
    alert("Selecione o nivel do jogador entre 1 e 5 estrelas.");
    return;
  }

  eventoAtual.jogadores.push({
    id: gerarId("jgd"),
    nome,
    posicao,
    nivel: nivelSelecionado,
    mensalista,
    golsTotal: 0,
    assistsTotal: 0,
    vitoriasTotal: 0
  });

  salvarEventos();
  renderizarJogadores();
  renderizarPartidas();

  document.getElementById("formJogador").reset();
  nivelSelecionado = 0;
  atualizarNivelSelecionado();
}
function jogadorUsadoEmTime(idJogador) {
  return eventoAtual.times.some((time) => time.playerIds.includes(idJogador));
}

function removerJogador(idJogador) {
  if (jogadorUsadoEmTime(idJogador)) {
    alert("Nao e possivel excluir jogador que ja esta em um time. Edite/exclua o time primeiro.");
    return;
  }

  eventoAtual.jogadores = eventoAtual.jogadores.filter((jogador) => jogador.id !== idJogador);
  salvarEventos();
  renderizarJogadores();
  renderizarPartidas();
}

function linhaJogador(jogador) {
  const li = document.createElement("li");

  const texto = document.createElement("span");
  texto.textContent = `${jogador.nome} | ${jogador.posicao} | ${"\u2605".repeat(jogador.nivel)} | Vitorias: ${jogador.vitoriasTotal || 0} | Gols: ${jogador.golsTotal || 0} | Assists: ${jogador.assistsTotal || 0}`;

  const btnRemover = document.createElement("button");
  btnRemover.type = "button";
  btnRemover.className = "btn-excluir";
  btnRemover.textContent = "Excluir";
  btnRemover.addEventListener("click", () => removerJogador(jogador.id));

  li.appendChild(texto);
  li.appendChild(btnRemover);
  return li;
}

function renderizarJogadores() {
  const mensalistas = eventoAtual.jogadores.filter((jogador) => jogador.mensalista);
  const naoMensalistas = eventoAtual.jogadores.filter((jogador) => !jogador.mensalista);

  renderizarListaPaginada({
    listId: "listaMensalistasEvento",
    itens: mensalistas,
    mensagemVazia: "Nenhum jogador mensalista cadastrado.",
    onChangePagina: renderizarJogadores,
    config: {
      min: 4,
      max: 10,
      alturaItemDesktop: 68,
      alturaItemMobile: 86,
      fatorViewport: 0.33
    },
    renderItem: (jogador) => linhaJogador(jogador)
  });

  renderizarListaPaginada({
    listId: "listaNaoMensalistasEvento",
    itens: naoMensalistas,
    mensagemVazia: "Nenhum jogador nao mensalista cadastrado.",
    onChangePagina: renderizarJogadores,
    config: {
      min: 4,
      max: 10,
      alturaItemDesktop: 68,
      alturaItemMobile: 86,
      fatorViewport: 0.33
    },
    renderItem: (jogador) => linhaJogador(jogador)
  });
}

function obterTimePorId(teamId) {
  return eventoAtual.times.find((time) => time.id === teamId) || null;
}

function obterJogadorPorId(playerId) {
  return eventoAtual.jogadores.find((jogador) => jogador.id === playerId) || null;
}

function obterPartidaAtiva() {
  const partidaMarcadaComoAtiva = eventoAtual.matches.find(
    (match) => match.id === eventoAtual.activeMatchId && match.status === "Em andamento"
  ) || null;

  if (partidaMarcadaComoAtiva) {
    return partidaMarcadaComoAtiva;
  }

  const partidaEmAndamento = eventoAtual.matches.find((match) => match.status === "Em andamento") || null;

  if (partidaEmAndamento) {
    if (eventoAtual.activeMatchId !== partidaEmAndamento.id) {
      eventoAtual.activeMatchId = partidaEmAndamento.id;
      salvarEventos();
    }
    return partidaEmAndamento;
  }

  if (eventoAtual.activeMatchId) {
    eventoAtual.activeMatchId = "";
    salvarEventos();
  }

  return null;
}

function atualizarBloqueioFormularioPartida() {
  const form = document.getElementById("formCriarPartida");
  if (!form) return;

  const partidaAtiva = obterPartidaAtiva();
  const bloqueado = Boolean(partidaAtiva);

  form.querySelectorAll("select, input, button[type='submit']").forEach((el) => {
    el.disabled = bloqueado;
  });

  const aviso = document.getElementById("avisoBloqueioPartida");
  if (!aviso) return;

  if (!bloqueado) {
    aviso.classList.add("oculto");
    aviso.textContent = "";
    return;
  }

  const nomeTimeA = partidaAtiva.teamASnapshot?.name || "Time A";
  const nomeTimeB = partidaAtiva.teamBSnapshot?.name || "Time B";
  aviso.textContent = `Partida em andamento: ${nomeTimeA} x ${nomeTimeB}. Finalize a partida vigente para iniciar outra.`;
  aviso.classList.remove("oculto");
}

function formatarDataHora(isoString) {
  if (!isoString) return "-";
  const data = new Date(isoString);
  return data.toLocaleString("pt-BR");
}

function formatarSegundos(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function calcularLimiteItensPorPagina(config = {}) {
  const largura = window.innerWidth || document.documentElement.clientWidth || 1280;
  const altura = window.innerHeight || document.documentElement.clientHeight || 800;
  const proporcaoTela = largura / Math.max(altura, 1);
  const min = Number.isFinite(config.min) ? Number(config.min) : 4;
  const max = Number.isFinite(config.max) ? Number(config.max) : 12;
  const alturaItem = largura <= 760
    ? (Number.isFinite(config.alturaItemMobile) ? Number(config.alturaItemMobile) : 84)
    : (Number.isFinite(config.alturaItemDesktop) ? Number(config.alturaItemDesktop) : 66);
  const fatorViewport = Number.isFinite(config.fatorViewport) ? Number(config.fatorViewport) : 0.42;

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
  if (!lista) {
    return { itensPagina: [], paginaAtual: 1, totalPaginas: 1 };
  }

  const itensLista = Array.isArray(itens) ? itens : [];
  lista.innerHTML = "";

  if (itensLista.length === 0) {
    const li = document.createElement("li");
    li.textContent = mensagemVazia || "Nenhum registro encontrado.";
    lista.appendChild(li);
    limparPaginacaoLista(listId);
    return { itensPagina: [], paginaAtual: 1, totalPaginas: 1 };
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
    return { itensPagina, paginaAtual, totalPaginas };
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

  return { itensPagina, paginaAtual, totalPaginas };
}

function validarTimeComCincoJogadores(playerIds) {
  const unicos = Array.from(new Set(playerIds));
  return unicos.length === 5;
}

function renderizarSelecaoJogadoresTime() {
  const container = document.getElementById("selecaoJogadoresTime");
  container.innerHTML = "";

  if (eventoAtual.jogadores.length === 0) {
    container.innerHTML = "<p>Nenhum jogador cadastrado ainda.</p>";
    return;
  }

  eventoAtual.jogadores.forEach((jogador) => {
    const label = document.createElement("label");
    label.className = "opcao-jogador-time";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "jogadoresTime";
    checkbox.value = jogador.id;

    checkbox.addEventListener("change", () => {
      const selecionados = document.querySelectorAll('input[name="jogadoresTime"]:checked');
      if (selecionados.length > 5) {
        checkbox.checked = false;
        alert("Cada time pode ter no maximo 5 jogadores.");
      }
    });

    const texto = document.createElement("span");
    texto.textContent = `${jogador.nome} (${jogador.posicao})`;

    label.appendChild(checkbox);
    label.appendChild(texto);
    container.appendChild(label);
  });

  if (eventoAtual.jogadores.length < 5) {
    const aviso = document.createElement("p");
    aviso.className = "aviso-time";
    aviso.textContent = "Cadastre ao menos 5 jogadores para conseguir salvar um time.";
    container.appendChild(aviso);
  }
}

function inicializarSubAbasPartidas() {
  document.querySelectorAll(".aba-partida-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      const subaba = botao.dataset.subaba;

      document.querySelectorAll(".aba-partida-btn").forEach((b) => b.classList.remove("ativa"));
      document.querySelectorAll(".subaba-partida").forEach((s) => s.classList.remove("ativa"));

      botao.classList.add("ativa");
      document.getElementById(`subaba-${subaba}`).classList.add("ativa");
    });
  });
}

function resetarFormularioTime() {
  document.getElementById("formTime").reset();
  document.getElementById("timeEdicaoId").value = "";
  document.getElementById("btnSalvarTime").textContent = "Criar time";
  document.getElementById("btnCancelarEdicaoTime").classList.add("oculto");
}

function obterJogadoresSelecionadosNoFormularioTime() {
  return Array.from(document.querySelectorAll('input[name="jogadoresTime"]:checked')).map((el) => el.value);
}

function normalizarPosicaoJogador(posicao) {
  const texto = String(posicao || "").trim().toLowerCase();
  if (texto.startsWith("gol")) return "Goleiro";
  if (texto.startsWith("ala")) return "Ala";
  if (texto.startsWith("fix")) return "Fixo";
  if (texto.startsWith("piv")) return "Pivo";
  return "Outro";
}

function embaralharArray(lista) {
  const itens = [...lista];
  for (let i = itens.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [itens[i], itens[j]] = [itens[j], itens[i]];
  }
  return itens;
}

function criarEstadoTimeAleatorio(indice) {
  return {
    indice,
    id: gerarId("team"),
    name: `Time ${indice + 1}`,
    playerIds: [],
    totalNivel: 0,
    posicoes: {
      Goleiro: 0,
      Ala: 0,
      Fixo: 0,
      Pivo: 0,
      Outro: 0
    }
  };
}

function adicionarJogadorAoEstadoTime(estadoTime, jogador) {
  const posicao = normalizarPosicaoJogador(jogador.posicao);
  estadoTime.playerIds.push(jogador.id);
  estadoTime.totalNivel += Number(jogador.nivel || 0);
  estadoTime.posicoes[posicao] = (estadoTime.posicoes[posicao] || 0) + 1;
}

function pontuacaoCandidatoTime(estadoTime, jogador, alvoNivelTime) {
  const posicao = normalizarPosicaoJogador(jogador.posicao);
  const configuracaoIdeal = {
    Goleiro: 1,
    Ala: 2,
    Fixo: 1,
    Pivo: 1,
    Outro: 0
  };

  const nivelProjetado = estadoTime.totalNivel + Number(jogador.nivel || 0);
  const diferencaNivel = Math.abs(nivelProjetado - alvoNivelTime);
  const jaNoLimitePosicao = (estadoTime.posicoes[posicao] || 0) >= (configuracaoIdeal[posicao] || 0);
  const bonusPosicaoNecessaria = (estadoTime.posicoes[posicao] || 0) < (configuracaoIdeal[posicao] || 0) ? -0.2 : 0;
  const penalidadeExcessoPosicao = jaNoLimitePosicao ? 1.2 : 0;

  return diferencaNivel + penalidadeExcessoPosicao + bonusPosicaoNecessaria;
}

function retirarMelhorCandidato(pool, estadoTime, alvoNivelTime) {
  if (!Array.isArray(pool) || pool.length === 0) return null;

  let melhorIndice = 0;
  let melhorPontuacao = Number.POSITIVE_INFINITY;

  for (let i = 0; i < pool.length; i += 1) {
    const candidato = pool[i];
    const pontuacao = pontuacaoCandidatoTime(estadoTime, candidato, alvoNivelTime);
    if (pontuacao < melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorIndice = i;
    }
  }

  return pool.splice(melhorIndice, 1)[0] || null;
}

function distribuirPosicaoObrigatoria(teamsState, pool, repeticoes, alvoNivelTime) {
  for (let rodada = 0; rodada < repeticoes; rodada += 1) {
    const ordemTimes = [...teamsState].sort((a, b) => a.totalNivel - b.totalNivel);
    for (const estadoTime of ordemTimes) {
      if (estadoTime.playerIds.length >= 5) continue;
      if (pool.length === 0) return;
      const jogador = retirarMelhorCandidato(pool, estadoTime, alvoNivelTime);
      if (!jogador) return;
      adicionarJogadorAoEstadoTime(estadoTime, jogador);
    }
  }
}

function abrirModalGerarTimesAleatorios(maximoTimes) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalGerarTimesAleatorios");
    const inputQuantidade = document.getElementById("inputQuantidadeTimesAleatorios");
    const listaJogadores = document.getElementById("listaJogadoresTimesAleatorios");
    const resumo = document.getElementById("resumoSelecaoTimesAleatorios");
    const btnConfirmar = document.getElementById("btnConfirmarGerarTimesAleatorios");
    const btnCancelar = document.getElementById("btnCancelarGerarTimesAleatorios");
    const btnSelecionarTodos = document.getElementById("btnSelecionarTodosJogadoresTimes");
    const btnLimpar = document.getElementById("btnLimparJogadoresTimes");

    if (!modal || !inputQuantidade || !listaJogadores || !resumo || !btnConfirmar || !btnCancelar || !btnSelecionarTodos || !btnLimpar) {
      resolve(null);
      return;
    }

    listaJogadores.innerHTML = "";

    const jogadoresOrdenados = [...eventoAtual.jogadores].sort((a, b) => {
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });

    jogadoresOrdenados.forEach((jogador) => {
      const label = document.createElement("label");
      label.className = "opcao-jogador-time";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "jogadoresTimesAleatorios";
      checkbox.value = jogador.id;
      checkbox.checked = true;

      const texto = document.createElement("span");
      texto.textContent = `${jogador.nome} (${jogador.posicao} | ${Number(jogador.nivel || 0)} estrela(s))`;

      label.appendChild(checkbox);
      label.appendChild(texto);
      listaJogadores.appendChild(label);
    });

    const obterIdsSelecionados = () => {
      return Array.from(listaJogadores.querySelectorAll('input[name="jogadoresTimesAleatorios"]:checked'))
        .map((el) => el.value);
    };

    const atualizarResumo = () => {
      const idsSelecionados = new Set(obterIdsSelecionados());
      const jogadoresSelecionados = eventoAtual.jogadores.filter((jogador) => idsSelecionados.has(jogador.id));
      const totalSelecionados = jogadoresSelecionados.length;
      const totalGoleiros = jogadoresSelecionados
        .filter((jogador) => normalizarPosicaoJogador(jogador.posicao) === "Goleiro")
        .length;
      const maximoPorSelecao = Math.floor(totalSelecionados / 5);

      resumo.textContent = `Selecionados: ${totalSelecionados} jogador(es) | Goleiros: ${totalGoleiros} | Maximo de times: ${maximoPorSelecao}`;

      if (maximoPorSelecao >= 1) {
        const novoMaximoInput = Math.min(maximoTimes, maximoPorSelecao);
        inputQuantidade.max = String(novoMaximoInput);
        if (Number(inputQuantidade.value) > novoMaximoInput) {
          inputQuantidade.value = String(novoMaximoInput);
        }
        btnConfirmar.disabled = false;
      } else {
        inputQuantidade.max = "1";
        btnConfirmar.disabled = true;
      }
    };

    let encerrado = false;
    const finalizar = (resultado) => {
      if (encerrado) return;
      encerrado = true;

      modal.classList.add("oculto");

      btnConfirmar.onclick = null;
      btnCancelar.onclick = null;
      btnSelecionarTodos.onclick = null;
      btnLimpar.onclick = null;
      modal.onclick = null;
      listaJogadores.removeEventListener("change", atualizarResumo);
      document.removeEventListener("keydown", fecharComEscape);

      resolve(resultado);
    };

    const confirmar = () => {
      const idsSelecionados = obterIdsSelecionados();
      const quantidadeTimes = Number(inputQuantidade.value);
      const maximoPorSelecao = Math.floor(idsSelecionados.length / 5);

      if (!Number.isInteger(quantidadeTimes) || quantidadeTimes < 1 || quantidadeTimes > maximoTimes) {
        alert(`Informe uma quantidade valida entre 1 e ${maximoTimes}.`);
        return;
      }

      if (idsSelecionados.length < 5) {
        alert("Selecione ao menos 5 jogadores para gerar times.");
        return;
      }

      if (quantidadeTimes > maximoPorSelecao) {
        alert(`Com os jogadores selecionados, o maximo permitido e ${maximoPorSelecao} time(s).`);
        return;
      }

      finalizar({
        quantidadeTimes,
        jogadorIdsSelecionados: idsSelecionados
      });
    };

    const fecharComEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finalizar(null);
      }
    };

    btnConfirmar.onclick = confirmar;
    btnCancelar.onclick = () => finalizar(null);
    btnSelecionarTodos.onclick = () => {
      listaJogadores.querySelectorAll('input[name="jogadoresTimesAleatorios"]').forEach((checkbox) => {
        checkbox.checked = true;
      });
      atualizarResumo();
    };
    btnLimpar.onclick = () => {
      listaJogadores.querySelectorAll('input[name="jogadoresTimesAleatorios"]').forEach((checkbox) => {
        checkbox.checked = false;
      });
      atualizarResumo();
    };

    modal.onclick = (event) => {
      if (event.target === modal) {
        finalizar(null);
      }
    };

    listaJogadores.addEventListener("change", atualizarResumo);
    document.addEventListener("keydown", fecharComEscape);

    inputQuantidade.min = "1";
    inputQuantidade.max = String(maximoTimes);
    inputQuantidade.value = String(maximoTimes);

    modal.classList.remove("oculto");
    atualizarResumo();
    inputQuantidade.focus();
  });
}

async function gerarTimesAleatorios() {
  const partidaAtiva = obterPartidaAtiva();
  if (partidaAtiva) {
    alert("Finalize a partida em andamento antes de gerar novos times.");
    return;
  }

  if (eventoAtual.jogadores.length < 5) {
    alert("Cadastre ao menos 5 jogadores para gerar times aleatorios.");
    return;
  }

  const maximoTimes = Math.floor(eventoAtual.jogadores.length / 5);
  if (maximoTimes < 1) {
    alert("Nao ha jogadores suficientes para gerar times.");
    return;
  }
  const configuracaoGeracao = await abrirModalGerarTimesAleatorios(maximoTimes);
  if (!configuracaoGeracao) {
    return;
  }

  const quantidadeTimes = configuracaoGeracao.quantidadeTimes;
  const idsSelecionados = new Set(configuracaoGeracao.jogadorIdsSelecionados);
  const jogadoresDisponiveis = eventoAtual.jogadores.filter((jogador) => idsSelecionados.has(jogador.id));

  if (jogadoresDisponiveis.length < quantidadeTimes * 5) {
    alert(`Jogadores insuficientes para gerar ${quantidadeTimes} time(s) com 5 jogadores.`);
    return;
  }

  const jogadores = embaralharArray(jogadoresDisponiveis).map((jogador) => ({
    ...jogador,
    nivel: Number(jogador.nivel || 0),
    posicaoNormalizada: normalizarPosicaoJogador(jogador.posicao)
  }));

  const goleiros = jogadores.filter((j) => j.posicaoNormalizada === "Goleiro");
  if (goleiros.length < quantidadeTimes) {
    alert(`Para gerar ${quantidadeTimes} time(s), e preciso ter ao menos ${quantidadeTimes} goleiro(s).`);
    return;
  }

  if (eventoAtual.times.length > 0) {
    const confirmar = window.confirm("Isso vai substituir os times cadastrados atualmente. Deseja continuar?");
    if (!confirmar) return;
  }

  const avisos = [];
  const alas = jogadores.filter((j) => j.posicaoNormalizada === "Ala");
  const fixos = jogadores.filter((j) => j.posicaoNormalizada === "Fixo");
  const pivos = jogadores.filter((j) => j.posicaoNormalizada === "Pivo");

  if (alas.length < quantidadeTimes * 2) {
    avisos.push("Nao ha alas suficientes para manter 2 alas por time em todos os times.");
  }
  if (fixos.length < quantidadeTimes) {
    avisos.push("Nao ha fixos suficientes para manter 1 fixo por time em todos os times.");
  }
  if (pivos.length < quantidadeTimes) {
    avisos.push("Nao ha pivos suficientes para manter 1 pivo por time em todos os times.");
  }

  const alvoNivelTime = (jogadores.reduce((soma, jogador) => soma + Number(jogador.nivel || 0), 0) / jogadores.length) * 5;
  const teamsState = Array.from({ length: quantidadeTimes }, (_, indice) => criarEstadoTimeAleatorio(indice));

  const poolGoleiros = embaralharArray(goleiros);
  const poolAlas = embaralharArray(alas);
  const poolFixos = embaralharArray(fixos);
  const poolPivos = embaralharArray(pivos);

  distribuirPosicaoObrigatoria(teamsState, poolGoleiros, 1, alvoNivelTime);
  distribuirPosicaoObrigatoria(teamsState, poolAlas, 2, alvoNivelTime);
  distribuirPosicaoObrigatoria(teamsState, poolFixos, 1, alvoNivelTime);
  distribuirPosicaoObrigatoria(teamsState, poolPivos, 1, alvoNivelTime);

  const idsJaUsados = new Set(
    teamsState.flatMap((time) => time.playerIds)
  );
  const poolRestante = embaralharArray(jogadores.filter((j) => !idsJaUsados.has(j.id)));

  let adicionou = true;
  while (adicionou && poolRestante.length > 0) {
    adicionou = false;
    const ordemTimes = [...teamsState].sort((a, b) => {
      if (a.playerIds.length !== b.playerIds.length) return a.playerIds.length - b.playerIds.length;
      return a.totalNivel - b.totalNivel;
    });

    for (const estadoTime of ordemTimes) {
      if (estadoTime.playerIds.length >= 5) continue;
      const jogador = retirarMelhorCandidato(poolRestante, estadoTime, alvoNivelTime);
      if (!jogador) continue;
      adicionarJogadorAoEstadoTime(estadoTime, jogador);
      adicionou = true;
    }
  }

  const incompletos = teamsState.filter((time) => time.playerIds.length !== 5);
  if (incompletos.length > 0) {
    alert("Nao foi possivel montar todos os times com 5 jogadores. Verifique o cadastro de jogadores.");
    return;
  }

  const agora = new Date().toISOString();
  eventoAtual.times = teamsState.map((time, idx) => ({
    id: time.id,
    name: `Time ${idx + 1}`,
    playerIds: time.playerIds,
    createdAt: agora,
    updatedAt: agora
  }));

  await salvarEventos();
  resetarFormularioTime();
  renderizarPartidas();

  const jogadoresFora = jogadoresDisponiveis.length - (quantidadeTimes * 5);
  const jogadoresNaoSelecionados = eventoAtual.jogadores.length - jogadoresDisponiveis.length;
  const resumo = [
    `${quantidadeTimes} time(s) gerado(s) com sucesso.`,
    jogadoresFora > 0 ? `${jogadoresFora} jogador(es) selecionado(s) ficaram de fora por nao completar novo time de 5.` : "",
    jogadoresNaoSelecionados > 0 ? `${jogadoresNaoSelecionados} jogador(es) nao foram selecionados no pop-up.` : ""
  ].filter(Boolean);

  if (avisos.length > 0) {
    resumo.push(`Ajustes aplicados: ${avisos.join(" ")}`);
  }

  alert(resumo.join("\n"));
}

function salvarTime(event) {
  event.preventDefault();

  const idEdicao = document.getElementById("timeEdicaoId").value;
  const nomeTime = document.getElementById("nomeTime").value.trim();
  const playerIds = obterJogadoresSelecionadosNoFormularioTime();

  if (!nomeTime) {
    alert("Informe o nome do time.");
    return;
  }

  if (!validarTimeComCincoJogadores(playerIds)) {
    alert("Cada time deve conter exatamente 5 jogadores unicos.");
    return;
  }

  if (idEdicao) {
    const partidaAtiva = obterPartidaAtiva();
    if (partidaAtiva && (partidaAtiva.teamAId === idEdicao || partidaAtiva.teamBId === idEdicao)) {
      alert("Nao e possivel editar time em partida em andamento.");
      return;
    }

    const time = obterTimePorId(idEdicao);
    if (!time) {
      alert("Time nao encontrado para edicao.");
      return;
    }

    time.name = nomeTime;
    time.playerIds = playerIds;
    time.updatedAt = new Date().toISOString();
  } else {
    eventoAtual.times.push({
      id: gerarId("team"),
      name: nomeTime,
      playerIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  salvarEventos();
  resetarFormularioTime();
  renderizarPartidas();
}

function preencherFormularioEdicaoTime(teamId) {
  const time = obterTimePorId(teamId);
  if (!time) return;

  const partidaAtiva = obterPartidaAtiva();
  if (partidaAtiva && (partidaAtiva.teamAId === teamId || partidaAtiva.teamBId === teamId)) {
    alert("Nao e possivel editar time com partida em andamento.");
    return;
  }

  document.getElementById("timeEdicaoId").value = time.id;
  document.getElementById("nomeTime").value = time.name;

  document.querySelectorAll('input[name="jogadoresTime"]').forEach((checkbox) => {
    checkbox.checked = time.playerIds.includes(checkbox.value);
  });

  document.getElementById("btnSalvarTime").textContent = "Salvar time";
  document.getElementById("btnCancelarEdicaoTime").classList.remove("oculto");
}

function excluirTime(teamId) {
  const partidaAtiva = obterPartidaAtiva();
  if (partidaAtiva && (partidaAtiva.teamAId === teamId || partidaAtiva.teamBId === teamId)) {
    alert("Nao e possivel excluir time em partida em andamento.");
    return;
  }

  eventoAtual.times = eventoAtual.times.filter((time) => time.id !== teamId);
  salvarEventos();
  renderizarPartidas();
}

function renderizarTimes() {
  renderizarListaPaginada({
    listId: "listaTimes",
    itens: eventoAtual.times,
    mensagemVazia: "Nenhum time cadastrado.",
    onChangePagina: renderizarTimes,
    config: {
      min: 3,
      max: 8,
      alturaItemDesktop: 70,
      alturaItemMobile: 92,
      fatorViewport: 0.34
    },
    renderItem: (time) => {
      const li = document.createElement("li");
      li.className = "linha-time";

      const jogadores = time.playerIds
        .map((id) => obterJogadorPorId(id))
        .filter(Boolean)
        .map((j) => j.nome)
        .join(", ");

      const texto = document.createElement("span");
      texto.textContent = `${time.name} | Jogadores: ${jogadores}`;

      const acoes = document.createElement("div");
      acoes.className = "acoes-linha";

      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn-detalhes";
      btnEditar.textContent = "Editar";
      btnEditar.addEventListener("click", () => preencherFormularioEdicaoTime(time.id));

      const btnExcluir = document.createElement("button");
      btnExcluir.type = "button";
      btnExcluir.className = "btn-excluir";
      btnExcluir.textContent = "Excluir";
      btnExcluir.addEventListener("click", () => excluirTime(time.id));

      acoes.appendChild(btnEditar);
      acoes.appendChild(btnExcluir);

      li.appendChild(texto);
      li.appendChild(acoes);
      return li;
    }
  });
}

function renderizarSeletoresDeTimes() {
  const selectTimeA = document.getElementById("selectTimeA");
  const selectTimeB = document.getElementById("selectTimeB");
  const filtroTime = document.getElementById("filtroTimePartida");

  selectTimeA.innerHTML = "<option value=''>Selecione</option>";
  selectTimeB.innerHTML = "<option value=''>Selecione</option>";
  filtroTime.innerHTML = "<option value=''>Todos</option>";

  eventoAtual.times.forEach((time) => {
    const texto = `${time.name} (${time.playerIds.length}/5)`;

    const optionA = document.createElement("option");
    optionA.value = time.id;
    optionA.textContent = texto;

    const optionB = document.createElement("option");
    optionB.value = time.id;
    optionB.textContent = texto;

    const optionFiltro = document.createElement("option");
    optionFiltro.value = time.id;
    optionFiltro.textContent = time.name;

    selectTimeA.appendChild(optionA);
    selectTimeB.appendChild(optionB);
    filtroTime.appendChild(optionFiltro);
  });
}

function snapshotTime(teamId) {
  const time = obterTimePorId(teamId);
  if (!time) return null;

  return {
    id: time.id,
    name: time.name,
    players: time.playerIds
      .map((playerId) => obterJogadorPorId(playerId))
      .filter(Boolean)
      .map((player) => ({
        id: player.id,
        name: player.nome
      }))
  };
}

function recalcularPlacar(match) {
  let scoreA = 0;
  let scoreB = 0;

  match.goals.forEach((goal) => {
    if (goal.teamId === match.teamAId) scoreA += 1;
    if (goal.teamId === match.teamBId) scoreB += 1;
  });

  match.score = { teamA: scoreA, teamB: scoreB };
}
function criarPartida(event) {
  event.preventDefault();

  if (obterPartidaAtiva()) {
    alert("Ja existe uma partida em andamento. Finalize antes de iniciar outra.");
    return;
  }

  const teamAId = document.getElementById("selectTimeA").value;
  const teamBId = document.getElementById("selectTimeB").value;
  const duracaoTexto = document.getElementById("duracaoPartida").value;
  const durationSec = duracaoParaSegundos(duracaoTexto);

  if (!teamAId || !teamBId) {
    alert("Selecione os dois times.");
    return;
  }

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    alert("Duracao invalida. Use o formato mm:ss, por exemplo 10:00.");
    return;
  }

  if (teamAId === teamBId) {
    alert("Um time nao pode jogar contra ele mesmo.");
    return;
  }

  const teamA = obterTimePorId(teamAId);
  const teamB = obterTimePorId(teamBId);

  if (!teamA || !teamB) {
    alert("Times invalidos.");
    return;
  }

  if (teamA.playerIds.length !== 5 || teamB.playerIds.length !== 5) {
    alert("Nao e permitido iniciar partida sem 5 jogadores em cada time.");
    return;
  }

  const inicio = new Date().toISOString();
  const match = {
    id: gerarId("match"),
    teamAId,
    teamBId,
    teamASnapshot: snapshotTime(teamAId),
    teamBSnapshot: snapshotTime(teamBId),
    goals: [],
    createdAt: inicio,
    startTime: inicio,
    endTime: null,
    durationConfiguredSec: durationSec,
    remainingSec: durationSec,
    elapsedSec: 0,
    status: "Em andamento",
    isClockRunning: false,
    lastTickAt: null,
    score: { teamA: 0, teamB: 0 },
    historyImmutable: false
  };

  eventoAtual.matches.push(match);
  eventoAtual.activeMatchId = match.id;
  eventoAtual.matchDurationMinutes = durationSec / 60;

  salvarEventos();
  renderizarPartidas();
}

function iniciarCronometro() {
  const partida = obterPartidaAtiva();
  if (!partida || partida.status !== "Em andamento") return;

  if (partida.isClockRunning) {
    return;
  }

  partida.isClockRunning = true;
  partida.lastTickAt = Date.now();

  if (!matchIntervalId) {
    matchIntervalId = setInterval(tickCronometro, 1000);
  }

  salvarEventos();
  renderizarPartidas();
}

function pausarCronometro() {
  const partida = obterPartidaAtiva();
  if (!partida || !partida.isClockRunning) return;

  const agora = Date.now();
  const diffSeg = Math.floor((agora - partida.lastTickAt) / 1000);

  if (diffSeg > 0) {
    partida.elapsedSec += diffSeg;
    partida.remainingSec = Math.max(0, partida.remainingSec - diffSeg);
  }

  partida.isClockRunning = false;
  partida.lastTickAt = null;

  salvarEventos();

  if (!obterPartidaAtiva() || !obterPartidaAtiva().isClockRunning) {
    pararIntervaloCronometro();
  }

  renderizarPartidas();
}

function reiniciarCronometro() {
  const partida = obterPartidaAtiva();
  if (!partida || partida.status !== "Em andamento") return;

  partida.isClockRunning = false;
  partida.lastTickAt = null;
  partida.elapsedSec = 0;
  partida.remainingSec = partida.durationConfiguredSec;

  salvarEventos();
  pararIntervaloCronometro();
  renderizarPartidas();
}

function pararIntervaloCronometro() {
  if (matchIntervalId) {
    clearInterval(matchIntervalId);
    matchIntervalId = null;
  }
}

function tickCronometro() {
  const partida = obterPartidaAtiva();

  if (!partida || partida.status !== "Em andamento" || !partida.isClockRunning) {
    pararIntervaloCronometro();
    return;
  }

  const agora = Date.now();
  const diffSeg = Math.floor((agora - partida.lastTickAt) / 1000);

  if (diffSeg < 1) {
    return;
  }

  partida.lastTickAt = agora;
  partida.elapsedSec += diffSeg;
  partida.remainingSec = Math.max(0, partida.remainingSec - diffSeg);

  if (partida.remainingSec <= 0) {
    finalizarPartida("Tempo encerrado automaticamente.");
    return;
  }

  salvarCounter += 1;
  if (salvarCounter % 5 === 0) {
    salvarEventos();
  }
  atualizarDisplayCronometroAtivo(partida);
}

function atualizarDisplayCronometroAtivo(partida) {
  const cronometro = document.querySelector("#painelPartidaAtiva .cronometro-grande");
  if (cronometro) {
    cronometro.textContent = formatarSegundos(partida.remainingSec);
  }
}

function registrarGol() {
  const partida = obterPartidaAtiva();

  if (!partida) {
    alert("Nenhuma partida em andamento.");
    return;
  }

  if (partida.status !== "Em andamento" || !partida.isClockRunning) {
    alert("Nao e permitido registrar gol com partida pausada ou finalizada.");
    return;
  }

  const teamId = document.getElementById("golTeamSelect").value;
  const playerId = document.getElementById("golPlayerSelect").value;
  const assistPlayerId = document.getElementById("golAssistPlayerSelect").value;

  if (!teamId || !playerId) {
    alert("Selecione o time e o jogador para registrar o gol.");
    return;
  }
  const jogador = obterJogadorPorId(playerId);
  const time = teamId === partida.teamAId ? partida.teamASnapshot : partida.teamBSnapshot;

  if (!jogador || !time) {
    alert("Dados invalidos para registro de gol.");
    return;
  }

  if (!time.players.some((p) => p.id === playerId)) {
    alert("Jogador nao pertence ao time selecionado nesta partida.");
    return;
  }

  let assistPlayerName = "";
  if (assistPlayerId) {
    if (assistPlayerId === playerId) {
      alert("O assistente nao pode ser o mesmo jogador que marcou o gol.");
      return;
    }

    if (!time.players.some((p) => p.id === assistPlayerId)) {
      alert("Assistente precisa pertencer ao mesmo time do gol.");
      return;
    }

    const assistJogador = obterJogadorPorId(assistPlayerId);
    if (!assistJogador) {
      alert("Assistente invalido.");
      return;
    }
    assistPlayerName = assistJogador.nome;
    assistJogador.assistsTotal = (assistJogador.assistsTotal || 0) + 1;
  }

  const goal = {
    id: gerarId("goal"),
    playerId,
    playerName: jogador.nome,
    assistPlayerId: assistPlayerId || "",
    assistPlayerName,
    teamId,
    teamName: time.name,
    timestamp: new Date().toISOString(),
    elapsedSec: partida.elapsedSec
  };

  partida.goals.push(goal);
  recalcularPlacar(partida);
  jogador.golsTotal = (jogador.golsTotal || 0) + 1;

  salvarEventos();
  renderizarPartidas();
}

function removerGol(goalId) {
  const partida = obterPartidaAtiva();

  if (!partida || partida.status !== "Em andamento") {
    alert("Nao e permitido editar gols de partida finalizada.");
    return;
  }

  const goal = partida.goals.find((g) => g.id === goalId);
  if (!goal) return;

  partida.goals = partida.goals.filter((g) => g.id !== goalId);
  recalcularPlacar(partida);

  const jogador = obterJogadorPorId(goal.playerId);
  if (jogador && jogador.golsTotal > 0) {
    jogador.golsTotal -= 1;
  }

  if (goal.assistPlayerId) {
    const assistJogador = obterJogadorPorId(goal.assistPlayerId);
    if (assistJogador && assistJogador.assistsTotal > 0) {
      assistJogador.assistsTotal -= 1;
    }
  }

  salvarEventos();
  renderizarPartidas();
}

function finalizarPartida(mensagemOpcional) {
  const partida = obterPartidaAtiva();

  if (!partida || partida.status !== "Em andamento") {
    return;
  }

  if (partida.isClockRunning) {
    pausarCronometro();
  }

  let winnerTeamId = "";
  if ((partida.score?.teamA || 0) > (partida.score?.teamB || 0)) {
    winnerTeamId = partida.teamAId;
  } else if ((partida.score?.teamB || 0) > (partida.score?.teamA || 0)) {
    winnerTeamId = partida.teamBId;
  }

  if (winnerTeamId) {
    const snapshotVencedor = winnerTeamId === partida.teamAId ? partida.teamASnapshot : partida.teamBSnapshot;
    const jogadoresVencedores = Array.isArray(snapshotVencedor?.players) ? snapshotVencedor.players : [];
    jogadoresVencedores.forEach((item) => {
      const jogador = obterJogadorPorId(item.id);
      if (jogador) {
        jogador.vitoriasTotal = (jogador.vitoriasTotal || 0) + 1;
      }
    });
  }

  partida.status = "Finalizada";
  partida.endTime = new Date().toISOString();
  partida.durationRealSec = partida.elapsedSec;
  partida.isClockRunning = false;
  partida.lastTickAt = null;
  partida.historyImmutable = true;

  eventoAtual.activeMatchId = "";

  salvarEventos();
  pararIntervaloCronometro();
  renderizarPartidas();

  if (mensagemOpcional) {
    alert(mensagemOpcional);
  }
}

function atualizarSelectJogadorGol() {
  const partida = obterPartidaAtiva();
  const teamSelect = document.getElementById("golTeamSelect");
  const playerSelect = document.getElementById("golPlayerSelect");
  const assistSelect = document.getElementById("golAssistPlayerSelect");

  if (!teamSelect || !playerSelect || !assistSelect || !partida) return;

  const selectedTeamId = teamSelect.value;
  const playerAntes = playerSelect.value;
  let teamSnapshot = null;

  if (selectedTeamId === partida.teamAId) {
    teamSnapshot = partida.teamASnapshot;
  } else if (selectedTeamId === partida.teamBId) {
    teamSnapshot = partida.teamBSnapshot;
  }

  playerSelect.innerHTML = "<option value=''>Selecione</option>";

  if (!teamSnapshot) {
    atualizarSelectAssistenciaGol();
    return;
  }

  teamSnapshot.players.forEach((player) => {
    const opt = document.createElement("option");
    opt.value = player.id;
    opt.textContent = player.name;
    playerSelect.appendChild(opt);
  });

  if (teamSnapshot.players.some((player) => player.id === playerAntes)) {
    playerSelect.value = playerAntes;
  }

  atualizarSelectAssistenciaGol();
}

function atualizarSelectAssistenciaGol() {
  const partida = obterPartidaAtiva();
  const teamSelect = document.getElementById("golTeamSelect");
  const playerSelect = document.getElementById("golPlayerSelect");
  const assistSelect = document.getElementById("golAssistPlayerSelect");

  if (!teamSelect || !playerSelect || !assistSelect || !partida) return;

  const selectedTeamId = teamSelect.value;
  const selectedScorerId = playerSelect.value;
  const assistAntes = assistSelect.value;

  let teamSnapshot = null;
  if (selectedTeamId === partida.teamAId) {
    teamSnapshot = partida.teamASnapshot;
  } else if (selectedTeamId === partida.teamBId) {
    teamSnapshot = partida.teamBSnapshot;
  }

  assistSelect.innerHTML = "<option value=''>Sem assistencia</option>";

  if (!teamSnapshot) return;

  teamSnapshot.players
    .filter((player) => player.id !== selectedScorerId)
    .forEach((player) => {
      const opt = document.createElement("option");
      opt.value = player.id;
      opt.textContent = player.name;
      assistSelect.appendChild(opt);
    });

  if (assistAntes && assistSelect.querySelector(`option[value="${assistAntes}"]`)) {
    assistSelect.value = assistAntes;
  }
}

function estatisticasIndividuais(match) {
  const mapa = {};

  match.goals.forEach((goal) => {
    mapa[goal.playerId] = mapa[goal.playerId] || { playerName: goal.playerName, goals: 0, assists: 0, teamName: goal.teamName };
    mapa[goal.playerId].goals += 1;

    if (goal.assistPlayerId) {
      mapa[goal.assistPlayerId] = mapa[goal.assistPlayerId] || {
        playerName: goal.assistPlayerName,
        goals: 0,
        assists: 0,
        teamName: goal.teamName
      };
      mapa[goal.assistPlayerId].assists += 1;
    }
  });

  return Object.values(mapa).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return a.playerName.localeCompare(b.playerName);
  });
}

function renderizarPainelPartidaAtiva() {
  const painel = document.getElementById("painelPartidaAtiva");
  painel.innerHTML = "";

  const partida = obterPartidaAtiva();

  if (!partida) {
    painel.innerHTML = "<p>Nenhuma partida em andamento.</p>";
    return;
  }
  const titulo = document.createElement("h3");
  titulo.textContent = `${partida.teamASnapshot.name} ${partida.score.teamA} x ${partida.score.teamB} ${partida.teamBSnapshot.name}`;

  const cronometro = document.createElement("p");
  cronometro.className = "cronometro-grande";
  cronometro.textContent = formatarSegundos(partida.remainingSec);

  const status = document.createElement("p");
  status.textContent = `Status: ${partida.status} | Relogio: ${partida.isClockRunning ? "Rodando" : "Pausado"}`;

  const acoesCronometro = document.createElement("div");
  acoesCronometro.className = "acoes-form";

  const btnIniciar = document.createElement("button");
  btnIniciar.type = "button";
  btnIniciar.textContent = "Iniciar";
  btnIniciar.addEventListener("click", iniciarCronometro);

  const btnPausar = document.createElement("button");
  btnPausar.type = "button";
  btnPausar.textContent = "Pausar";
  btnPausar.addEventListener("click", pausarCronometro);

  const btnReiniciar = document.createElement("button");
  btnReiniciar.type = "button";
  btnReiniciar.textContent = "Reiniciar";
  btnReiniciar.addEventListener("click", reiniciarCronometro);

  const btnFinalizar = document.createElement("button");
  btnFinalizar.type = "button";
  btnFinalizar.textContent = "Finalizar";
  btnFinalizar.addEventListener("click", () => finalizarPartida());

  acoesCronometro.appendChild(btnIniciar);
  acoesCronometro.appendChild(btnPausar);
  acoesCronometro.appendChild(btnReiniciar);
  acoesCronometro.appendChild(btnFinalizar);

  const blocoGol = document.createElement("div");
  blocoGol.className = "bloco-gol";
  blocoGol.innerHTML = `
    <h4>Registrar gol</h4>
    <label for="golTeamSelect">Time</label>
    <select id="golTeamSelect">
      <option value="">Selecione</option>
      <option value="${partida.teamAId}">${partida.teamASnapshot.name}</option>
      <option value="${partida.teamBId}">${partida.teamBSnapshot.name}</option>
    </select>
    <label for="golPlayerSelect">Jogador</label>
    <select id="golPlayerSelect"><option value="">Selecione</option></select>
    <label for="golAssistPlayerSelect">Assistencia (opcional)</label>
    <select id="golAssistPlayerSelect"><option value="">Sem assistencia</option></select>
  `;

  const btnGol = document.createElement("button");
  btnGol.type = "button";
  btnGol.textContent = "Adicionar gol";
  btnGol.addEventListener("click", registrarGol);

  blocoGol.appendChild(btnGol);

  const listaGols = document.createElement("ul");
  listaGols.className = "lista-jogadores";

  if (partida.goals.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum gol registrado.";
    listaGols.appendChild(li);
  } else {
    partida.goals.forEach((goal) => {
      const li = document.createElement("li");
      const texto = document.createElement("span");
      const assistTexto = goal.assistPlayerName ? ` | Assist: ${goal.assistPlayerName}` : "";
      texto.textContent = `${goal.teamName} | ${goal.playerName}${assistTexto} | ${formatarSegundos(goal.elapsedSec)}`;

      const btnRemover = document.createElement("button");
      btnRemover.type = "button";
      btnRemover.className = "btn-excluir";
      btnRemover.textContent = "Remover gol";
      btnRemover.addEventListener("click", () => removerGol(goal.id));

      li.appendChild(texto);
      li.appendChild(btnRemover);
      listaGols.appendChild(li);
    });
  }

  painel.appendChild(titulo);
  painel.appendChild(cronometro);
  painel.appendChild(status);
  painel.appendChild(acoesCronometro);
  painel.appendChild(blocoGol);
  painel.appendChild(listaGols);

  const golTeamSelect = document.getElementById("golTeamSelect");
  const golPlayerSelect = document.getElementById("golPlayerSelect");
  golTeamSelect.addEventListener("change", atualizarSelectJogadorGol);
  golPlayerSelect.addEventListener("change", atualizarSelectAssistenciaGol);
  atualizarSelectJogadorGol();
}

function filtrarHistorico(matchesFinalizadas) {
  const data = document.getElementById("filtroDataPartida").value;
  const teamId = document.getElementById("filtroTimePartida").value;

  return matchesFinalizadas.filter((match) => {
    const bateData = !data || (match.endTime && new Date(match.endTime).toISOString().slice(0, 10) === data);
    const bateTime = !teamId || match.teamAId === teamId || match.teamBId === teamId;
    return bateData && bateTime;
  });
}

function renderizarDetalheHistorico(matchId) {
  const detalhe = document.getElementById("detalhePartidaHistorico");
  detalhe.innerHTML = "";

  const match = eventoAtual.matches.find((m) => m.id === matchId && m.status === "Finalizada");

  if (!match) {
    detalhe.innerHTML = "<p>Selecione uma partida finalizada para ver detalhes.</p>";
    return;
  }
  const stats = estatisticasIndividuais(match);

  const cabecalho = document.createElement("h3");
  cabecalho.textContent = `${match.teamASnapshot.name} ${match.score.teamA} x ${match.score.teamB} ${match.teamBSnapshot.name}`;

  const infos = document.createElement("p");
  infos.textContent = `Criada em: ${formatarDataHora(match.createdAt)} | Finalizada em: ${formatarDataHora(match.endTime)} | Duracao real: ${formatarSegundos(match.durationRealSec || 0)}`;

  const listaDetalheGols = document.createElement("ul");
  listaDetalheGols.className = "lista-jogadores";

  if (match.goals.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sem gols nesta partida.";
    listaDetalheGols.appendChild(li);
  } else {
    match.goals.forEach((goal) => {
      const li = document.createElement("li");
      const assistTexto = goal.assistPlayerName ? ` | Assist: ${goal.assistPlayerName}` : "";
      li.textContent = `${goal.teamName} | ${goal.playerName}${assistTexto} | ${formatarSegundos(goal.elapsedSec)}`;
      listaDetalheGols.appendChild(li);
    });
  }

  const tituloStats = document.createElement("h4");
  tituloStats.textContent = "Estatisticas individuais";

  const listaStats = document.createElement("ul");
  listaStats.className = "lista-jogadores lista-stats";

  if (stats.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma estatistica de gol.";
    listaStats.appendChild(li);
  } else {
    const cabecalho = document.createElement("li");
    cabecalho.className = "linha-stats linha-stats-cabecalho";
    cabecalho.innerHTML = "<span>Jogador</span><span>Gols</span><span>Assistencias</span>";
    listaStats.appendChild(cabecalho);

    stats.forEach((item) => {
      const li = document.createElement("li");
      li.className = "linha-stats";
      li.innerHTML = `<span>${item.playerName} (${item.teamName})</span><span>${item.goals}</span><span>${item.assists}</span>`;
      listaStats.appendChild(li);
    });
  }

  detalhe.appendChild(cabecalho);
  detalhe.appendChild(infos);
  detalhe.appendChild(listaDetalheGols);
  detalhe.appendChild(tituloStats);
  detalhe.appendChild(listaStats);
}

function renderizarHistorico() {
  const finalizadas = eventoAtual.matches
    .filter((match) => match.status === "Finalizada")
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

  const visiveis = filtrarHistorico(finalizadas);

  const resultadoPaginacao = renderizarListaPaginada({
    listId: "listaHistoricoPartidas",
    itens: visiveis,
    mensagemVazia: "Nenhuma partida finalizada para os filtros selecionados.",
    onChangePagina: renderizarHistorico,
    config: {
      min: 4,
      max: 12,
      alturaItemDesktop: 60,
      alturaItemMobile: 76,
      fatorViewport: 0.36
    },
    renderItem: (match) => {
      const li = document.createElement("li");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-partida-historico";
      btn.textContent = `${formatarDataHora(match.endTime)} | ${match.teamASnapshot.name} ${match.score.teamA} x ${match.score.teamB} ${match.teamBSnapshot.name}`;
      btn.addEventListener("click", () => {
        selectedHistoryMatchId = match.id;
        renderizarDetalheHistorico(selectedHistoryMatchId);
      });

      li.appendChild(btn);
      return li;
    }
  });

  if (visiveis.length === 0) {
    renderizarDetalheHistorico("");
    return;
  }

  const idsPaginaAtual = new Set((resultadoPaginacao.itensPagina || []).map((match) => match.id));
  const existeSelecionadaNaPagina = idsPaginaAtual.has(selectedHistoryMatchId);
  const fallbackId = (resultadoPaginacao.itensPagina && resultadoPaginacao.itensPagina[0])
    ? resultadoPaginacao.itensPagina[0].id
    : (visiveis[0] ? visiveis[0].id : "");
  selectedHistoryMatchId = existeSelecionadaNaPagina ? selectedHistoryMatchId : fallbackId;
  renderizarDetalheHistorico(selectedHistoryMatchId);
}

function renderizarRankingArtilheiros() {
  const ranking = [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, gols: jogador.golsTotal || 0 }))
    .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome));

  renderizarListaPaginada({
    listId: "listaArtilheiros",
    itens: ranking,
    mensagemVazia: "Nenhum jogador cadastrado.",
    onChangePagina: renderizarRankingArtilheiros,
    config: {
      min: 5,
      max: 14,
      alturaItemDesktop: 54,
      alturaItemMobile: 64,
      fatorViewport: 0.32
    },
    renderItem: (item, indiceGlobal) => {
      const li = document.createElement("li");
      li.textContent = `${indiceGlobal + 1}. ${item.nome} - ${item.gols} gol(s)`;
      return li;
    }
  });
}

function renderizarRankingAssistencias() {
  const ranking = [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, assists: jogador.assistsTotal || 0 }))
    .sort((a, b) => b.assists - a.assists || a.nome.localeCompare(b.nome));

  renderizarListaPaginada({
    listId: "listaAssistencias",
    itens: ranking,
    mensagemVazia: "Nenhum jogador cadastrado.",
    onChangePagina: renderizarRankingAssistencias,
    config: {
      min: 5,
      max: 14,
      alturaItemDesktop: 54,
      alturaItemMobile: 64,
      fatorViewport: 0.32
    },
    renderItem: (item, indiceGlobal) => {
      const li = document.createElement("li");
      li.textContent = `${indiceGlobal + 1}. ${item.nome} - ${item.assists} assistencia(s)`;
      return li;
    }
  });
}

function gerarRankingArtilheirosAtual() {
  return [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, gols: jogador.golsTotal || 0 }))
    .filter((item) => item.gols > 0)
    .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome));
}

function gerarRankingAssistenciasAtual() {
  return [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, assistencias: jogador.assistsTotal || 0 }))
    .filter((item) => item.assistencias > 0)
    .sort((a, b) => b.assistencias - a.assistencias || a.nome.localeCompare(b.nome));
}

function gerarRankingVitoriasAtual() {
  return [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, vitorias: jogador.vitoriasTotal || 0 }))
    .filter((item) => item.vitorias > 0)
    .sort((a, b) => b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));
}

function calcularIndiceDesempenho(jogador) {
  const vitorias = Number(jogador.vitoriasTotal || 0);
  const gols = Number(jogador.golsTotal || 0);
  const assistencias = Number(jogador.assistsTotal || 0);
  return (vitorias * 2) + (gols * 3) + (assistencias * 2);
}

function calcularBonusNivelPorDesempenho(jogador) {
  const indice = calcularIndiceDesempenho(jogador);

  if (indice >= 18) return 2;
  if (indice >= 9) return 1;
  return 0;
}

function aplicarEvolucaoNivelJogadores() {
  const evolucoes = [];

  eventoAtual.jogadores = eventoAtual.jogadores.map((jogador) => {
    const nivelAtual = Number(jogador.nivel || 1);
    const bonus = calcularBonusNivelPorDesempenho(jogador);
    const novoNivel = Math.min(5, Math.max(1, nivelAtual + bonus));

    if (novoNivel > nivelAtual) {
      evolucoes.push({
        nome: jogador.nome,
        anterior: nivelAtual,
        novo: novoNivel
      });
    }

    return {
      ...jogador,
      nivel: novoNivel
    };
  });

  return evolucoes;
}

function gerarSnapshotCampeonato() {
  const partidasFinalizadas = eventoAtual.matches
    .filter((match) => match.status === "Finalizada")
    .sort((a, b) => new Date(a.endTime || a.createdAt) - new Date(b.endTime || b.createdAt))
    .map((match) => ({
      id: match.id,
      createdAt: match.createdAt,
      endTime: match.endTime,
      durationRealSec: match.durationRealSec || 0,
      score: match.score || { teamA: 0, teamB: 0 },
      teamASnapshot: match.teamASnapshot,
      teamBSnapshot: match.teamBSnapshot,
      goals: Array.isArray(match.goals) ? match.goals : []
    }));

  const criadoEm = new Date().toISOString();
  const dataNome = new Date(criadoEm).toLocaleString("pt-BR");

  return {
    id: gerarId("champ"),
    nome: `Pelada ${dataNome}`,
    createdAt: criadoEm,
    totalPartidas: partidasFinalizadas.length,
    partidas: partidasFinalizadas,
    rankingVitorias: gerarRankingVitoriasAtual(),
    rankingArtilheiros: gerarRankingArtilheirosAtual(),
    rankingAssistencias: gerarRankingAssistenciasAtual()
  };
}

function renderizarDetalheCampeonato(campeonatoId) {
  const detalhe = document.getElementById("detalheCampeonato");
  if (!detalhe) return;
  detalhe.innerHTML = "";

  const campeonato = campeonatos.find((item) => item.id === campeonatoId);
  if (!campeonato) {
    detalhe.innerHTML = "<p>Selecione uma pelada para ver detalhes.</p>";
    return;
  }

  const titulo = document.createElement("h3");
  titulo.textContent = campeonato.nome || "Pelada";

  const resumo = document.createElement("p");
  resumo.textContent = `Criado em: ${formatarDataHora(campeonato.createdAt)} | Partidas: ${campeonato.totalPartidas || 0}`;

  const subtituloPartidas = document.createElement("h4");
  subtituloPartidas.textContent = "Jogos registrados";

  const listaPartidas = document.createElement("ul");
  listaPartidas.className = "lista-jogadores";

  const partidas = Array.isArray(campeonato.partidas) ? campeonato.partidas : [];
  if (partidas.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma partida finalizada registrada.";
    listaPartidas.appendChild(li);
  } else {
    partidas.forEach((match) => {
      const li = document.createElement("li");
      const nomeA = match.teamASnapshot?.name || "Time A";
      const nomeB = match.teamBSnapshot?.name || "Time B";
      const golsA = match.score?.teamA || 0;
      const golsB = match.score?.teamB || 0;
      li.textContent = `${formatarDataHora(match.endTime || match.createdAt)} | ${nomeA} ${golsA} x ${golsB} ${nomeB}`;
      listaPartidas.appendChild(li);
    });
  }

  const subtituloArtilheiros = document.createElement("h4");
  subtituloArtilheiros.textContent = "Artilheiros";

  const listaArtilheiros = document.createElement("ul");
  listaArtilheiros.className = "lista-jogadores";
  const rankingArtilheiros = Array.isArray(campeonato.rankingArtilheiros) ? campeonato.rankingArtilheiros : [];
  if (rankingArtilheiros.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sem gols registrados nesta pelada.";
    listaArtilheiros.appendChild(li);
  } else {
    rankingArtilheiros.forEach((item, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${item.nome} - ${item.gols} gol(s)`;
      listaArtilheiros.appendChild(li);
    });
  }

  const subtituloAssistencias = document.createElement("h4");
  subtituloAssistencias.textContent = "Assistencias";

  const listaAssistencias = document.createElement("ul");
  listaAssistencias.className = "lista-jogadores";
  const rankingAssistencias = Array.isArray(campeonato.rankingAssistencias) ? campeonato.rankingAssistencias : [];
  if (rankingAssistencias.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sem assistencias registradas nesta pelada.";
    listaAssistencias.appendChild(li);
  } else {
    rankingAssistencias.forEach((item, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${item.nome} - ${item.assistencias} assistencia(s)`;
      listaAssistencias.appendChild(li);
    });
  }

  const subtituloVitorias = document.createElement("h4");
  subtituloVitorias.textContent = "Vitorias";

  const listaVitorias = document.createElement("ul");
  listaVitorias.className = "lista-jogadores";
  const rankingVitorias = Array.isArray(campeonato.rankingVitorias) ? campeonato.rankingVitorias : [];
  if (rankingVitorias.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sem vitorias registradas nesta pelada.";
    listaVitorias.appendChild(li);
  } else {
    rankingVitorias.forEach((item, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${item.nome} - ${item.vitorias} vitoria(s)`;
      listaVitorias.appendChild(li);
    });
  }

  detalhe.appendChild(titulo);
  detalhe.appendChild(resumo);
  detalhe.appendChild(subtituloPartidas);
  detalhe.appendChild(listaPartidas);
  detalhe.appendChild(subtituloArtilheiros);
  detalhe.appendChild(listaArtilheiros);
  detalhe.appendChild(subtituloAssistencias);
  detalhe.appendChild(listaAssistencias);
  detalhe.appendChild(subtituloVitorias);
  detalhe.appendChild(listaVitorias);
}

function renderizarCampeonatos() {
  if (!campeonatosCarregados) {
    renderizarListaPaginada({
      listId: "listaCampeonatos",
      itens: [],
      mensagemVazia: "Carregando peladas...",
      onChangePagina: renderizarCampeonatos
    });
    return;
  }

  const resultadoPaginacao = renderizarListaPaginada({
    listId: "listaCampeonatos",
    itens: campeonatos,
    mensagemVazia: "Nenhuma pelada salva ainda.",
    onChangePagina: renderizarCampeonatos,
    config: {
      min: 4,
      max: 12,
      alturaItemDesktop: 60,
      alturaItemMobile: 76,
      fatorViewport: 0.36
    },
    renderItem: (campeonato, indiceGlobal) => {
      const li = document.createElement("li");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-partida-historico";
      const ordem = indiceGlobal + 1;
      btn.textContent = `Pelada ${ordem} | ${formatarDataHora(campeonato.createdAt)}`;
      btn.addEventListener("click", () => {
        selectedChampionshipId = campeonato.id;
        renderizarDetalheCampeonato(selectedChampionshipId);
      });

      li.appendChild(btn);
      return li;
    }
  });

  if (campeonatos.length === 0) {
    renderizarDetalheCampeonato("");
    return;
  }

  const idsPaginaAtual = new Set((resultadoPaginacao.itensPagina || []).map((item) => item.id));
  if (!idsPaginaAtual.has(selectedChampionshipId)) {
    selectedChampionshipId = (resultadoPaginacao.itensPagina && resultadoPaginacao.itensPagina[0])
      ? resultadoPaginacao.itensPagina[0].id
      : "";
  }

  renderizarDetalheCampeonato(selectedChampionshipId);
}

function exportarHistorico() {
  const historico = eventoAtual.matches.filter((match) => match.status === "Finalizada");
  const blob = new Blob([JSON.stringify(historico, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico_${eventoAtual.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function resetarCampeonato() {
  const confirmar = window.confirm("Isso vai resetar a pelada atual (partidas e gols acumulados). Deseja continuar?");
  if (!confirmar) return;

  const partidasFinalizadas = eventoAtual.matches.filter((match) => match.status === "Finalizada");
  if (partidasFinalizadas.length > 0) {
    try {
      const snapshot = gerarSnapshotCampeonato();
      await window.appSupabase.salvarCampeonatoEvento(eventoAtual.id, snapshot);
      if (campeonatosCarregados) {
        campeonatos.unshift(snapshot);
        renderizarCampeonatos();
      }
    } catch (error) {
      alert(`Falha ao salvar historico da pelada: ${error.message || error}`);
      return;
    }
  }

  const evolucoes = aplicarEvolucaoNivelJogadores();

  eventoAtual.matches = [];
  eventoAtual.activeMatchId = "";
  eventoAtual.jogadores = eventoAtual.jogadores.map((jogador) => ({
    ...jogador,
    golsTotal: 0,
    assistsTotal: 0,
    vitoriasTotal: 0
  }));

  await salvarEventos();
  pararIntervaloCronometro();
  renderizarJogadores();
  renderizarPartidas();

  if (evolucoes.length > 0) {
    const linhas = evolucoes.map((item) => `${item.nome}: ${item.anterior} -> ${item.novo}`);
    alert(`Evolucao de estrelas aplicada:\n${linhas.join("\n")}`);
  } else {
    alert("Pelada resetada sem alteracoes de estrelas.");
  }
}

function renderizarPartidas() {
  if (!partidasCarregadas) {
    const painel = document.getElementById("painelPartidaAtiva");
    if (painel) {
      painel.innerHTML = "<p>Carregando dados de partidas...</p>";
    }
    return;
  }

  atualizarBloqueioFormularioPartida();
  renderizarSelecaoJogadoresTime();
  renderizarTimes();
  renderizarSeletoresDeTimes();
  renderizarPainelPartidaAtiva();
  renderizarHistorico();
  renderizarRankingArtilheiros();
  renderizarRankingAssistencias();
}

function inicializarEventosPartidas() {
  document.getElementById("formTime").addEventListener("submit", salvarTime);
  document.getElementById("btnGerarTimesAleatorios").addEventListener("click", gerarTimesAleatorios);
  document.getElementById("btnCancelarEdicaoTime").addEventListener("click", () => {
    resetarFormularioTime();
    renderizarPartidas();
  });

  document.getElementById("formCriarPartida").addEventListener("submit", criarPartida);

  document.getElementById("filtroDataPartida").addEventListener("change", renderizarHistorico);
  document.getElementById("filtroTimePartida").addEventListener("change", renderizarHistorico);

  document.getElementById("btnExportarHistorico").addEventListener("click", exportarHistorico);
  document.getElementById("btnResetarCampeonato").addEventListener("click", resetarCampeonato);
}

function retomarCronometroSeNecessario() {
  const partida = obterPartidaAtiva();
  if (!partida || partida.status !== "Em andamento" || !partida.isClockRunning) {
    return;
  }

  partida.lastTickAt = Date.now();
  if (!matchIntervalId) {
    matchIntervalId = setInterval(tickCronometro, 1000);
  }
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

  if (!eventoId) {
    alert("Evento invalido.");
    window.location.href = "index.html";
    return;
  }

  if (!(await carregarEvento())) {
    return;
  }

  inicializarAbas();
  inicializarSubAbasPartidas();
  inicializarDiasSemana();
  inicializarEstrelas();
  preencherInfoEvento();
  renderizarJogadores();
  inicializarEventosPartidas();
  window.addEventListener("resize", () => {
    clearTimeout(resizePaginacaoTimeoutId);
    resizePaginacaoTimeoutId = setTimeout(() => {
      renderizarJogadores();
      renderizarPartidas();
      if (campeonatosCarregados) {
        renderizarCampeonatos();
      }
    }, 140);
  });

  document.getElementById("formInfoEvento").addEventListener("submit", salvarInfoEvento);
  document.getElementById("formJogador").addEventListener("submit", adicionarJogador);
});
