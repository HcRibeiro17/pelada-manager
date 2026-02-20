function calcularEstatisticas(eventos) {
  let totalPartidas = 0;
  let totalGols = 0;
  let totalAssistencias = 0;

  eventos.forEach((evento) => {
    const matches = Array.isArray(evento.matches) ? evento.matches : [];
    totalPartidas += matches.filter((m) => m.status === "Finalizada").length;

    const jogadores = Array.isArray(evento.jogadores) ? evento.jogadores : [];
    jogadores.forEach((jogador) => {
      totalGols += jogador.golsTotal || 0;
      totalAssistencias += jogador.assistsTotal || 0;
    });
  });

  return {
    totalEventos: eventos.length,
    totalPartidas,
    totalGols,
    totalAssistencias
  };
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
  const usuarioAtual = window.appSupabase.mapearUsuario(authUser);

  if (!usuarioAtual) {
    window.location.href = "login.html";
    return;
  }

  const eventosCore = await window.appSupabase.carregarEventosConta();
  const eventos = await Promise.all((eventosCore || []).map((evento) => window.appSupabase.carregarEventoCompleto(evento.id)));
  const eventosValidos = eventos.filter(Boolean);
  const stats = calcularEstatisticas(eventosValidos);

  document.getElementById("perfilNome").textContent = `Nome: ${usuarioAtual.nome}`;
  document.getElementById("perfilUsuario").textContent = `Usuario: ${usuarioAtual.username || "-"}`;
  document.getElementById("perfilEmail").textContent = `Email: ${usuarioAtual.email || "-"}`;
  document.getElementById("perfilId").textContent = `ID da conta: ${usuarioAtual.id}`;
  document.getElementById("perfilEventos").textContent = `Eventos cadastrados: ${stats.totalEventos}`;
  document.getElementById("perfilPartidas").textContent = `Partidas finalizadas: ${stats.totalPartidas}`;
  document.getElementById("perfilGols").textContent = `Gols acumulados: ${stats.totalGols}`;
  document.getElementById("perfilAssistencias").textContent = `Assistencias acumuladas: ${stats.totalAssistencias}`;
});
