function validarUsuario(username) {
  return String(username || "").trim().length >= 3;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
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
    alert(`Falha no login: ${error.message}`);
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
    await window.appSupabase.salvarDadosApp({ eventos: [] });
    window.location.href = "index.html";
  } catch (error) {
    alert(`Falha no cadastro: ${error.message}`);
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
