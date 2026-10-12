Dashboard peserta Universitas Halu Oleo
Tambahkan dashboard-peserta.html, css/peserta.css, js/peserta.js, dan assets/logo-universitas-halu-oleo.png ke folder frontend aktif.
Pada js/login.js, setelah sesi exam_user disimpan, arahkan role admin ke dashboard-admin.html dan role user ke dashboard-peserta.html.
API default: http://localhost:8080. GET /api/questions dan GET /api/result/:user_id dipakai oleh dashboard.
PENTING: sebelum menguji submit jawaban, cocokkan payload di js/peserta.js dengan struktur request yang diharapkan handler backend.
