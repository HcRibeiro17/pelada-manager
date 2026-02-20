const APP_AUTH_EMAIL_DOMAIN = "pelada-manager.app";
let cachedAuthUser = null;
let cachedAuthUserAt = 0;
const AUTH_CACHE_TTL_MS = 60 * 1000;

function atualizarCacheAuthUser(user) {
  cachedAuthUser = user || null;
  cachedAuthUserAt = user ? Date.now() : 0;
}

function normalizarUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function usernameParaChave(username) {
  const normalizado = normalizarUsername(username);
  return encodeURIComponent(normalizado).replace(/%/g, "_");
}

function chaveParaUsername(chave) {
  try {
    return decodeURIComponent(String(chave || "").replace(/_/g, "%"));
  } catch (_error) {
    return chave || "";
  }
}

function usernameParaEmail(username) {
  const chave = usernameParaChave(username);
  return `u_${chave}@${APP_AUTH_EMAIL_DOMAIN}`;
}

function getSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("SDK do Supabase nao carregado.");
  }

  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em config.js");
  }

  if (!window.__supabaseClient) {
    window.__supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }
  return window.__supabaseClient;
}

async function obterUsuarioAtualAuth() {
  const agora = Date.now();
  if (cachedAuthUser && (agora - cachedAuthUserAt) < AUTH_CACHE_TTL_MS) {
    return cachedAuthUser;
  }

  const sb = getSupabaseClient();
  const { data: sessaoData, error: sessaoErro } = await sb.auth.getSession();

  if (!sessaoErro && sessaoData?.session?.user) {
    atualizarCacheAuthUser(sessaoData.session.user);
    return sessaoData.session.user;
  }

  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    atualizarCacheAuthUser(null);
    return null;
  }

  atualizarCacheAuthUser(data.user);
  return data.user;
}

function mapearUsuario(authUser) {
  if (!authUser) return null;
  const emailLocal = (authUser.email || "").split("@")[0];
  let username = authUser.user_metadata?.username || "";

  if (!username) {
    if (emailLocal.startsWith("u_")) {
      username = chaveParaUsername(emailLocal.slice(2));
    } else {
      username = emailLocal;
    }
  }

  return {
    id: authUser.id,
    nome: authUser.user_metadata?.nome || authUser.user_metadata?.name || username || "Usuario",
    username,
    email: authUser.email || ""
  };
}

async function loginComUsernameSenha(username, senha) {
  const sb = getSupabaseClient();
  const emailNovo = usernameParaEmail(username);
  const tentativaNova = await sb.auth.signInWithPassword({ email: emailNovo, password: senha });
  if (!tentativaNova.error) {
    atualizarCacheAuthUser(tentativaNova.data.user || null);
    return tentativaNova.data.user || null;
  }

  // Compatibilidade com contas antigas (antes da codificacao / dominio antigo).
  const emailsLegados = [
    `${normalizarUsername(username)}@pelada.local`,
    `u_${usernameParaChave(username)}@pelada.local`
  ];

  for (const email of emailsLegados) {
    const tentativa = await sb.auth.signInWithPassword({ email, password: senha });
    if (!tentativa.error) {
      atualizarCacheAuthUser(tentativa.data.user || null);
      return tentativa.data.user || null;
    }
  }

  throw tentativaNova.error;
}

async function cadastrarComUsernameSenha(nome, username, senha) {
  const sb = getSupabaseClient();
  const email = usernameParaEmail(username);
  const { data, error } = await sb.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome: nome || username,
        username: String(username || "").trim()
      }
    }
  });
  if (error) throw error;
  return data.user || null;
}

async function loginComEmailSenha(email, senha) {
  const sb = getSupabaseClient();
  const emailNormalizado = String(email || "").trim().toLowerCase();
  const tentativa = await sb.auth.signInWithPassword({ email: emailNormalizado, password: senha });

  if (!tentativa.error) {
    atualizarCacheAuthUser(tentativa.data.user || null);
    return tentativa.data.user || null;
  }

  // Compatibilidade: caso o usuario informe "username" sem @.
  if (!emailNormalizado.includes("@")) {
    return loginComUsernameSenha(emailNormalizado, senha);
  }

  throw tentativa.error;
}

async function cadastrarComEmailSenha(nome, username, email, senha) {
  const sb = getSupabaseClient();
  const emailNormalizado = String(email || "").trim().toLowerCase();
  const { data, error } = await sb.auth.signUp({
    email: emailNormalizado,
    password: senha,
    options: {
      data: {
        nome: nome || username || emailNormalizado,
        username: String(username || "").trim()
      }
    }
  });
  if (error) throw error;
  return data.user || null;
}

