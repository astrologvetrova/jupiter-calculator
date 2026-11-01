
import {
  SwissEphemeris,
  Planet,
  HouseSystem
} from "@swisseph/browser";

const app = document.querySelector("#app");

app.innerHTML = `
<style>
* { box-sizing:border-box; }
body {
  margin:0; background:#f7f4ef;
  font-family:Arial,sans-serif; color:#38332e;
}
.wrap { max-width:560px; margin:25px auto; padding:18px; }
.panel {
  background:#fff; padding:25px;
  border-radius:18px; box-shadow:0 5px 25px #0000000b;
}
h1 { text-align:center; font-size:27px; font-weight:400; }
.sub { text-align:center; color:#888; line-height:1.5; }
.tabs { display:flex; gap:8px; margin:24px 0; }
.tabs button {
  flex:1; padding:13px 5px; border:1px solid #ddd;
  border-radius:9px; background:white; color:#555;
}
.tabs button.active { background:#665b50; color:white; }
label { display:block; margin:16px 0 7px; font-size:14px; }
input {
  width:100%; padding:13px; border:1px solid #ddd;
  border-radius:9px; font-size:16px; background:white;
}
.primary {
  width:100%; padding:16px; margin-top:22px;
  border:0; border-radius:9px; background:#665b50;
  color:white; font-size:16px;
}
#result {
  display:none; margin-top:22px; padding:20px;
  background:#f5f0e9; border-radius:12px; text-align:center;
}
.number { font-size:45px; margin:12px; color:#665b50; }
#status { color:#887d70; font-size:13px; margin-top:12px; }
#cities {
  background:white; border:1px solid #ddd;
  border-radius:8px; position:relative; z-index:2;
}
.city { padding:12px; border-bottom:1px solid #eee; }
.city:active { background:#eee; }
.note { color:#888; font-size:12px; line-height:1.5; margin-top:20px; }
</style>

<div class="wrap">
<div class="panel">
<h1>♃ Где твой Юпитер?</h1>
<p class="sub">Узнай, в какой сфере жизни находятся твои возможности для роста и развития</p>

<div class="tabs">
<button id="natal" class="active">Натальный</button>
<button id="transit">Транзитный</button>
</div>

<label>Дата рождения</label>
<input id="birthDate" type="date">

<label>Время рождения</label>
<input id="birthTime" type="time">

<label>Город рождения</label>
<input id="city" placeholder="Например, Москва">
<div id="cities"></div>

<div id="transitField" style="display:none">
<label>Дата транзита</label>
<input id="transitDate" type="date">
</div>

<button class="primary" id="calculate">Узнать положение Юпитера</button>
<div id="status"></div>

<div id="result">
<p id="resultTitle">Твой Юпитер</p>
<div class="number" id="houseNumber"></div>
<strong id="houseName"></strong>
<p id="resultText"></p>
</div>

<p class="note">
Расчёт выполняется в тропическом зодиаке по системе домов Плацидуса.
Для точного результата необходимо знать время рождения.
Астрологическая интерпретация носит информационно-развлекательный характер.
</p>
</div>
</div>
`;

const descriptions = [
"Личность, самостоятельность, инициатива и новые начинания.",
"Личные доходы, материальные ресурсы, ценности и заработок.",
"Общение, обучение, информация, поездки и контакты.",
"Дом, семья, недвижимость, род и внутреннее благополучие.",
"Творчество, любовь, дети, увлечения и самовыражение.",
"Работа, повседневные обязанности, навыки и организация жизни.",
"Партнёрство, брак, сотрудничество и деловые союзы.",
"Общие финансы, инвестиции, кредиты и трансформация.",
"Путешествия, высшее образование, мировоззрение и расширение горизонтов.",
"Карьера, профессия, статус, достижения и общественное признание.",
"Друзья, единомышленники, аудитория, проекты и долгосрочные планы.",
"Внутренний мир, уединение, завершение циклов и скрытые ресурсы."
];

let mode = "natal";
let selectedCity = null;
let sweInstance = null;

const $ = id => document.getElementById(id);

