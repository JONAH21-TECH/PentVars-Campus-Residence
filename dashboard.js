(function () {
  "use strict";
  var h = PV.ui.h, ui = PV.ui;
  var user = ui.guard(["STUDENT", "SRC_MEMBER"]);
  if (!user) { return; }
  var root = document.getElementById("root");
  document.getElementById("title").textContent = "Hello, " + user.name.split(" ")[0];

  var app = PV.appFor(user.id);
  var cur = PV.currentAssignment(user.id);
  var grid = h("div", { class: "grid2" });

  // Application status
  var a = h("section", { class: "card" }, h("h3", null, "Application"));
  if (!app) {
    a.appendChild(h("p", null, "You have not applied yet."));
    a.appendChild(h("a", { class: "btn", href: "apply.html" }, "Start application"));
  } else {
    a.appendChild(h("p", null, ui.badge(app.status === "SUBMITTED" ? "Awaiting verification" : app.status === "APPROVED" ? "Verified" : "Rejected", ui.statusKind(app.status))));
    if (app.status === "REJECTED") { a.appendChild(h("p", { class: "muted" }, app.rejectedReason || "")); }
    a.appendChild(h("a", { class: "btn ghost small", href: "apply.html" }, app.status === "REJECTED" ? "Apply again" : "View details"));
  }
  grid.appendChild(a);

  // Room
  var r = h("section", { class: "card" }, h("h3", null, "My room"));
  if (cur) {
    var info = PV.roomInfo(cur.roomId);
    r.appendChild(h("p", null, h("b", null, info.label), info.exec ? " (executive wing)" : ""));
    r.appendChild(h("p", { class: "muted" }, PV.floorLabel(info.floor) + " · " + info.wing.toLowerCase() + " wing · assigned " + ui.fdate(cur.dateAssigned)));
    r.appendChild(h("h4", null, "Roommates"));
    var mates = PV.occupants(cur.roomId).filter(function (u) { return u.id !== user.id; });
    if (mates.length) {
      mates.forEach(function (m) {
        r.appendChild(h("div", { class: "list-row" }, h("span", null, m.name), h("small", null, m.programme + ", level " + m.level)));
      });
    } else { r.appendChild(ui.empty("No roommates yet.")); }
    r.appendChild(h("a", { class: "btn ghost small", href: "rooms.html" }, "Request a room switch"));
  } else if (PV.canSelectRoom(user)) {
    r.appendChild(h("p", null, "You are verified but have no room yet."));
    r.appendChild(h("a", { class: "btn", href: "rooms.html" }, "Choose a room"));
  } else {
    r.appendChild(h("p", { class: "muted" }, "Room selection unlocks once you are verified."));
  }
  grid.appendChild(r);
  root.appendChild(grid);

  // Switch requests
  var sw = PV.db().switches.filter(function (s) { return s.userId === user.id; });
  if (sw.length) {
    var sc = h("section", { class: "card", style: "margin-top:16px" }, h("h3", null, "Room switch requests"));
    sc.appendChild(ui.table(["Requested", "Reason", "Status"], sw.map(function (s) {
      return [PV.roomInfo(s.requestedRoomId).label, s.reason, ui.badge(s.status, ui.statusKind(s.status))];
    })));
    root.appendChild(sc);
  }

  // Fees
  var fees = PV.feesFor(user.id);
  var fc = h("section", { class: "card", style: "margin-top:16px" }, h("h3", null, "Fees and charges"));
  var owed = PV.owed(user.id);
  fc.appendChild(h("div", { class: owed > 0 ? "banner bad" : "banner ok" }, owed > 0 ? "Outstanding balance: " + ui.money(owed) : "You owe nothing."));
  if (fees.length) {
    fc.appendChild(ui.table(["Date", "Description", "Amount", "Status"], fees.map(function (f) {
      return [ui.fdate(f.createdAt), f.note || f.type, ui.money(f.amount), ui.badge(f.status, ui.statusKind(f.status))];
    })));
  } else { fc.appendChild(ui.empty("No fees yet.")); }
  root.appendChild(fc);
})();
