const CHAVE_USUARIOS = "usuarios";
const CHAVE_USUARIO_ATUAL = "usuarioAtualId";
const CHAVE_EVENTOS_POR_USUARIO = "eventosPorUsuario";

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
  return eventosPorUsuario[idUsuario] || [];
}

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

document.addEventListener("DOMContentLoaded", () => {
  const usuarioAtual = obterUsuarioAtual();

  if (!usuarioAtual) {
    window.location.href = "pessoas.html";
    return;
  }

  const eventos = carregarEventosDoUsuario(usuarioAtual.id);
  const stats = calcularEstatisticas(eventos);

  document.getElementById("perfilNome").textContent = `Nome: ${usuarioAtual.nome}`;
  document.getElementById("perfilId").textContent = `ID da conta: ${usuarioAtual.id}`;
  document.getElementById("perfilEventos").textContent = `Eventos cadastrados: ${stats.totalEventos}`;
  document.getElementById("perfilPartidas").textContent = `Partidas finalizadas: ${stats.totalPartidas}`;
  document.getElementById("perfilGols").textContent = `Gols acumulados: ${stats.totalGols}`;
  document.getElementById("perfilAssistencias").textContent = `Assistencias acumuladas: ${stats.totalAssistencias}`;
});
