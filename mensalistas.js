let mensalistas = JSON.parse(localStorage.getItem("mensalistas")) || [];

function salvar() {
  localStorage.setItem("mensalistas", JSON.stringify(mensalistas));
}

function adicionarMensalista() {
  const nome = document.getElementById("nomeMensalista").value;
  const valor = document.getElementById("valorMensalidade").value;

  if (nome === "" || valor === "") {
    alert("Preencha todos os campos");
    return;
  }

  mensalistas.push({
    nome: nome,
    valor: valor,
    pago: false
  });

  document.getElementById("nomeMensalista").value = "";
  document.getElementById("valorMensalidade").value = "";

  salvar();
  listarMensalistas();
}

function alternarPagamento(index) {
  mensalistas[index].pago = !mensalistas[index].pago;
  salvar();
  listarMensalistas();
}

function removerMensalista(index) {
  mensalistas.splice(index, 1);
  salvar();
  listarMensalistas();
}

function listarMensalistas() {
  const lista = document.getElementById("listaMensalistas");
  lista.innerHTML = "";

  mensalistas.forEach((m, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${m.nome} - R$ ${m.valor}
      <strong>${m.pago ? "✅ Pago" : "❌ Não pago"}</strong>
      <button onclick="alternarPagamento(${index})">💰</button>
      <button onclick="removerMensalista(${index})">❌</button>
    `;
    lista.appendChild(li);
  });
}

listarMensalistas();
