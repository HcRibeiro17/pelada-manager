function validarUsuario(username) {
  return String(username || "").trim().length >= 3;
}

let ultimoEmailCadastro = "";

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function traduzirErroAuth(error) {
  const msg = String(error?.message || "").toLowerCase();

  if (msg.includes("email not confirmed")) {
    return "Email ainda nao confirmado. Verifique sua caixa de entrada e confirme sua conta antes de entrar.";
  }

  if (msg.includes("invalid login credentials")) {
    return "Email/usuario ou senha invalidos.";
  }

  if (msg.includes("email rate limit exceeded")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (msg.includes("user already registered")) {
    return "Este email ja esta cadastrado. Tente entrar em vez de cadastrar.";
  }

  return error?.message || "Erro inesperado.";
}

async function processarLogin(event) {
  event.preventDefault();

  const identificador = document.getElementById("loginIdentificador").value.trim();
  const senha = document.getElementById("loginSenha").value;

  if (!identificador) {
    alert("Informe email ou usuario.");
    return;
  }

  try {
    await window.appSupabase.loginComEmailSenha(identificador, senha);
    window.location.href = "index.html";
  } catch (error) {
    alert(`Falha no login: ${traduzirErroAuth(error)}`);
  }
}

async function processarCadastro(event) {
  event.preventDefault();

  const nome = document.getElementById("cadastroNome").value.trim();
  const username = document.getElementById("cadastroUsuario").value.trim();
  const email = document.getElementById("cadastroEmail").value.trim();
  const senha = document.getElementById("cadastroSenha").value;

  if (!validarUsuario(username)) {
    alert("Usuario invalido. Use no minimo 3 caracteres.");
    return;
  }

  if (!validarEmail(email)) {
    alert("Email invalido.");
    return;
  }

  if (senha.length < 6) {
    alert("Senha invalida. Use no minimo 6 caracteres.");
    return;
  }

  try {
    await window.appSupabase.cadastrarComEmailSenha(nome, username, email, senha);
    ultimoEmailCadastro = email;
    exibirModalCadastroSucesso();
    document.getElementById("formCadastro").reset();
  } catch (error) {
    alert(`Falha no cadastro: ${traduzirErroAuth(error)}`);
  }
}

function exibirModalCadastroSucesso() {
  const modal = document.getElementById("modalCadastroSucesso");
  const status = document.getElementById("statusReenvioEmail");
  if (!modal) return;
  if (status) {
    status.textContent = "";
    status.classList.add("oculto");
  }
  modal.classList.remove("oculto");
}

function fecharModalCadastroSucesso() {
  const modal = document.getElementById("modalCadastroSucesso");
  if (!modal) return;
  modal.classList.add("oculto");
}

async function reenviarEmailConfirmacao() {
  if (!ultimoEmailCadastro) {
    alert("Nao foi possivel identificar o email do cadastro mais recente.");
    return;
  }

  const status = document.getElementById("statusReenvioEmail");
  const botao = document.getElementById("btnReenviarConfirmacao");
  if (botao) botao.disabled = true;

  try {
    const sb = window.appSupabase.getSupabaseClient();
    const { error } = await sb.auth.resend({
      type: "signup",
      email: ultimoEmailCadastro
    });
    if (error) throw error;
    if (status) {
      status.textContent = "Email de confirmacao reenviado. Verifique sua caixa de entrada.";
      status.classList.remove("oculto");
    }
  } catch (error) {
    if (status) {
      status.textContent = `Falha ao reenviar: ${traduzirErroAuth(error)}`;
      status.classList.remove("oculto");
    } else {
      alert(`Falha ao reenviar: ${traduzirErroAuth(error)}`);
    }
  } finally {
    if (botao) botao.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    window.appSupabase.getSupabaseClient();
  } catch (error) {
    alert(`${error.message} Consulte SUPABASE_SETUP.md`);
    return;
  }

  document.getElementById("formLogin").addEventListener("submit", processarLogin);
  document.getElementById("formCadastro").addEventListener("submit", processarCadastro);
  document.getElementById("btnReenviarConfirmacao").addEventListener("click", reenviarEmailConfirmacao);
  document.getElementById("btnFecharModalCadastro").addEventListener("click", fecharModalCadastroSucesso);
  document.getElementById("modalCadastroSucesso").addEventListener("click", (event) => {
    if (event.target.id === "modalCadastroSucesso") {
      fecharModalCadastroSucesso();
    }
  });
});
