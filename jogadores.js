let jogadores = JSON.parse(localStorage.getItem("jogadores")) || [];

function salvar() {
  localStorage.setItem("jogadores", JSON.stringify(jogadores));
}

function adicionarJogador() {
  const nome = document.getElementById("nomeJogador").value;

  if (nome === "") {
    alert("Digite o nome do jogador");
    return;
  }

  jogadores.push({
    nome: nome,
    gols: 0,
    assistencias: 0,
    jogos: 0,
    vitorias: 0
  });

  document.getElementById("nomeJogador").value = "";
  salvar();
  listarJogadores();
}

function removerJogador(index) {
  jogadores.splice(index, 1);
  salvar();
  listarJogadores();
}

function listarJogadores() {
  const lista = document.getElementById("listaJogadores");
  lista.innerHTML = "";

  jogadores.forEach((jogador, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${jogador.nome}
      <button onclick="removerJogador(${index})">❌</button>
    `;
    lista.appendChild(li);
  });
}

listarJogadores();
