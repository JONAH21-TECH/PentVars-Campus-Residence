(function () {
  "use strict";
  var h = PV.ui.h, ui = PV.ui;
  var MAX = 5 * 1024 * 1024;
  var user = ui.guard(["STUDENT", "SRC_MEMBER"]);
  if (!user) { return; }
  var root = document.getElementById("root");

  function stepper(active) {
    var names = ["Details", "Verification", "Room"];
    return h("ol", { class: "steps" }, names.map(function (n, i) {
      var cls = i + 1 < active ? "done" : i + 1 === active ? "active" : "";
      return h("li", { class: cls }, h("span", null, String(i + 1)), n);
    }));
  }

  function statusView(app) {
    var wrap = h("div", { class: "stack" });
    var step = app.status === "APPROVED" ? 3 : 2;
    wrap.appendChild(stepper(step));
    var card = h("section", { class: "card" });
    card.appendChild(h("h2", null, app.status === "APPROVED" ? "You are verified" : "Awaiting verification"));
    if (app.status === "APPROVED") {
      card.appendChild(h("div", { class: "banner ok" }, "Room selection is unlocked."));
      var has = PV.currentAssignment(user.id);
      card.appendChild(h("a", { class: "btn", href: "rooms.html" }, has ? "View rooms" : "Choose a room"));
    } else {
      card.appendChild(h("p", null, app.type === "src"
        ? "Your hall's SRC representative must approve your request. Your fee is waived."
        : "Your payment slip must be verified by the Hall Master, Deputy Hall Master, Hall President and Deputy Hall President."));
      app.verifications.forEach(function (v) {
        card.appendChild(h("div", { class: "list-row" }, h("span", null, PV.POSITIONS[v.position]),
          ui.badge(v.status === "PENDING" ? "Pending" : v.status === "APPROVED" ? "Approved" : "Rejected", ui.statusKind(v.status))));
      });
    }
    wrap.appendChild(card);
    return wrap;
  }

  function formView(rejected) {
    var isSrc = user.role === "SRC_MEMBER";
    var wrap = h("div", { class: "stack" });
    wrap.appendChild(stepper(1));
    if (rejected) {
      wrap.appendChild(h("div", { class: "banner bad" }, "Your last application was rejected: " + (rejected.rejectedReason || "no reason given") + ". You can apply again."));
    }
    var card = h("section", { class: "card" });
    card.appendChild(h("h2", null, "Your details"));
    card.appendChild(h("p", { class: "muted" }, user.name + " · ID " + user.studentNumber + " · " + user.programme + ", level " + user.level));

    var hallSel = h("select", { id: "hall" });
    if (isSrc) {
      hallSel.appendChild(h("option", { value: user.hallId }, PV.hallById(user.hallId).name));
      hallSel.disabled = true;
    } else {
      hallSel.appendChild(h("option", { value: "" }, "Select hall"));
      PV.HALLS.forEach(function (hl) {
        var ok = hl.type === "MIXED" || (hl.type === "MALE_ONLY" && user.gender === "M") || (hl.type === "FEMALE_ONLY" && user.gender === "F");
        if (ok) { hallSel.appendChild(h("option", { value: hl.id }, hl.name)); }
      });
    }
    var active = h("input", { type: "checkbox", id: "active" });
    var ref = h("input", { type: "text", id: "ref" });
    var file = h("input", { type: "file", id: "slip", accept: "image/*,application/pdf" });
    var note = h("textarea", { id: "note", rows: "3", placeholder: "Name and reason. A note for staff awareness only; it does not block any assignment." });
    var err = h("p", { class: "error", hidden: true });

    card.appendChild(h("label", null, "Hall", hallSel));
    card.appendChild(h("label", { class: "check" }, active, "I confirm I currently hold active/valid student status at Pentecost University."));
    if (isSrc) {
      card.appendChild(h("div", { class: "banner ok" }, "Fee waived for SRC members. Your hall's SRC representative will approve your request."));
    } else {
      card.appendChild(h("div", { class: "banner", role: "alert" }, h("b", null, "GHS 2,000"), " hall fee. This payment is ", h("b", null, "non-refundable"), "."));
      card.appendChild(h("label", null, "Payment reference / receipt number", ref));
      card.appendChild(h("label", null, "Upload payment slip or receipt", file, h("small", null, "PNG, JPG or PDF, up to 5 MB. Demo: only the file name is stored.")));
    }
    card.appendChild(h("label", null, "Optional: someone you do not want to room with", note));
    card.appendChild(err);
    card.appendChild(h("button", { class: "btn", type: "button", onclick: function () {
      var f = file.files && file.files[0];
      if (f && f.size > MAX) { err.textContent = "File is larger than 5 MB."; err.hidden = false; return; }
      var res = PV.submitApplication(user, { hallId: hallSel.value, activeStatus: active.checked, payRef: ref.value,
        slipName: f ? f.name : "", avoidNote: note.value });
      if (res.error) { err.textContent = res.error; err.hidden = false; return; }
      ui.toast("Application submitted");
      render();
    } }, isSrc ? "Request SRC approval" : "Submit for verification"));
    wrap.appendChild(card);
    return wrap;
  }

  function render() {
    user = PV.me();
    ui.clear(root);
    var app = PV.appFor(user.id);
    root.appendChild(app && app.status !== "REJECTED" ? statusView(app) : formView(app));
  }
  render();
})();
