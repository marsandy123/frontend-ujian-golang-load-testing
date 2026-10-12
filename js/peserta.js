// ============================================================
// KONFIGURASI API DAN VARIABEL GLOBAL
// ============================================================

const API_BASE_URL = "http://localhost:8080";

const $ = (id) => document.getElementById(id);

let user = null;
let questions = [];
let answers = {};
let isSubmitting = false;


// ============================================================
// MEMBACA SESI PENGGUNA
// ============================================================

try {
    user = JSON.parse(
        sessionStorage.getItem("exam_user") || "null"
    );
} catch (error) {
    console.error("Gagal membaca sesi pengguna:", error);
}


// ============================================================
// UTILITAS
// ============================================================

function escapeHtml(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        return entities[character];
    });
}


function showNotice(elementId, message, type = "info") {
    const element = $(elementId);

    if (!element) {
        console.error(`Elemen dengan ID "${elementId}" tidak ditemukan.`);
        return;
    }

    element.textContent = message;
    element.className = "notice " + type;
    element.hidden = false;
}


// ============================================================
// INISIALISASI AKUN PESERTA
// ============================================================

function initializeUser() {
    if (!user || user.id == null || !user.username) {
        window.location.href = "index.html";
        return false;
    }

    if (user.role !== "user") {
        document.body.innerHTML = `
            <main style="padding: 40px; font-family: Arial, sans-serif;">
                <h2>Halaman khusus peserta</h2>
                <p>Akun ini bukan akun peserta.</p>
                <a href="index.html">Kembali ke halaman login</a>
            </main>
        `;

        return false;
    }

    $("username").textContent = user.username;
    $("welcome").textContent = user.username;
    $("year").textContent = new Date().getFullYear();

    $("date").textContent = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());

    return true;
}


// ============================================================
// MENGAMBIL SOAL DARI REST API
// ============================================================

async function loadQuestions() {
    $("count").textContent = "...";
    $("api").textContent = "Memeriksa";
    $("api-note").textContent = "Menghubungi backend";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/questions`
        );

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(
                responseData.error || `HTTP ${response.status}`
            );
        }

        questions = Array.isArray(responseData.data)
            ? responseData.data
            : [];

        $("count").textContent = questions.length;
        $("api").textContent = "Terhubung";
        $("api-note").textContent = "Endpoint soal merespons";

        renderQuestions();

    } catch (error) {
        console.error("Gagal mengambil soal:", error);

        $("count").textContent = "—";
        $("api").textContent = "Terputus";
        $("api-note").textContent = "Periksa server API";

        $("questions").innerHTML = `
            <article class="panel">
                Soal tidak dapat dimuat.
                Periksa backend Golang dan konfigurasi CORS.
            </article>
        `;

        showNotice(
            "notice",
            "Tidak dapat mengambil soal dari API. Pastikan backend Golang berjalan.",
            "error"
        );
    }
}


// ============================================================
// MENAMPILKAN SOAL DAN PILIHAN JAWABAN
// ============================================================

function renderQuestions() {
    const questionContainer = $("questions");

    if (questions.length === 0) {
        questionContainer.innerHTML = `
            <article class="panel">
                Belum ada soal yang tersedia.
            </article>
        `;

        updateProgress();
        return;
    }

    questionContainer.innerHTML = questions.map((question, index) => {
        const options = [
            ["A", question.option_a],
            ["B", question.option_b],
            ["C", question.option_c],
            ["D", question.option_d]
        ];

        return `
            <article class="panel question-card">
                <div class="qhead">
                    <span class="qnum">${index + 1}</span>
                    <span>${escapeHtml(question.question)}</span>
                </div>

                <div class="options">
                    ${options.map(([letter, text]) => `
                        <label class="option">
                            <input
                                type="radio"
                                name="question-${escapeHtml(question.id)}"
                                value="${letter}"
                                data-id="${escapeHtml(question.id)}"
                                ${answers[question.id] === letter ? "checked" : ""}
                            >

                            <span>
                                <b>${letter}.</b>
                                ${escapeHtml(text)}
                            </span>
                        </label>
                    `).join("")}
                </div>
            </article>
        `;
    }).join("");

    document.querySelectorAll(".option input").forEach((input) => {
        input.addEventListener("change", () => {
            answers[input.dataset.id] = input.value;
            updateProgress();
        });
    });

    updateProgress();
}


// ============================================================
// MEMPERBARUI PROGRES JAWABAN
// ============================================================

function updateProgress() {
    const answeredCount = questions.filter((question) => {
        return Boolean(answers[String(question.id)]);
    }).length;

    const totalQuestions = questions.length;

    $("progress-title").textContent =
        `Terjawab ${answeredCount} dari ${totalQuestions} soal`;

    $("progress-text").textContent = totalQuestions > 0
        ? `${Math.round((answeredCount / totalQuestions) * 100)}% terisi`
        : "Tidak ada soal";

    $("fill").style.width = totalQuestions > 0
        ? `${(answeredCount / totalQuestions) * 100}%`
        : "0%";
}


// ============================================================
// NAVIGASI ANTARHALAMAN
// ============================================================

function showPage(pageName) {
    const pages = {
        dashboard: "dashboard-page",
        exam: "exam-page",
        result: "result-page"
    };

    if (!pages[pageName]) {
        pageName = "dashboard";
    }

    Object.values(pages).forEach((elementId) => {
        $(elementId).hidden = true;
    });

    $(pages[pageName]).hidden = false;

    document.querySelectorAll("[data-page]").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    const pageTitles = {
        dashboard: "Dashboard",
        exam: "Daftar Soal",
        result: "Hasil Ujian"
    };

    $("crumb").textContent = pageTitles[pageName];
    $("sidebar").classList.remove("open");

    if (pageName === "exam" && questions.length === 0) {
        loadQuestions();
    }

    if (pageName === "result") {
        loadResult("result-output");
    }
}


// ============================================================
// MENAMPILKAN RINGKASAN HASIL UJIAN
// ============================================================

function renderResult(result) {
    return `
        <div class="result-grid">
            <div>
                <small>Nilai</small>
                <strong>${escapeHtml(result.score)}</strong>
            </div>

            <div>
                <small>Jawaban benar</small>
                <strong>${escapeHtml(result.total_correct)}</strong>
            </div>

            <div>
                <small>Total soal</small>
                <strong>${escapeHtml(result.total_question)}</strong>
            </div>
        </div>
    `;
}


// ============================================================
// MENGAMBIL HASIL UJIAN DARI API
// ============================================================

async function loadResult(elementId) {
    const output = $(elementId);

    output.hidden = false;
    output.textContent = "Memeriksa hasil ujian...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/result/${encodeURIComponent(user.id)}`
        );

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(
                responseData.error || `HTTP ${response.status}`
            );
        }

        if (!responseData.data) {
            throw new Error("Data hasil ujian belum tersedia.");
        }

        output.innerHTML = renderResult(responseData.data);

    } catch (error) {
        console.error("Gagal mengambil hasil ujian:", error);

        output.textContent =
            "Hasil ujian belum tersedia atau belum dapat diakses. " +
            "Selesaikan ujian terlebih dahulu jika belum dikirim.";
    }
}


