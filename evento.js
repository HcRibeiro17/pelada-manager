
const CHAVE_USUARIOS = "usuarios";
const CHAVE_USUARIO_ATUAL = "usuarioAtualId";
const CHAVE_EVENTOS_POR_USUARIO = "eventosPorUsuario";

let eventos = [];
const params = new URLSearchParams(window.location.search);
const eventoId = params.get("id");
let eventoAtual = null;
let diaSelecionado = "";
let nivelSelecionado = 0;
let usuarioAtual = null;
let selectedHistoryMatchId = "";
let matchIntervalId = null;
let salvarCounter = 0;

function gerarId(prefixo) {
  return `${prefixo}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

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

function trocarConta() {
  localStorage.removeItem(CHAVE_USUARIO_ATUAL);
  window.location.href = "login.html";
}

function inicializarEstruturaEvento() {
  if (!Array.isArray(eventoAtual.jogadores)) {
    eventoAtual.jogadores = [];
  }

  eventoAtual.jogadores = eventoAtual.jogadores.map((jogador) => ({
    ...jogador,
    golsTotal: Number.isFinite(jogador.golsTotal) ? jogador.golsTotal : 0,
    assistsTotal: Number.isFinite(jogador.assistsTotal) ? jogador.assistsTotal : 0
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

function carregarEvento() {
  eventoAtual = eventos.find((evento) => evento.id === eventoId) || null;

  if (!eventoAtual) {
    alert("Evento nao encontrado.");
    window.location.href = "index.html";
    return false;
  }

  inicializarEstruturaEvento();
  salvarEventos();
  return true;
}

function preencherInfoEvento() {
  document.getElementById("tituloEvento").textContent = eventoAtual.nome;
  document.getElementById("nomeEvento").value = eventoAtual.nome || "";
  document.getElementById("horaInicio").value = eventoAtual.horaInicio || "";
  document.getElementById("tipoEvento").value = eventoAtual.tipo || "";
  document.getElementById("limiteJogadores").value = eventoAtual.limiteJogadores || "";
  document.getElementById("limiteGoleiros").value = eventoAtual.limiteGoleiros || "";
  document.getElementById("duracaoPartida").value = String(eventoAtual.matchDurationMinutes || 10);

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
    botao.addEventListener("click", () => {
      const aba = botao.dataset.aba;

      document.querySelectorAll(".aba-btn").forEach((b) => b.classList.remove("ativa"));
      document.querySelectorAll(".aba-conteudo").forEach((c) => c.classList.remove("ativa"));

      botao.classList.add("ativa");
      document.getElementById(`aba-${aba}`).classList.add("ativa");

      if (aba === "partidas") {
        renderizarPartidas();
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

  salvarEventos();
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
    assistsTotal: 0
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
  texto.textContent = `${jogador.nome} | ${jogador.posicao} | ${"\u2605".repeat(jogador.nivel)} | Gols: ${jogador.golsTotal || 0} | Assists: ${jogador.assistsTotal || 0}`;

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
  const listaMensalistas = document.getElementById("listaMensalistasEvento");
  const listaNaoMensalistas = document.getElementById("listaNaoMensalistasEvento");

  listaMensalistas.innerHTML = "";
  listaNaoMensalistas.innerHTML = "";

  const mensalistas = eventoAtual.jogadores.filter((jogador) => jogador.mensalista);
  const naoMensalistas = eventoAtual.jogadores.filter((jogador) => !jogador.mensalista);

  if (mensalistas.length === 0) {
    const vazio = document.createElement("li");
    vazio.textContent = "Nenhum jogador mensalista cadastrado.";
    listaMensalistas.appendChild(vazio);
  } else {
    mensalistas.forEach((jogador) => listaMensalistas.appendChild(linhaJogador(jogador)));
  }

  if (naoMensalistas.length === 0) {
    const vazio = document.createElement("li");
    vazio.textContent = "Nenhum jogador nao mensalista cadastrado.";
    listaNaoMensalistas.appendChild(vazio);
  } else {
    naoMensalistas.forEach((jogador) => listaNaoMensalistas.appendChild(linhaJogador(jogador)));
  }
}

function obterTimePorId(teamId) {
  return eventoAtual.times.find((time) => time.id === teamId) || null;
}

function obterJogadorPorId(playerId) {
  return eventoAtual.jogadores.find((jogador) => jogador.id === playerId) || null;
}

function obterPartidaAtiva() {
  if (!eventoAtual.activeMatchId) {
    return null;
  }
  return eventoAtual.matches.find((match) => match.id === eventoAtual.activeMatchId) || null;
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
  const lista = document.getElementById("listaTimes");
  lista.innerHTML = "";

  if (eventoAtual.times.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum time cadastrado.";
    lista.appendChild(li);
    return;
  }

  eventoAtual.times.forEach((time) => {
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
    lista.appendChild(li);
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
  const duracaoMinutes = Number(document.getElementById("duracaoPartida").value);

  if (!teamAId || !teamBId) {
    alert("Selecione os dois times.");
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
  const durationSec = duracaoMinutes * 60;

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
  eventoAtual.matchDurationMinutes = duracaoMinutes;

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
  const lista = document.getElementById("listaHistoricoPartidas");
  lista.innerHTML = "";

  const finalizadas = eventoAtual.matches
    .filter((match) => match.status === "Finalizada")
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

  const visiveis = filtrarHistorico(finalizadas);

  if (visiveis.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma partida finalizada para os filtros selecionados.";
    lista.appendChild(li);
    renderizarDetalheHistorico("");
    return;
  }

  visiveis.forEach((match) => {
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
    lista.appendChild(li);
  });

  const existeSelecionada = visiveis.some((m) => m.id === selectedHistoryMatchId);
  selectedHistoryMatchId = existeSelecionada ? selectedHistoryMatchId : visiveis[0].id;
  renderizarDetalheHistorico(selectedHistoryMatchId);
}

function renderizarRankingArtilheiros() {
  const lista = document.getElementById("listaArtilheiros");
  lista.innerHTML = "";

  const ranking = [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, gols: jogador.golsTotal || 0 }))
    .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome));

  if (ranking.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum jogador cadastrado.";
    lista.appendChild(li);
    return;
  }

  ranking.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${item.nome} - ${item.gols} gol(s)`;
    lista.appendChild(li);
  });
}

