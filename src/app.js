const supabase = window.supabaseClient;

async function verificarAcesso() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("appContent").style.display = "block";
}

verificarAcesso();