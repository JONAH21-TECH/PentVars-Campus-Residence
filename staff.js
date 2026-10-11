(function () {
  "use strict";
  var h = PV.ui.h, ui = PV.ui;
  var user = ui.guard(["HALL_STAFF", "HALL_REP"]);
  if (!user) { return; }
  var root = document.getElementById("root");
  var hall = PV.hallById(user.hallId);
  document.getElementById("title").textContent = hall.name + " staff desk";
  document.getElementById("sub").textContent = user.name + " · " + PV.POSITIONS[user.position];
  var isRep = user.role === "HALL_REP";
  var tabApi;

  function done(res, msg) {
    if (res.error) { ui.toast(res.error, "bad"); return false; }
    ui.toast(msg); tabApi.show(current); return true;
  }
  var current = 0;

  function hallStudents() {
    return PV.db().users.filter(function (u) { return u.hallId === user.hallId && (u.role === "STUDENT" || u.role === "SRC_MEMBER" || u.role === "HALL_REP"); });
  }

  // --- Verifications
  function verifications(body) {
    var items = PV.pendingVerificationsFor(user);
    body.appendChild(h("h3", null, "Pending verifications (" + items.length + ")"));
    if (!items.length) { body.appendChild(ui.empty("Nothing waiting for you.")); return; }
    items.forEach(function (it) {
      var fee = PV.db().fees.filter(function (f) { return f.id === it.app.feeId; })[0];
      var reason = h("input", { type: "text", placeholder: "Reason (required to reject)" });
      body.appendChild(h("div", { class: "card", style: "margin-bottom:12px;box-shadow:none;border:1px solid #dde3ef" },
        h("div", { class: "list-row" },
          h("span", null, h("b", null, it.student.name), " ", h("small", null, "ID " + it.student.studentNumber + " · " + it.student.programme)),
          ui.badge("As " + PV.POSITIONS[it.position], "gold")),
        fee ? h("p", { class: "muted" }, "Payment ref " + fee.ref + " · slip: " + fee.slipName + " · " + ui.money(fee.amount)) :
          h("p", { class: "muted" }, "SRC member: fee waived."),
        it.app.avoidNote ? h("p", { class: "muted" }, "Student note: " + it.app.avoidNote) : null,
        reason,
        h("div", { class: "actions" },
          h("button", { class: "btn small", type: "button", onclick: function () {
            done(PV.decideVerification(user, it.student.id, it.position, true), "Approved");
          } }, "Approve"),
          h("button", { class: "btn danger small", type: "button", onclick: function () {
            if (!reason.value.trim()) { ui.toast("Enter a reason to reject.", "bad"); return; }
            done(PV.decideVerification(user, it.student.id, it.position, false, reason.value.trim()), "Rejected");
          } }, "Reject"))));
    });
  }

  // --- Switch requests (reps only)
  function switches(body) {
    var list = PV.db().switches.filter(function (s) { return s.hallId === user.hallId; });
    var pend = list.filter(function (s) { return s.status === "PENDING"; });
    body.appendChild(h("h3", null, "Room switch requests"));
    if (!pend.length) { body.appendChild(ui.empty("No pending requests.")); }
    pend.forEach(function (s) {
      var st = PV.userById(s.userId);
      body.appendChild(h("div", { class: "list-row" },
        h("span", null, h("b", null, st.name), ": ", PV.roomInfo(s.currentRoomId).code, " → ", PV.roomInfo(s.requestedRoomId).code,
          h("br"), h("small", null, s.reason)),
        isRep ? h("span", { class: "actions", style: "margin:0" },
          h("button", { class: "btn small", type: "button", onclick: function () { done(PV.decideSwitch(user, s.id, true), "Switch approved"); } }, "Approve"),
          h("button", { class: "btn danger small", type: "button", onclick: function () { done(PV.decideSwitch(user, s.id, false), "Switch denied"); } }, "Deny"))
          : ui.badge("Reps decide", "")));
    });
    var past = list.filter(function (s) { return s.status !== "PENDING"; });
    if (past.length) {
      body.appendChild(h("h4", null, "Decided"));
      body.appendChild(ui.table(["Student", "From", "To", "Status"], past.map(function (s) {
        return [PV.userById(s.userId).name, PV.roomInfo(s.currentRoomId).code, PV.roomInfo(s.requestedRoomId).code, ui.badge(s.status, ui.statusKind(s.status))];
      })));
    }
  }

  // --- Residents
  function residents(body) {
    body.appendChild(h("h3", null, "Residents"));
    var rows = PV.activeAssignments().filter(function (a) { return PV.roomInfo(a.roomId).hallId === user.hallId; });
    if (!rows.length) { body.appendChild(ui.empty("No residents yet.")); return; }
    body.appendChild(ui.table(["Name", "Room", "Since", ""], rows.map(function (a) {
      var u = PV.userById(a.userId);
      return [u.name, PV.roomInfo(a.roomId).code, ui.fdate(a.dateAssigned),
        h("button", { class: "btn ghost small", type: "button", onclick: function () {
          if (confirm("Mark " + u.name + " as moved out?")) { done(PV.moveOut(a.id), "Moved out"); }
        } }, "Move out")];
    })));
  }

  // --- Incidents
  function incidents(body) {
    body.appendChild(h("h3", null, "Report an incident"));
    var num = h("input", { type: "number", min: "1", max: "30", placeholder: "Room number, e.g. 12" });
    var fl = h("select", null, hall.floors.filter(function (f) { return !f.vacant; }).map(function (f) { return h("option", { value: f.n }, PV.floorLabel(f.n)); }));
    var desc = h("textarea", { rows: "2", placeholder: "What happened?" });
    body.appendChild(h("div", { class: "form-grid" }, h("label", null, "Floor", fl), h("label", null, "Room number", num)));
    body.appendChild(h("label", null, "Description", desc));
    body.appendChild(h("button", { class: "btn small", type: "button", onclick: function () {
      done(PV.reportIncident(user, PV.roomId(user.hallId, Number(fl.value), Number(num.value)), desc.value), "Incident reported");
    } }, "Report"));

    body.appendChild(h("h3", { style: "margin-top:24px" }, "Incidents"));
    var list = PV.db().incidents.filter(function (i) { return i.hallId === user.hallId; });
    if (!list.length) { body.appendChild(ui.empty("No incidents.")); }
    list.forEach(function (i) {
      var r = PV.roomInfo(i.roomId);
      var box = h("div", { class: "list-row", style: "align-items:flex-start" });
      var left = h("div", null, h("b", null, r.code), " ", h("span", null, i.description), h("br"),
        h("small", null, ui.fdate(i.createdAt) + (i.escalated ? " · escalated to management" : "")));
      var right = h("div");
      if (i.status === "RESOLVED") {
        right.appendChild(ui.badge("Resolved · " + ui.money(i.amount) + (i.responsibleUserId ? " billed to " + PV.userById(i.responsibleUserId).name : " split across room"), "ok"));
      } else {
        var who = h("select", null, h("option", { value: "" }, "Split across room occupants"),
          PV.occupants(i.roomId).map(function (o) { return h("option", { value: o.id }, "Bill " + o.name); }));
        var amt = h("input", { type: "number", min: "0", step: "0.01", placeholder: "Amount (GHS)" });
        right.appendChild(who); right.appendChild(amt);
        right.appendChild(h("div", { class: "actions" },
          h("button", { class: "btn small", type: "button", onclick: function () {
            done(PV.resolveIncident(i.id, who.value || null, amt.value), "Incident resolved");
          } }, "Resolve and bill"),
          i.escalated ? null : h("button", { class: "btn ghost small", type: "button", onclick: function () { done(PV.escalateIncident(i.id), "Escalated"); } }, "Escalate")));
      }
      box.appendChild(left); box.appendChild(right); body.appendChild(box);
    });
  }

  // --- Fees
  function fees(body) {
    body.appendChild(h("h3", null, "Fees in this hall"));
    var ids = {}; hallStudents().forEach(function (u) { ids[u.id] = true; });
    var list = PV.db().fees.filter(function (f) { return ids[f.userId]; });
    if (!list.length) { body.appendChild(ui.empty("No fees yet.")); return; }
    var canPay = user.position === "FINANCIAL_CONTROLLER" || user.role === "HALL_STAFF";
    body.appendChild(ui.table(["Student", "Description", "Amount", "Status", ""], list.map(function (f) {
      return [PV.userById(f.userId).name, f.note || f.type, ui.money(f.amount), ui.badge(f.status, ui.statusKind(f.status)),
        f.status === "PENDING" && canPay && f.type !== "HALL_FEE" ? h("button", { class: "btn ghost small", type: "button", onclick: function () { done(PV.markPaid(f.id), "Marked paid"); } }, "Mark paid") : ""];
    })));
    if (!canPay) { body.appendChild(h("p", { class: "muted" }, "The Financial Controller and hall staff record payments.")); }
  }

  // --- SRC
  function src(body) {
    body.appendChild(h("h3", null, "Register an SRC member"));
    body.appendChild(h("p", { class: "muted" }, "SRC members get free accommodation in this hall. Their request is then approved by the SRC representative."));
    var id = h("input", { type: "text", placeholder: "Student ID" });
    body.appendChild(h("label", null, "Student ID", id));
    body.appendChild(h("button", { class: "btn small", type: "button", onclick: function () {
      done(PV.designateSrc(id.value, user.hallId), "SRC member registered");
    } }, "Register"));
  }

  var defs = [{ label: "Verifications", render: verifications }];
  defs.push({ label: "Room switches", render: switches });
  defs.push({ label: "Residents", render: residents }, { label: "Incidents", render: incidents }, { label: "Fees", render: fees });
  if (user.position === "SRC_REPRESENTATIVE") { defs.push({ label: "SRC members", render: src }); }
  defs.forEach(function (d, idx) { var r = d.render; d.render = function (b) { current = idx; r(b); }; });
  tabApi = ui.tabs(root, defs);
})();
