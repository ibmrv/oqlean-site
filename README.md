<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OQlean</title>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">

<style>
body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: #0a0a0a;
    color: white;
}

/* NAV */
.nav {
    position: fixed;
    width: 100%;
    background: #000;
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    z-index: 1000;
}

.nav a {
    color: white;
    margin: 0 10px;
    cursor: pointer;
    text-decoration: none;
}

/* PAGE */
.page {
    display: none;
    padding: 100px 20px;
    max-width: 1100px;
    margin: auto;
}

.active {
    display: block;
}

/* HERO */
.hero {
    height: 100vh;
    background: url('https://images.unsplash.com/photo-1581578731548-c64695cc6952') center/cover;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

/* BUTTON */
.btn {
    padding: 15px 25px;
    background: white;
    color: black;
    border-radius: 10px;
    margin: 10px;
    text-decoration: none;
}

/* CARDS */
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.card {
    background: #141414;
    padding: 20px;
    border-radius: 15px;
    cursor: pointer;
}

/* DETAIL */
.detail {
    margin-top: 20px;
    display: none;
    color: #ccc;
}
</style>
</head>

<body>

<!-- NAV -->
<div class="nav">
<div><b>OQlean</b></div>
<div>
<a onclick="showPage('home')">Главная</a>
<a onclick="showPage('services')">Услуги</a>
<a onclick="showPage('prices')">Цены</a>
<a onclick="showPage('contacts')">Контакты</a>
</div>
</div>

<!-- HOME -->
<div id="home" class="page active">
<div class="hero">
<h1>OQlean</h1>
<p>Премиальная уборка в Ташкенте</p>
<h2>от 550 000 сум</h2>
<a class="btn" href="https://wa.me/998507572314">Заказать</a>
</div>
</div>

<!-- SERVICES -->
<div id="services" class="page">
<h2>Услуги</h2>

<div class="cards">

<div class="card" onclick="toggleDetail(this)">
<b>Поддерживающая уборка</b>
<div class="detail">Включает все поверхности, полы, кухню и санузел</div>
</div>

<div class="card" onclick="toggleDetail(this)">
<b>Генеральная уборка</b>
<div class="detail">Полная глубокая очистка помещения</div>
</div>

<div class="card" onclick="toggleDetail(this)">
<b>После ремонта</b>
<div class="detail">Удаление строительной пыли и грязи</div>
</div>

</div>

</div>

<!-- PRICES -->
<div id="prices" class="page">
<h2>Цены</h2>
<p>До 60 м² — фиксированная цена</p>
<p>Более 60 м² — индивидуально</p>
<h3>от 550 000 сум</h3>
</div>

<!-- CONTACTS -->
<div id="contacts" class="page">
<h2>Контакты</h2>
<p>📞 +998 50 757 23 14</p>

<a class="btn" href="https://wa.me/998507572314">WhatsApp</a>

<br><br>

<a href="#">Instagram</a> | 
<a href="#">Telegram</a>
</div>

<script>
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleDetail(el) {
    let d = el.querySelector('.detail');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}
</script>

</body>
</html>
