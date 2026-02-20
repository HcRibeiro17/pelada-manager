function validarUsuario(username) {
  return String(username || "").trim().length >= 3;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function traduzirErroAuth(error) {
  const msg = String(error?.message || "").toLowerCase();

  if (msg.includes("email not confirmed")) {
    return "Email ainda nao confirmado. No Supabase, desative 'Confirm email' em Authentication > Providers > Email para ambiente de teste.";
  }

  if (msg.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
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

  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;

  if (!validarEmail(email)) {
    alert("Email invalido.");
    return;
  }

  try {
    await window.appSupabase.loginComEmailSenha(email, senha);
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
    await window.appSupabase.loginComEmailSenha(email, senha);
    try {
      await window.appSupabase.salvarDadosApp({ eventos: [] });
    } catch (_error) {
      // Nao bloqueia o login por erro de inicializacao de dados.
    }
    window.location.href = "index.html";
  } catch (error) {
    alert(`Falha no cadastro: ${traduzirErroAuth(error)}`);
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
});