// ============================================================
// MENGIRIM JAWABAN KE BACKEND GOLANG
// ============================================================

async function submitAnswers() {
    if (isSubmitting) {
        return;
    }

    if (questions.length === 0) {
        showNotice(
            "send-notice",
            "Soal belum tersedia. Muat ulang halaman dan coba lagi.",
            "error"
        );

        return;
    }

    const unansweredQuestions = questions.filter((question) => {
        return !answers[String(question.id)];
    });

    if (unansweredQuestions.length > 0) {
        showNotice(
            "send-notice",
            `Masih ada ${unansweredQuestions.length} soal yang belum dijawab.`,
            "error"
        );

        return;
    }

    const method = $("method").value;

    const endpoint = method === "concurrent"
        ? "/api/submit/concurrent"
        : "/api/submit/sequential";

    /*
     * Backend mengharapkan answers bertipe map[string]string.
     * Karena itu, answers dikirim sebagai objek:
     * {
     *   "1": "A",
     *   "2": "B"
     * }
     *
     * Pastikan field user_id dan format key ID soal cocok
     * dengan submitRequest pada kode backend Golang.
     */

    const answerMap = {};

    questions.forEach((question) => {
        answerMap[String(question.id)] = answers[String(question.id)];
    });

    const payload = {
        user_id: user.id,
        answers: answerMap
    };

    console.log("Endpoint pengiriman:", endpoint);
    console.log("Payload pengiriman:", payload);

    isSubmitting = true;
    $("send").disabled = true;
    $("send").textContent = "Mengirim...";

    try {
        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        let responseData = {};

        try {
            responseData = await response.json();
        } catch {
            // Respons server tidak berisi JSON.
        }

        if (!response.ok) {
            throw new Error(
                responseData.error ||
                responseData.message ||
                `HTTP ${response.status}`
            );
        }

        $("exam-status").textContent = "Terkirim";

        showNotice(
            "send-notice",
            "Jawaban berhasil dikirim ke server.",
            "success"
        );

        showPage("dashboard");

        await loadResult("latest");

    } catch (error) {
        console.error("Gagal mengirim jawaban:", error);

        showNotice(
            "send-notice",
            `Pengiriman gagal: ${error.message}`,
            "error"
        );

    } finally {
        isSubmitting = false;
        $("send").disabled = false;
        $("send").textContent = "Kirim jawaban";
    }
}


// ============================================================
// MENGHUBUNGKAN EVENT TOMBOL
// ============================================================

function initializeNavigation() {
    document.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });
    });

    $("start").addEventListener("click", () => {
        showPage("exam");
    });

    document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => {
            showPage("dashboard");
        });
    });

    $("check").addEventListener("click", () => {
        loadResult("latest");
    });

    $("load-result").addEventListener("click", () => {
        loadResult("result-output");
    });

    $("send").addEventListener("click", submitAnswers);

    $("menu").addEventListener("click", () => {
        $("sidebar").classList.toggle("open");
    });

    $("logout").addEventListener("click", () => {
        sessionStorage.removeItem("exam_user");
        window.location.href = "index.html";
    });
}


// ============================================================
// MENJALANKAN DASHBOARD PESERTA
// ============================================================

if (initializeUser()) {
    initializeNavigation();
    loadQuestions();
}
