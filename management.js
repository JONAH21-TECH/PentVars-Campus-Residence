(function () {
  "use strict";
  var h = PV.ui.h, ui = PV.ui;
  var user = ui.guard(["MANAGEMENT"]);
  if (!user) { return; }
  var root = document.getElementById("root");
  var tabApi, current = 0;

  function done(res, msg) {
    if (res.error) { ui.toast(res.error, "bad"); return; }
    ui.toast(msg); tabApi.show(current);
  }

  function totalCapacity(hall) {
    var t = 0;
    hall.floors.forEach(function (f) { if (!f.vacant) { PV.roomsOnFloor(hall.id, f.n).forEach(function (r) { t += r.cap; }); } });
    return t;
  }

  function action(body) {
    var d = PV.db();
    var esc = d.incidents.filter(function (i) { return i.escalated && i.status === "UNDER_INVESTIGATION"; });
    body.appendChild(h("h3", null, "Escalated incidents (" + esc.length + ")"));
    if (!esc.length) { body.appendChild(ui.empty("No escalations. Routine items are handled at hall level.")); }
    esc.forEach(function (i) {
      var r = PV.roomInfo(i.roomId);
      var who = h("select", null, h("option", { value: "" }, "Split across room occupants"),
        PV.occupants(i.roomId).map(function (o) { return h("option", { value: o.id }, "Bill " + o.name); }));
      var amt = h("input", { type: "number", min: "0", step: "0.01", placeholder: "Amount (GHS)" });
      body.appendChild(h("div", { class: "list-row", style: "align-items:flex-start" },
        h("div", null, h("b", null, r.label), h("br"), i.description),
        h("div", null, who, amt, h("div", { class: "actions" },
          h("button", { class: "btn small", type: "button", onclick: function () {
            done(PV.resolveIncident(i.id, who.value || null, amt.value), "Incident resolved");
          } }, "Resolve and bill")))));
    });

    var stuck = [];
    Object.keys(d.apps).forEach(function (uid) {
      var a = d.apps[uid];
      if (a.status === "SUBMITTED") {
        var days = (Date.now() - new Date(a.submittedAt).getTime()) / 86400000;
        if (days >= 3) { stuck.push([PV.userById(uid).name, PV.hallById(a.hallId).name, Math.floor(days) + " days"]); }
      }
    });
    body.appendChild(h("h3", { style: "margin-top:24px" }, "Applications waiting 3+ days (" + stuck.length + ")"));
    if (stuck.length) { body.appendChild(ui.table(["Student", "Hall", "Waiting"], stuck)); }
    else { body.appendChild(ui.empty("None overdue.")); }
  }

  function overview(body) {
    var d = PV.db();
    var grid = h("div", { class: "grid2" });
    PV.HALLS.forEach(function (hall) {
      var occ = PV.activeAssignments().filter(function (a) { return PV.roomInfo(a.roomId).hallId === hall.id; }).length;
      var cap = totalCapacity(hall);
      var apps = Object.keys(d.apps).filter(function (u) { return d.apps[u].hallId === hall.id; }).map(function (u) { return d.apps[u]; });
      grid.appendChild(h("div", { class: "card stat" }, h("h3", null, hall.name), h("b", null, occ + " / " + cap),
        h("div", { class: "muted" }, "beds occupied"),
        h("p", { class: "muted" }, apps.filter(function (a) { return a.status === "SUBMITTED"; }).length + " pending · " +
          apps.filter(function (a) { return a.status === "APPROVED"; }).length + " verified · " +
          apps.filter(function (a) { return a.status === "REJECTED"; }).length + " rejected")));
    });
    body.appendChild(grid);
    var owedTotal = d.fees.filter(function (f) { return f.status === "PENDING"; }).reduce(function (s, f) { return s + f.amount; }, 0);
    var paid = d.fees.filter(function (f) { return f.status === "PAID" || f.status === "VERIFIED"; }).reduce(function (s, f) { return s + f.amount; }, 0);
    body.appendChild(h("div", { class: "grid2", style: "margin-top:16px" },
      h("div", { class: "card stat" }, h("b", null, ui.money(paid)), h("div", { class: "muted" }, "verified or paid")),
      h("div", { class: "card stat" }, h("b", null, ui.money(owedTotal)), h("div", { class: "muted" }, "outstanding"))));
  }

  function verifs(body) {
    var d = PV.db();
    var rows = Object.keys(d.apps).map(function (uid) {
      var a = d.apps[uid];
      return [PV.userById(uid).name, PV.hallById(a.hallId).name, a.type === "src" ? "SRC (waived)" : "Regular",
        a.verifications.map(function (v) { return PV.POSITIONS[v.position] + ": " + v.status.toLowerCase(); }).join("; "),
        ui.badge(a.status, ui.statusKind(a.status))];
    });
    body.appendChild(h("h3", null, "All fee verifications"));
    if (rows.length) { body.appendChild(ui.table(["Student", "Hall", "Type", "Approvals", "Status"], rows)); } else { body.appendChild(ui.empty("No applications yet.")); }
  }

  function rooms(body) {
    var rows = PV.activeAssignments().map(function (a) {
      var r = PV.roomInfo(a.roomId);
      return [PV.userById(a.userId).name, r.hallName, r.code, r.exec ? "Executive" : "Regular", ui.fdate(a.dateAssigned)];
    });
    body.appendChild(h("h3", null, "All room assignments"));
    if (rows.length) { body.appendChild(ui.table(["Student", "Hall", "Room", "Type", "Since"], rows)); } else { body.appendChild(ui.empty("No assignments yet.")); }
  }

  function incidents(body) {
    var list = PV.db().incidents;
    body.appendChild(h("h3", null, "All incidents"));
    if (!list.length) { body.appendChild(ui.empty("No incidents.")); return; }
    body.appendChild(ui.table(["Room", "Description", "Status", "Charge"], list.map(function (i) {
      return [PV.roomInfo(i.roomId).label, i.description,
        ui.badge(i.status === "RESOLVED" ? "Resolved" : i.escalated ? "Escalated" : "Investigating", i.status === "RESOLVED" ? "ok" : i.escalated ? "gold" : ""),
        i.status === "RESOLVED" ? ui.money(i.amount) + (i.responsibleUserId ? "" : " (split)") : ""];
    })));
  }

  function charges(body) {
    body.appendChild(h("h3", null, "Issue an additional charge"));
    var studs = PV.db().users.filter(function (u) { return u.role === "STUDENT" || u.role === "SRC_MEMBER"; });
    var who = h("select", null, studs.map(function (u) { return h("option", { value: u.id }, u.name + " (" + u.studentNumber + ")"); }));
    var amt = h("input", { type: "number", min: "0", step: "0.01", placeholder: "Amount (GHS)" });
    var note = h("input", { type: "text", placeholder: "Reason" });
    body.appendChild(h("div", { class: "form-grid" }, h("label", null, "Student", who), h("label", null, "Amount", amt)));
    body.appendChild(h("label", null, "Reason", note));
    body.appendChild(h("button", { class: "btn small", type: "button", onclick: function () {
      done(PV.addCharge(who.value, amt.value, note.value), "Charge issued");
    } }, "Issue charge"));
  }

  var defs = [{ label: "Needs action", render: action }, { label: "Overview", render: overview },
    { label: "Verifications", render: verifs }, { label: "Rooms", render: rooms },
    { label: "Incidents", render: incidents }, { label: "Charges", render: charges }];
  defs.forEach(function (d, idx) { var r = d.render; d.render = function (b) { current = idx; r(b); }; });
  tabApi = ui.tabs(root, defs);
})();