async function deslogar() {
  const sb = getSupabaseClient();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  atualizarCacheAuthUser(null);
}

function mapearEventoCore(row) {
  return {
    id: row.id,
    nome: row.nome || "",
    diaSemana: row.dia_semana || "",
    horaInicio: row.hora_inicio || "",
    tipo: row.tipo || "",
    limiteJogadores: Number(row.limite_jogadores || 0),
    limiteGoleiros: Number(row.limite_goleiros || 0),
    matchDurationMinutes: Number(row.match_duration_minutes || 10),
    activeMatchId: row.active_match_id || "",
    dataCriacao: row.created_at || new Date().toISOString(),
    ownerUserId: row.owner_user_id || "",
    ownerUsername: row.owner_username || "",
    ownerEmail: row.owner_email || "",
    jogadores: [],
    times: [],
    matches: []
  };
}

function normalizarArray(valor) {
  return Array.isArray(valor) ? valor : [];
}

function montarCoreRow(evento, ownerUserId) {
  return {
    id: evento.id,
    owner_user_id: ownerUserId,
    owner_username: evento.ownerUsername || "",
    owner_email: evento.ownerEmail || "",
    nome: evento.nome || "",
    dia_semana: evento.diaSemana || "",
    hora_inicio: evento.horaInicio || "",
    tipo: evento.tipo || "",
    limite_jogadores: Number(evento.limiteJogadores || 0),
    limite_goleiros: Number(evento.limiteGoleiros || 0),
    match_duration_minutes: Number(evento.matchDurationMinutes || 10),
    active_match_id: evento.activeMatchId || ""
  };
}

async function carregarEventosConta() {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data, error } = await sb.from("events")
    .select("id,nome,dia_semana,hora_inicio,tipo,limite_jogadores,limite_goleiros,match_duration_minutes,active_match_id,created_at,owner_user_id,owner_username,owner_email")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapearEventoCore);
}

async function carregarEventoBasico(eventId) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data: eventoRow, error: eventoError } = await sb.from("events")
    .select(`
      id,
      nome,
      dia_semana,
      hora_inicio,
      tipo,
      limite_jogadores,
      limite_goleiros,
      match_duration_minutes,
      active_match_id,
      created_at,
      owner_user_id,
      owner_username,
      owner_email,
      event_players (
        id,
        nome,
        posicao,
        nivel,
        mensalista,
        gols_total,
        assists_total,
        wins_total,
        created_at
      ),
      event_teams (
        id,
        name,
        player_ids,
        created_at,
        updated_at
      )
    `)
    .eq("id", eventId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (eventoError) throw eventoError;
  if (!eventoRow) return null;

  const evento = mapearEventoCore(eventoRow);
  const jogadoresRows = normalizarArray(eventoRow.event_players)
    .slice()
    .sort((a, b) => String(a?.created_at || "").localeCompare(String(b?.created_at || "")));
  const timesRows = normalizarArray(eventoRow.event_teams)
    .slice()
    .sort((a, b) => String(a?.created_at || "").localeCompare(String(b?.created_at || "")));

  evento.jogadores = jogadoresRows.map((p) => ({
    id: p.id,
    nome: p.nome,
    posicao: p.posicao,
    nivel: Number(p.nivel || 0),
    mensalista: Boolean(p.mensalista),
    golsTotal: Number(p.gols_total || 0),
    assistsTotal: Number(p.assists_total || 0),
    vitoriasTotal: Number(p.wins_total || 0)
  }));

  evento.times = timesRows.map((t) => ({
    id: t.id,
    name: t.name,
    playerIds: normalizarArray(t.player_ids),
    createdAt: t.created_at,
    updatedAt: t.updated_at
  }));

  evento.matches = [];
  return evento;
}