function renderizarRankingAssistencias() {
  const lista = document.getElementById("listaAssistencias");
  if (!lista) return;
  lista.innerHTML = "";

  const ranking = [...eventoAtual.jogadores]
    .map((jogador) => ({ nome: jogador.nome, assists: jogador.assistsTotal || 0 }))
    .sort((a, b) => b.assists - a.assists || a.nome.localeCompare(b.nome));

  if (ranking.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum jogador cadastrado.";
    lista.appendChild(li);
    return;
  }

  ranking.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${item.nome} - ${item.assists} assistencia(s)`;
    lista.appendChild(li);
  });
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

function resetarCampeonato() {
  const confirmar = window.confirm("Isso vai apagar partidas e gols acumulados. Deseja continuar?");
  if (!confirmar) return;

  eventoAtual.matches = [];
  eventoAtual.activeMatchId = "";
  eventoAtual.jogadores = eventoAtual.jogadores.map((jogador) => ({ ...jogador, golsTotal: 0, assistsTotal: 0 }));

  salvarEventos();
  pararIntervaloCronometro();
  renderizarJogadores();
  renderizarPartidas();
}

function renderizarPartidas() {
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

document.addEventListener("DOMContentLoaded", () => {
  usuarioAtual = obterUsuarioAtual();

  if (!usuarioAtual) {
    window.location.href = "login.html";
    return;
  }

  eventos = carregarEventosDoUsuario(usuarioAtual.id);

  if (!eventoId) {
    alert("Evento invalido.");
    window.location.href = "index.html";
    return;
  }

  if (!carregarEvento()) {
    return;
  }

  inicializarAbas();
  inicializarSubAbasPartidas();
  inicializarDiasSemana();
  inicializarEstrelas();
  preencherInfoEvento();
  renderizarJogadores();
  inicializarEventosPartidas();
  renderizarPartidas();
  retomarCronometroSeNecessario();

  document.getElementById("formInfoEvento").addEventListener("submit", salvarInfoEvento);
  document.getElementById("formJogador").addEventListener("submit", adicionarJogador);
});
