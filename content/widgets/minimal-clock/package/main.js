/** Local time, updated at the next second boundary without host permissions. */
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");
const pad = (value) => String(value).padStart(2, "0");

function render() {
  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  hourHand.style.transform = `rotate(${hours * 30}deg)`;
  minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
  secondHand.style.transform = `rotate(${seconds * 6}deg)`;
  dateEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
  timeEl.dateTime = now.toISOString();
  timeEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(seconds)}`;
  setTimeout(render, 1000 - now.getMilliseconds());
}
render();