async function carregarDadosPartidasEvento(eventId) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data: eventoRow, error: eventoError } = await sb.from("events")
    .select("id,active_match_id,match_duration_minutes")
    .eq("id", eventId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (eventoError) throw eventoError;
  if (!eventoRow) return null;

  const [matchesResp, goalsResp] = await Promise.all([
    sb.from("event_matches")
      .select("id,team_a_id,team_b_id,team_a_snapshot,team_b_snapshot,score,created_at,start_time,end_time,duration_configured_sec,remaining_sec,elapsed_sec,duration_real_sec,status,is_clock_running,last_tick_at,history_immutable")
      .eq("event_id", eventId)
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: true }),
    sb.from("event_match_goals")
      .select("id,match_id,player_id,player_name,assist_player_id,assist_player_name,team_id,team_name,timestamp,elapsed_sec")
      .eq("event_id", eventId)
      .eq("owner_user_id", user.id)
      .order("timestamp", { ascending: true })
  ]);

  if (matchesResp.error) throw matchesResp.error;
  if (goalsResp.error) throw goalsResp.error;

  const goalsByMatch = {};
  (goalsResp.data || []).forEach((g) => {
    if (!goalsByMatch[g.match_id]) goalsByMatch[g.match_id] = [];
    goalsByMatch[g.match_id].push({
      id: g.id,
      playerId: g.player_id,
      playerName: g.player_name,
      assistPlayerId: g.assist_player_id || "",
      assistPlayerName: g.assist_player_name || "",
      teamId: g.team_id,
      teamName: g.team_name,
      timestamp: g.timestamp,
      elapsedSec: Number(g.elapsed_sec || 0)
    });
  });

  const matches = (matchesResp.data || []).map((m) => ({
    id: m.id,
    teamAId: m.team_a_id,
    teamBId: m.team_b_id,
    teamASnapshot: m.team_a_snapshot || null,
    teamBSnapshot: m.team_b_snapshot || null,
    goals: goalsByMatch[m.id] || [],
    createdAt: m.created_at,
    startTime: m.start_time,
    endTime: m.end_time,
    durationConfiguredSec: Number(m.duration_configured_sec || 0),
    remainingSec: Number(m.remaining_sec || 0),
    elapsedSec: Number(m.elapsed_sec || 0),
    durationRealSec: Number(m.duration_real_sec || 0),
    status: m.status || "Em andamento",
    isClockRunning: Boolean(m.is_clock_running),
    lastTickAt: m.last_tick_at || null,
    score: m.score || { teamA: 0, teamB: 0 },
    historyImmutable: Boolean(m.history_immutable)
  }));

  return {
    matches,
    activeMatchId: eventoRow.active_match_id || "",
    matchDurationMinutes: Number(eventoRow.match_duration_minutes || 10)
  };
}

async function carregarEventoCompleto(eventId) {
  const evento = await carregarEventoBasico(eventId);
  if (!evento) return null;
  const dadosPartidas = await carregarDadosPartidasEvento(eventId);
  if (!dadosPartidas) return evento;
  evento.matches = dadosPartidas.matches;
  evento.activeMatchId = dadosPartidas.activeMatchId || evento.activeMatchId || "";
  if (Number.isFinite(dadosPartidas.matchDurationMinutes)) {
    evento.matchDurationMinutes = dadosPartidas.matchDurationMinutes;
  }
  return evento;
}

async function salvarEventoBasico(eventoInput) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const evento = eventoInput && typeof eventoInput === "object" ? { ...eventoInput } : {};
  if (!evento.id) throw new Error("Evento invalido: id ausente.");

  const coreRow = montarCoreRow(evento, user.id);
  const { error } = await sb.from("events").upsert(coreRow, { onConflict: "id" });
  if (error) throw error;
}

