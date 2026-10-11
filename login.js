(function () {
  "use strict";
  var h = PV.ui.h;
  function $(id) { return document.getElementById(id); }
  function show(el, msg) { el.textContent = msg; el.hidden = !msg; }

  function go(user) {
    var next = new URLSearchParams(location.search).get("next");
    // Only allow same-site page names as redirect targets.
    var safe = next && /^[a-z]+\.html$/.test(next) ? next : null;
    location.href = safe || PV.homeFor(user);
  }

  $("demoPw").textContent = PV.DEMO_PASSWORD;
  var demo = [["ama@student.test", "Student (female)"], ["kofi@student.test", "Student (male)"],
    ["esi@student.test", "SRC member"], ["management@pentvars.test", "School management"]];
  demo.forEach(function (d) {
    $("demoList").appendChild(h("div", { class: "list-row" },
      h("span", null, d[1], " ", h("small", null, d[0])),
      h("button", { class: "btn ghost small", type: "button", onclick: function () {
        $("loginEmail").value = d[0]; $("loginPassword").value = PV.DEMO_PASSWORD; $("loginPassword").focus();
      } }, "Fill in")));
  });

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = PV.login($("loginEmail").value, $("loginPassword").value);
    if (!u) { show($("loginError"), "Email or password is incorrect."); return; }
    go(u);
  });

  $("regForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var res = PV.register({
      name: $("regName").value, studentNumber: $("regId").value, email: $("regEmail").value,
      password: $("regPassword").value, gender: $("regGender").value,
      programme: $("regProgramme").value, level: $("regLevel").value
    });
    if (res.error) { show($("regError"), res.error); return; }
    PV.login(res.user.email, $("regPassword").value);
    location.href = "apply.html";
  });
})();