$("natal").onclick = () => setMode("natal");
$("transit").onclick = () => setMode("transit");

function setMode(value) {
  mode = value;
  $("natal").classList.toggle("active", value === "natal");
  $("transit").classList.toggle("active", value === "transit");
  $("transitField").style.display =
    value === "transit" ? "block" : "none";
  $("result").style.display = "none";
}

$("transitDate").value =
  new Date().toISOString().slice(0, 10);

let searchTimer;

$("city").addEventListener("input", () => {
  clearTimeout(searchTimer);
  selectedCity = null;
  const query = $("city").value.trim();

  if (query.length < 2) {
    $("cities").innerHTML = "";
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(query) +
        "&count=6&language=ru&format=json";

      const response = await fetch(url);
      const data = await response.json();

      $("cities").innerHTML = "";

      (data.results || []).forEach(place => {
        const item = document.createElement("div");
        item.className = "city";
        item.textContent =
          [place.name, place.admin1, place.country]
            .filter(Boolean).join(", ");

        item.onclick = () => {
          selectedCity = place;
          $("city").value = item.textContent;
          $("cities").innerHTML = "";
        };

        $("cities").appendChild(item);
      });
    } catch {
      $("status").textContent =
        "Не удалось найти город. Проверь подключение к интернету.";
    }
  }, 400);
});

function localTimeToUTC(date, time, timezone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter(p => p.type !== "literal")
        .map(p => [p.type, Number(p.value)])
    );

    const represented = Date.UTC(
      parts.year, parts.month - 1, parts.day,
      parts.hour, parts.minute, parts.second
    );

    const difference = desired - represented;
    guess += difference;

    if (difference === 0) break;
  }

  return new Date(guess);
}

function findHouse(longitude, cusps) {
  const norm = x => ((x % 360) + 360) % 360;

  for (let i = 1; i <= 12; i++) {
    const start = norm(cusps[i]);
    const end = norm(cusps[i === 12 ? 1 : i + 1]);
    const position = norm(longitude);

    const arc = norm(end - start);
    const distance = norm(position - start);

    if (distance < arc || arc === 0) return i;
  }

  throw new Error("Не удалось определить дом Юпитера.");
}

$("calculate").onclick = async () => {
  $("result").style.display = "none";
  $("status").textContent = "Выполняется расчёт...";

  try {
    if (!selectedCity) {
      throw new Error("Выбери город из предложенного списка.");
    }

    const date = $("birthDate").value;
    const time = $("birthTime").value;

    if (!date || !time) {
      throw new Error("Укажи дату и точное время рождения.");
    }

    if (!selectedCity.timezone) {
      throw new Error("Не удалось определить часовой пояс города.");
    }

    const birthUTC = localTimeToUTC(
      date, time, selectedCity.timezone
    );

    const transitUTC = localTimeToUTC(
      $("transitDate").value,
      "12:00",
      selectedCity.timezone
    );

    if (!sweInstance) {
      sweInstance = new SwissEphemeris();
      await sweInstance.init();
    }

    const birthJD =
      sweInstance.dateToJulianDay(birthUTC);

    const houses = sweInstance.calculateHouses(
      birthJD,
      selectedCity.latitude,
      selectedCity.longitude,
      HouseSystem.Placidus
    );

    const planetDate =
      mode === "natal" ? birthUTC : transitUTC;

    const planetJD =
      sweInstance.dateToJulianDay(planetDate);

    const jupiter = sweInstance.calculatePosition(
      planetJD,
      Planet.Jupiter
    );

    const house = findHouse(
      jupiter.longitude,
      houses.cusps
    );

    $("resultTitle").textContent =
      mode === "natal"
        ? "Твой натальный Юпитер находится в"
        : "Транзитный Юпитер проходит по";

    $("houseNumber").textContent =
      house + " дом";

    $("houseName").textContent =
      "Сфера жизни: " + house + " дом";

    $("resultText").textContent =
      descriptions[house - 1];

    $("result").style.display = "block";
    $("status").textContent = "";
  } catch (error) {
    $("status").textContent =
      error.message || "Ошибка расчёта. Попробуй ещё раз.";
  }
};