async function salvarEventoCompleto(eventoInput) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const evento = eventoInput && typeof eventoInput === "object" ? { ...eventoInput } : {};
  if (!evento.id) throw new Error("Evento invalido: id ausente.");

  const coreRow = montarCoreRow(evento, user.id);

  const { error: coreError } = await sb.from("events").upsert(coreRow, { onConflict: "id" });
  if (coreError) throw coreError;

  const { error: delPlayersError } = await sb.from("event_players").delete().eq("event_id", evento.id).eq("owner_user_id", user.id);
  if (delPlayersError) throw delPlayersError;
  const { error: delTeamsError } = await sb.from("event_teams").delete().eq("event_id", evento.id).eq("owner_user_id", user.id);
  if (delTeamsError) throw delTeamsError;
  const { error: delMatchesError } = await sb.from("event_matches").delete().eq("event_id", evento.id).eq("owner_user_id", user.id);
  if (delMatchesError) throw delMatchesError;
  const { error: delGoalsError } = await sb.from("event_match_goals").delete().eq("event_id", evento.id).eq("owner_user_id", user.id);
  if (delGoalsError) throw delGoalsError;

  const jogadores = normalizarArray(evento.jogadores).map((j) => ({
    id: j.id,
    event_id: evento.id,
    owner_user_id: user.id,
    nome: j.nome || "",
    posicao: j.posicao || "",
    nivel: Number(j.nivel || 0),
    mensalista: Boolean(j.mensalista),
    gols_total: Number(j.golsTotal || 0),
    assists_total: Number(j.assistsTotal || 0),
    wins_total: Number(j.vitoriasTotal || 0)
  }));

  if (jogadores.length > 0) {
    const { error: insPlayersError } = await sb.from("event_players").insert(jogadores);
    if (insPlayersError) throw insPlayersError;
  }

  const times = normalizarArray(evento.times).map((t) => ({
    id: t.id,
    event_id: evento.id,
    owner_user_id: user.id,
    name: t.name || "",
    player_ids: normalizarArray(t.playerIds),
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: t.updatedAt || new Date().toISOString()
  }));

  if (times.length > 0) {
    const { error: insTeamsError } = await sb.from("event_teams").insert(times);
    if (insTeamsError) throw insTeamsError;
  }

  const matches = normalizarArray(evento.matches).map((m) => ({
    id: m.id,
    event_id: evento.id,
    owner_user_id: user.id,
    team_a_id: m.teamAId || "",
    team_b_id: m.teamBId || "",
    team_a_snapshot: m.teamASnapshot || null,
    team_b_snapshot: m.teamBSnapshot || null,
    score: m.score || { teamA: 0, teamB: 0 },
    created_at: m.createdAt || new Date().toISOString(),
    start_time: m.startTime || null,
    end_time: m.endTime || null,
    duration_configured_sec: Number(m.durationConfiguredSec || 0),
    remaining_sec: Number(m.remainingSec || 0),
    elapsed_sec: Number(m.elapsedSec || 0),
    duration_real_sec: Number(m.durationRealSec || 0),
    status: m.status || "Em andamento",
    is_clock_running: Boolean(m.isClockRunning),
    last_tick_at: m.lastTickAt || null,
    history_immutable: Boolean(m.historyImmutable)
  }));

  if (matches.length > 0) {
    const { error: insMatchesError } = await sb.from("event_matches").insert(matches);
    if (insMatchesError) throw insMatchesError;
  }

  const gols = [];
  normalizarArray(evento.matches).forEach((m) => {
    normalizarArray(m.goals).forEach((g) => {
      gols.push({
        id: g.id,
        event_id: evento.id,
        owner_user_id: user.id,
        match_id: m.id,
        player_id: g.playerId || "",
        player_name: g.playerName || "",
        assist_player_id: g.assistPlayerId || "",
        assist_player_name: g.assistPlayerName || "",
        team_id: g.teamId || "",
        team_name: g.teamName || "",
        timestamp: g.timestamp || new Date().toISOString(),
        elapsed_sec: Number(g.elapsedSec || 0)
      });
    });
  });

  if (gols.length > 0) {
    const { error: insGoalsError } = await sb.from("event_match_goals").insert(gols);
    if (insGoalsError) throw insGoalsError;
  }
}

async function excluirEventoConta(eventId) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { error } = await sb.from("events")
    .delete()
    .eq("id", eventId)
    .eq("owner_user_id", user.id);
  if (error) throw error;
}

async function carregarCampeonatosEvento(eventId) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data, error } = await sb.from("event_championships")
    .select("id,name,payload,created_at")
    .eq("event_id", eventId)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => {
    const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
    return {
      ...payload,
      id: row.id,
      nome: row.name || payload.nome || "Campeonato",
      createdAt: row.created_at || payload.createdAt || new Date().toISOString()
    };
  });
}

async function salvarCampeonatoEvento(eventId, campeonatoInput) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const campeonato = campeonatoInput && typeof campeonatoInput === "object" ? { ...campeonatoInput } : {};
  if (!campeonato.id) throw new Error("Campeonato invalido: id ausente.");

  const row = {
    id: campeonato.id,
    event_id: eventId,
    owner_user_id: user.id,
    name: campeonato.nome || "Campeonato",
    payload: campeonato
  };

  const { error } = await sb.from("event_championships").insert(row);
  if (error) throw error;
}

// Compatibilidade: legado app_user_data
async function carregarDadosApp() {
  const eventos = await carregarEventosConta();
  return { eventos };
}

async function salvarDadosApp(payload) {
  const dados = payload && typeof payload === "object" ? payload : {};
  const eventos = normalizarArray(dados.eventos);
  for (const evento of eventos) {
    await salvarEventoCompleto(evento);
  }
}

window.appSupabase = {
  normalizarUsername,
  getSupabaseClient,
  obterUsuarioAtualAuth,
  mapearUsuario,
  loginComEmailSenha,
  cadastrarComEmailSenha,
  loginComUsernameSenha,
  cadastrarComUsernameSenha,
  deslogar,
  carregarEventosConta,
  carregarEventoBasico,
  carregarDadosPartidasEvento,
  carregarEventoCompleto,
  salvarEventoBasico,
  salvarEventoCompleto,
  excluirEventoConta,
  carregarCampeonatosEvento,
  salvarCampeonatoEvento,
  carregarDadosApp,
  salvarDadosApp
};
