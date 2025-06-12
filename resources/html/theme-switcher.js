window.onload = function () {
  let currentHour = new Date().getHours();
  let themeLink = document.getElementById("theme-style");

  // 判断当前时间是否在 18:00 - 06:00 之间
  if (currentHour >= 20 || currentHour < 6) {
    themeLink.href = "../../../plugins/jiandan-plugin/resources/html/help-dark.css";
  } else {
    themeLink.href = "../../../plugins/jiandan-plugin/resources/html/help-light.css";
  }
};