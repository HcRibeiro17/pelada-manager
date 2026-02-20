const APP_AUTH_EMAIL_DOMAIN = "pelada-manager.app";

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
  const sb = getSupabaseClient();
  const { data, error } = await sb.auth.getUser();
  if (error) {
    return null;
  }
  return data.user || null;
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
}

async function carregarDadosApp() {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data, error } = await sb
    .from("app_user_data")
    .select("payload")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.payload) return { eventos: [] };
  if (!Array.isArray(data.payload.eventos)) return { eventos: [] };
  return data.payload;
}

async function salvarDadosApp(payload) {
  const sb = getSupabaseClient();
  const user = await obterUsuarioAtualAuth();
  if (!user) throw new Error("Usuario nao autenticado.");

  const dados = payload && typeof payload === "object" ? payload : {};
  if (!Array.isArray(dados.eventos)) dados.eventos = [];

  const { error } = await sb.from("app_user_data").upsert(
    {
      user_id: user.id,
      payload: dados
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
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
  carregarDadosApp,
  salvarDadosApp
};
