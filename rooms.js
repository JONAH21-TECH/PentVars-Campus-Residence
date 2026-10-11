(function () {
  "use strict";
  var h = PV.ui.h, ui = PV.ui;
  var user = ui.guard(["STUDENT", "SRC_MEMBER", "HALL_REP"]);
  if (!user) { return; }
  var root = document.getElementById("root");
  var sub = document.getElementById("sub");
  var hallId = user.hallId || null;
  var floor = null;
  var picked = null;

  if (!user.hallId) {
    var app0 = PV.appFor(user.id);
    root.appendChild(h("section", { class: "card" }, h("h2", null, "Apply first"),
      h("p", null, "You need an approved application before you can choose a room."),
      h("a", { class: "btn", href: "apply.html" }, "Go to application")));
    return;
  }

  function defaultFloor(hall) {
    var cands = hall.floors.filter(function (f) { return !f.vacant && (!f.g || f.g === user.gender); });
    return (cands[0] || hall.floors[0]).n;
  }

  function render() {
    user = PV.me();
    ui.clear(root);
    var hall = PV.hallById(hallId);
    if (floor === null) { floor = defaultFloor(hall); }
    var cur = PV.currentAssignment(user.id);
    var unlocked = PV.canSelectRoom(user);
    sub.textContent = cur ? "You are in " + PV.roomInfo(cur.roomId).label + ". Pick another room to request a switch."
      : unlocked ? "Pick your room." : "Browse rooms. Selection unlocks once you are verified.";

    var card = h("section", { class: "card" });
    card.appendChild(h("h2", null, hall.name));
    if (!unlocked) {
      card.appendChild(h("div", { class: "banner" }, "Room selection is locked until your application is verified."));
    }

    var tabs = h("div", { class: "floor-tabs" });
    hall.floors.forEach(function (f) {
      var label = PV.floorLabel(f.n) + (f.vacant ? " (vacant)" : f.g ? (f.g === "F" ? " · Ladies" : " · Boys") : "");
      tabs.appendChild(h("button", { type: "button", class: f.n === floor ? "active" : "", disabled: f.vacant,
        onclick: function () { floor = f.n; picked = null; render(); } }, label));
    });
    card.appendChild(tabs);

    card.appendChild(h("div", { class: "legend" },
      h("span", null, h("i", { style: "border-color:#9fd6b5;background:#f1fbf5" }), "Empty"),
      h("span", null, h("i", { style: "border-color:#f1d18a;background:#fff9e8" }), "Space left"),
      h("span", null, h("i", { style: "border-color:#d4d8e2;background:#f0f1f4" }), "Full"),
      h("span", null, h("i", { style: "border-color:#c9d7f5;background:#fff" }), "Executive room")));

    var rooms = PV.roomsOnFloor(hallId, floor);
    var wings = h("div", { class: "wings" });
    ["LEFT", "RIGHT"].forEach(function (w) {
      var g = h("div", { class: "room-grid" });
      rooms.filter(function (r) { return r.wing === w; }).forEach(function (r) {
        var occ = PV.occupants(r.id).length;
        var problem = PV.roomProblem(user, r.id);
        var mine = cur && cur.roomId === r.id;
        var cls = "room " + (occ >= r.cap ? "full" : occ > 0 ? "part" : "free") + (r.exec ? " exec" : "") +
          (problem && !mine && occ < r.cap ? " blocked" : "") + (picked === r.id ? " picked" : "");
        g.appendChild(h("button", { type: "button", class: cls, title: mine ? "Your room" : problem || "Available",
          "aria-label": "Room " + r.code + ", " + occ + " of " + r.cap + (mine ? ", your room" : ""),
          disabled: !!problem && !mine,
          onclick: function () { picked = r.id; render(); } },
          r.code, h("small", null, mine ? "You" : occ + "/" + r.cap)));
      });
      wings.appendChild(h("div", { class: "wing" }, h("h4", null, w === "LEFT" ? "Left wing" : "Right wing"), g));
    });
    card.appendChild(wings);
    root.appendChild(card);

    // Action panel
    if (picked) {
      var info = PV.roomInfo(picked);
      var panel = h("section", { class: "card", style: "margin-top:16px" }, h("h3", null, info.label));
      var occs = PV.occupants(picked);
      panel.appendChild(h("p", { class: "muted" }, info.exec ? "Executive room, up to " + info.cap + " occupants." : "Up to " + info.cap + " occupants."));
      if (occs.length) {
        panel.appendChild(h("p", null, "Current occupants: " + occs.map(function (o) { return o.name; }).join(", ")));
      }
      var err = h("p", { class: "error", hidden: true });
      if (!cur) {
        panel.appendChild(h("button", { class: "btn", type: "button", disabled: !unlocked, onclick: function () {
          var res = PV.assignRoom(user, picked);
          if (res.error) { err.textContent = res.error; err.hidden = false; return; }
          ui.toast("Room assigned"); picked = null; render();
        } }, "Take this room"));
      } else {
        var reason = h("textarea", { rows: "2", placeholder: "Why do you want to switch?" });
        panel.appendChild(h("label", null, "Reason for switch", reason));
        panel.appendChild(h("button", { class: "btn", type: "button", onclick: function () {
          var res = PV.requestSwitch(user, picked, reason.value);
          if (res.error) { err.textContent = res.error; err.hidden = false; return; }
          ui.toast("Switch request sent to hall representatives"); picked = null; render();
        } }, "Request switch"));
        panel.appendChild(h("p", { class: "muted" }, "Hall representatives review switch requests. No re-verification is needed."));
      }
      panel.appendChild(err);
      root.appendChild(panel);
    }
  }
  render();
})();
