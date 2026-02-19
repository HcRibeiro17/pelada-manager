const CHAVE_USUARIOS = "usuarios";
const CHAVE_USUARIO_ATUAL = "usuarioAtualId";

function carregarUsuarios() {
  return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
}

function salvarUsuarios(usuarios) {
  localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
}

function gerarIdUsuario() {
  return `usr_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function obterUsuarioAtual() {
  const usuarios = carregarUsuarios();
  const usuarioAtualId = localStorage.getItem(CHAVE_USUARIO_ATUAL);
  return usuarios.find((usuario) => usuario.id === usuarioAtualId) || null;
}

function normalizarUsuario(usuario) {
  return String(usuario || "").trim().toLowerCase();
}

function validarUsuario(username) {
  return /^[a-z0-9._-]{3,24}$/i.test(username);
}

async function hashSenha(senha) {
  if (!crypto.subtle) {
    return `b64:${btoa(unescape(encodeURIComponent(senha)))}`;
  }

  const data = new TextEncoder().encode(senha);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function hashSenhaSha256(senha) {
  const data = new TextEncoder().encode(senha);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hashSenhaBase64Legado(senha) {
  return btoa(unescape(encodeURIComponent(senha)));
}

async function validarSenhaInformada(senha, passwordHash) {
  if (!passwordHash) return false;

  if (passwordHash.startsWith("sha256:")) {
    if (!crypto.subtle) return false;
    const hash = await hashSenhaSha256(senha);
    return hash === passwordHash.slice("sha256:".length);
  }

  if (passwordHash.startsWith("b64:")) {
    return hashSenhaBase64Legado(senha) === passwordHash.slice("b64:".length);
  }

  // Compatibilidade com dados salvos em versoes anteriores sem prefixo.
  if (crypto.subtle) {
    const sha256 = await hashSenhaSha256(senha);
    if (sha256 === passwordHash) return true;
  }
  return hashSenhaBase64Legado(senha) === passwordHash;
}

function entrar(idUsuario) {
  localStorage.setItem(CHAVE_USUARIO_ATUAL, idUsuario);
  window.location.href = "index.html";
}

function usuarioExiste(usuarios, username, ignoreId) {
  const normalizado = normalizarUsuario(username);
  return usuarios.some((usuario) => {
    if (ignoreId && usuario.id === ignoreId) return false;
    return normalizarUsuario(usuario.username) === normalizado;
  });
}

async function processarLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("loginSenha").value;
  const usuarios = carregarUsuarios();

  const usuario = usuarios.find((u) => normalizarUsuario(u.username) === normalizarUsuario(username));
  if (!usuario || !usuario.passwordHash) {
    alert("Usuario ou senha invalidos.");
    return;
  }

  const senhaValida = await validarSenhaInformada(senha, usuario.passwordHash);
  if (!senhaValida) {
    alert("Usuario ou senha invalidos.");
    return;
  }

  // Se estava em formato legado sem prefixo, salva no novo formato.
  if (usuario.passwordHash && !usuario.passwordHash.includes(":")) {
    usuario.passwordHash = await hashSenha(senha);
    salvarUsuarios(usuarios);
  }

  entrar(usuario.id);
}

async function processarCadastro(event) {
  event.preventDefault();

  const nome = document.getElementById("cadastroNome").value.trim();
  const username = document.getElementById("cadastroUsuario").value.trim();
  const senha = document.getElementById("cadastroSenha").value;

  if (!validarUsuario(username)) {
    alert("Usuario invalido. Use 3-24 caracteres (letras, numeros, ., _ ou -).");
    return;
  }

  if (senha.length < 6) {
    alert("Senha invalida. Use no minimo 6 caracteres.");
    return;
  }

  const usuarios = carregarUsuarios();
  if (usuarioExiste(usuarios, username)) {
    alert("Esse usuario ja existe.");
    return;
  }

  const senhaHash = await hashSenha(senha);
  const novoUsuario = {
    id: gerarIdUsuario(),
    nome,
    username: normalizarUsuario(username),
    passwordHash: senhaHash,
    createdAt: new Date().toISOString()
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);
  entrar(novoUsuario.id);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("formLogin").addEventListener("submit", processarLogin);
  document.getElementById("formCadastro").addEventListener("submit", processarCadastro);
});
