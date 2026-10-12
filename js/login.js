/*
 * Login frontend EDU TEST.
 * API yang digunakan: POST http://localhost:8080/api/login
 * Request:  { "username": "...", "password": "..." }
 * Success:  { "message": "Login berhasil", "user": { "id": 1, "username": "...", "role": "user" } }
 *
 * Jika alamat/port backend berubah, ubah API_BASE_URL di bawah.
 */
const API_BASE_URL = "http://localhost:8080";

const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember-username");
const submitButton = document.getElementById("submit-button");
const formMessage = document.getElementById("form-message");
const togglePasswordButton = document.getElementById("toggle-password");

document.getElementById("current-year").textContent = new Date().getFullYear();

function showMessage(message, type = "info") {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.hidden = true;
  formMessage.className = "form-message";
}

function setFieldError(field, message) {
  const errorElement = document.getElementById(`${field}-error`);
  if (errorElement) errorElement.textContent = message;
  const input = document.getElementById(field);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  let valid = true;

  setFieldError("username", "");
  setFieldError("password", "");

  if (!username) {
    setFieldError("username", "Username wajib diisi.");
    valid = false;
  } else if (username.length > 50) {
    setFieldError("username", "Username maksimal 50 karakter.");
    valid = false;
  }

  if (!password) {
    setFieldError("password", "Kata sandi wajib diisi.");
    valid = false;
  }

  if (!valid) {
    showMessage("Periksa kembali kolom yang ditandai sebelum masuk.", "error");
  }
  return valid;
}

function saveUsernamePreference(username) {
  if (rememberInput.checked) {
    localStorage.setItem("exam_remembered_username", username);
  } else {
    localStorage.removeItem("exam_remembered_username");
  }
}

function loadUsernamePreference() {
  const remembered = localStorage.getItem("exam_remembered_username");
  if (remembered) {
    usernameInput.value = remembered;
    rememberInput.checked = true;
    passwordInput.focus();
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  const label = submitButton.querySelector(".button-label");
  label.textContent = isLoading ? "Memeriksa akun..." : "Masuk ke sistem";
  submitButton.querySelector(".button-arrow").textContent = isLoading ? "…" : "→";
}

togglePasswordButton.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordButton.textContent = isPassword ? "Sembunyikan" : "Lihat";
  togglePasswordButton.setAttribute("aria-pressed", String(isPassword));
  togglePasswordButton.setAttribute(
    "aria-label",
    isPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
  );
});

usernameInput.addEventListener("input", () => {
  setFieldError("username", "");
  clearMessage();
});
passwordInput.addEventListener("input", () => {
  setFieldError("password", "");
  clearMessage();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (!validateForm()) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      // Server mungkin mengembalikan respons non-JSON saat terjadi error.
    }

    if (!response.ok) {
      if (response.status === 401) {
        showMessage(data.error || "Username atau kata sandi salah.", "error");
      } else if (response.status === 400) {
        showMessage("Data login belum lengkap atau formatnya tidak sesuai.", "error");
      } else {
        showMessage(data.error || `Login gagal (HTTP ${response.status}). Periksa server API.`, "error");
      }
      return;
    }

    if (!data.user || data.user.id == null) {
      showMessage("Login merespons sukses, tetapi data pengguna tidak sesuai format yang diharapkan.", "error");
      return;
    }

    saveUsernamePreference(username);

    // Backend saat ini tidak mengembalikan JWT. Simpan hanya informasi pengguna
    // untuk dipakai oleh halaman berikutnya; jangan simpan kata sandi.
    sessionStorage.setItem("exam_user", JSON.stringify({
      id: data.user.id,
      username: data.user.username,
      role: data.user.role
    }));

    
showMessage(
  `Login berhasil. Selamat datang, ${data.user.username}.`,
  "success"
);

if (data.user.role === "admin") {
  window.location.href = "dashboard-admin.html";
} else if (data.user.role === "user") {
  window.location.href = "dashboard-peserta.html";
} else {
  showMessage("Role pengguna tidak dikenali.", "error");
}

  } catch (error) {
    console.error("Login API error:", error);
    showMessage(
      "Tidak dapat terhubung ke server API. Pastikan backend Golang berjalan di http://localhost:8080 dan konfigurasi CORS sudah ditambahkan.",
      "error"
    );
  } finally {
    setLoading(false);
  }
});

loadUsernamePreference();
