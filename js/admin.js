// Sesuaikan alamat ini jika port backend berbeda.
const API_BASE_URL = "http://localhost:8080";

const $ = (id) => document.getElementById(id);
const user = (() => {
  try { return JSON.parse(sessionStorage.getItem("exam_user") || "null"); }
  catch { return null; }
})();

function showNotice(message, type = "info") {
  const notice = $("notice");
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
}
function clearNotice() { $("notice").hidden = true; }
function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(date);
}
function safeText(value) { return String(value ?? ""); }

function initUser() {
  if (!user || user.id == null || !user.username) {
    window.location.href = "index.html";
    return false;
  }
  // UI-only role check. Backend currently does not implement protected admin endpoints.
  if (user.role !== "admin") {
    document.body.innerHTML = `<main style="font:16px Arial;padding:40px;color:#17334d"><h2>Akses dashboard admin ditolak</h2><p>Akun ini tidak memiliki role admin.</p><a href="index.html">Kembali ke login</a></main>`;
    return false;
  }
  $("header-username").textContent = user.username;
  $("welcome-username").textContent = user.username;
  $("user-avatar").textContent = user.username.trim().charAt(0).toUpperCase();
  $("today-date").textContent = formatDate(new Date());
  $("year").textContent = new Date().getFullYear();
  $("api-address").textContent = API_BASE_URL;
  return true;
}

async function loadQuestions(showSuccess = false) {
  $("question-count").textContent = "…";
  $("api-status").textContent = "Memeriksa";
  $("api-caption").textContent = "Menghubungi backend";
  $("api-dot").style.background = "#d4a64e";
  try {
    const response = await fetch(`${API_BASE_URL}/api/questions`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const questions = Array.isArray(payload.data) ? payload.data : [];
    $("question-count").textContent = questions.length;
    $("api-status").textContent = "Terhubung";
    $("api-caption").textContent = "Endpoint soal merespons";
    $("api-dot").style.background = "#54cba0";
    renderQuestions(questions);
    if (showSuccess) showNotice(`Data bank soal berhasil dimuat. Total ${questions.length} soal.`, "success");
    return questions;
  } catch (error) {
    console.error("Gagal mengambil soal:", error);
    $("question-count").textContent = "—";
    $("api-status").textContent = "Terputus";
    $("api-caption").textContent = "Tidak dapat mengambil data";
    $("api-dot").style.background = "#e36a62";
    $("questions-body").innerHTML = `<tr><td colspan="3" class="empty-cell">Data soal tidak dapat dimuat. Periksa backend, alamat API, dan CORS.</td></tr>`;
    $("question-summary").textContent = "Gagal memuat data";
    showNotice("Dashboard terbuka, tetapi endpoint soal belum bisa diakses. Pastikan backend Golang aktif dan CORS mengizinkan alamat frontend.", "error");
    return [];
  }
}

let cachedQuestions = [];
function renderQuestions(questions) {
  cachedQuestions = questions;
  filterQuestions();
}
function filterQuestions() {
  const term = $("question-search").value.trim().toLowerCase();
  const filtered = cachedQuestions.filter(q => safeText(q.question).toLowerCase().includes(term) || safeText(q.id).includes(term));
  $("question-summary").textContent = `${filtered.length} dari ${cachedQuestions.length} soal`;
  if (!filtered.length) {
    $("questions-body").innerHTML = `<tr><td colspan="3" class="empty-cell">Tidak ada soal yang cocok.</td></tr>`;
    return;
  }
  $("questions-body").innerHTML = filtered.map(q => {
    const options = [
      ["A", q.option_a], ["B", q.option_b], ["C", q.option_c], ["D", q.option_d]
    ].map(([letter, text]) => `<span class="option-pill">${letter}. ${escapeHtml(text)}</span>`).join("");
    return `<tr><td>#${escapeHtml(q.id)}</td><td>${escapeHtml(q.question)}</td><td><div class="option-pills">${options}</div></td></tr>`;
  }).join("");
}
function escapeHtml(value) {
  return safeText(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function showSection(section) {
  const valid = ["overview", "questions", "results"].includes(section) ? section : "overview";
  document.querySelectorAll(".content-section").forEach(el => { el.hidden = el.id !== `${valid}-section`; });
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.section === valid));
  const names = { overview:"Dashboard", questions:"Bank Soal", results:"Hasil Ujian" };
  $("breadcrumb-current").textContent = names[valid];
  $("sidebar").classList.remove("open");
  if (valid === "questions") loadQuestions();
}

async function fetchResult(event) {
  event.preventDefault();
  const id = $("result-user-id").value.trim();
  const output = $("result-output");
  if (!id || !/^[1-9]\d*$/.test(id)) {
    output.hidden = false; output.className = "result-output error"; output.textContent = "Masukkan ID pengguna berupa bilangan bulat positif."; return;
  }
  output.hidden = false; output.className = "result-output"; output.textContent = "Mengambil hasil ujian…";
  try {
    const response = await fetch(`${API_BASE_URL}/api/result/${encodeURIComponent(id)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const r = payload.data;
    if (!r) throw new Error("Format respons hasil tidak sesuai.");
    output.className = "result-output";
    output.innerHTML = `<div class="result-data">
      <div><small>Nilai</small><strong>${escapeHtml(r.score)}</strong></div>
      <div><small>Jawaban benar</small><strong>${escapeHtml(r.total_correct)}</strong></div>
      <div><small>Total soal dijawab</small><strong>${escapeHtml(r.total_question)}</strong></div>
    </div>`;
  } catch (error) {
    output.className = "result-output error";
    output.textContent = error.message === "result not found"
      ? "Hasil untuk ID pengguna tersebut belum tersedia."
      : `Tidak dapat mengambil hasil: ${error.message}`;
  }
}

function initNavigation() {
  document.querySelectorAll("[data-section]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.go));
  });
  $("refresh-questions").addEventListener("click", async () => {
    clearNotice();
    await loadQuestions(true);
  });
  $("question-search").addEventListener("input", filterQuestions);
  $("result-form").addEventListener("submit", fetchResult);
  $("menu-toggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  $("logout-button").addEventListener("click", () => {
    sessionStorage.removeItem("exam_user");
    window.location.href = "index.html";
  });
}

if (initUser()) {
  initNavigation();
  loadQuestions();
}
