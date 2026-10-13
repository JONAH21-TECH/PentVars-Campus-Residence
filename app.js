/*
 * PentVars Campus Residence - shared data layer and UI helpers.
 *
 * DEMO ONLY: all data lives in the browser's localStorage and passwords are stored in
 * plain text. This stands in for the Next.js + PostgreSQL + Prisma backend described in
 * the README. Do not collect real student data with it.
 */
(function (w) {
  "use strict";

  var KEY = "pv_db_v1";
  var SKEY = "pv_session_v1";

  // ---- Rules / assumptions (edit here) -----------------------------------------
  var HALL_FEE = 2000;          // GHS, non-refundable
  var REG_CAP = 4;              // ASSUMPTION: regular room capacity (not specified in README)
  var EXEC_CAP = 3;             // executive rooms cap at 3
  var PER_FLOOR = 30;           // rooms per floor (stated for Anan; assumed for the others)
  var EXEC_NUMS = [1, 2, 16, 17]; // ASSUMPTION: first two rooms of each wing are executive (not ground floor)
  var DEMO_PASSWORD = "demo123";

  var POSITIONS = {
    HALL_MASTER: "Hall Master",
    DEPUTY_HALL_MASTER: "Deputy Hall Master",
    PRESIDENT: "Hall President",
    DEPUTY_PRESIDENT: "Deputy Hall President",
    FINANCIAL_CONTROLLER: "Financial Controller",
    SRC_REPRESENTATIVE: "SRC Representative"
  };
  var FEE_VERIFIERS = ["HALL_MASTER", "DEPUTY_HALL_MASTER", "PRESIDENT", "DEPUTY_PRESIDENT"];
  var MASTER_SLOTS = ["HALL_MASTER", "DEPUTY_HALL_MASTER"];

  var HALLS = [
    { id: "anan", name: "Anan Hall", type: "MIXED", floors: [
      { n: 0, g: "F" }, { n: 1, g: "F" }, { n: 2, g: "M" }, { n: 3, g: "M" }, { n: 4, g: null, vacant: true }
    ] },
    { id: "sappho", name: "Sappho Hall", type: "MALE_ONLY", floors: [
      { n: 0, g: "M" }, { n: 1, g: "M" }, { n: 2, g: "M" }
    ] },
    { id: "yeboah", name: "Yeboah Hall", type: "FEMALE_ONLY", floors: [
      { n: 0, g: "F" }, { n: 1, g: "F" }, { n: 2, g: "F" }
    ] }
  ];

  // ---- Storage -------------------------------------------------------------------
  var cache = null;

  function seed() {
    var d = { users: [], apps: {}, assignments: [], switches: [], fees: [], incidents: [], seq: 1 };
    function nid() { return "x" + (d.seq++); }
    var defs = [
      ["master", "HALL_MASTER", "HALL_STAFF"],
      ["deputymaster", "DEPUTY_HALL_MASTER", "HALL_STAFF"],
      ["president", "PRESIDENT", "HALL_REP"],
      ["deputypresident", "DEPUTY_PRESIDENT", "HALL_REP"],
      ["finance", "FINANCIAL_CONTROLLER", "HALL_REP"],
      ["src", "SRC_REPRESENTATIVE", "HALL_REP"]
    ];
    HALLS.forEach(function (hall) {
      defs.forEach(function (def, i) {
        var g = hall.type === "MALE_ONLY" ? "M" : hall.type === "FEMALE_ONLY" ? "F" : (i % 2 ? "F" : "M");
        d.users.push({
          id: nid(), email: def[0] + "." + hall.id + "@pentvars.test", password: DEMO_PASSWORD,
          name: hall.name.replace(" Hall", "") + " " + POSITIONS[def[1]], role: def[2], position: def[1],
          gender: g, hallId: hall.id
        });
      });
    });
    d.users.push({ id: nid(), email: "management@pentvars.test", password: DEMO_PASSWORD,
      name: "School Management", role: "MANAGEMENT", gender: "M", hallId: null });
    d.users.push({ id: nid(), email: "ama@student.test", password: DEMO_PASSWORD, name: "Ama Mensah",
      role: "STUDENT", gender: "F", studentNumber: "20250101", programme: "Nursing", level: 200, hallId: null });
    d.users.push({ id: nid(), email: "kofi@student.test", password: DEMO_PASSWORD, name: "Kofi Boateng",
      role: "STUDENT", gender: "M", studentNumber: "20250102", programme: "Computer Science", level: 300, hallId: null });
    d.users.push({ id: nid(), email: "esi@student.test", password: DEMO_PASSWORD, name: "Esi Owusu (SRC)",
      role: "SRC_MEMBER", gender: "F", studentNumber: "20250103", programme: "Theology", level: 400, hallId: "anan" });
    return d;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* storage unavailable */ }
  }
  function db() {
    if (cache) { return cache; }
    try { cache = JSON.parse(localStorage.getItem(KEY)); } catch (e) { cache = null; }
    if (!cache || !cache.users) { cache = seed(); save(); }
    return cache;
  }
  function nextId() { var d = db(); var id = "x" + (d.seq++); return id; }
  function resetDemo() {
    cache = seed(); save();
    try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ }
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function now() { return new Date().toISOString(); }

  // ---- Users and session -----------------------------------------------------------
  function userById(id) {
    var u = db().users;
    for (var i = 0; i < u.length; i++) { if (u[i].id === id) { return u[i]; } }
    return null;
  }
  function login(email, password) {
    var e = String(email || "").trim().toLowerCase();
    var u = db().users.filter(function (x) { return x.email.toLowerCase() === e && x.password === password; })[0];
    if (!u) { return null; }
    try { localStorage.setItem(SKEY, u.id); } catch (err) { /* ignore */ }
    return u;
  }
  function logout() { try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ } }
  function me() {
    var id = null;
    try { id = localStorage.getItem(SKEY); } catch (e) { /* ignore */ }
    return id ? userById(id) : null;
  }
  function register(f) {
    var d = db();
    var email = String(f.email || "").trim().toLowerCase();
    if (!f.name || !email || !f.password || !f.studentNumber || !f.gender || !f.programme || !f.level) {
      return { error: "Please fill in every field." };
    }
    if (f.password.length < 6) { return { error: "Password must be at least 6 characters." }; }
    if (d.users.some(function (u) { return u.email.toLowerCase() === email; })) {
      return { error: "That email is already registered." };
    }
    if (d.users.some(function (u) { return u.studentNumber === f.studentNumber; })) {
      return { error: "That student ID is already registered." };
    }
    var u = { id: nextId(), email: email, password: f.password, name: f.name.trim(), role: "STUDENT",
      gender: f.gender, studentNumber: f.studentNumber.trim(), programme: f.programme.trim(),
      level: Number(f.level), hallId: null };
    d.users.push(u); save();
    return { user: u };
  }
  function homeFor(u) {
    if (!u) { return "login.html"; }
    if (u.role === "MANAGEMENT") { return "management.html"; }
    if (u.role === "HALL_REP" || u.role === "HALL_STAFF") { return "staff.html"; }
    return "dashboard.html";
  }

  // ---- Halls and rooms -----------------------------------------------------------------
  function hallById(id) { return HALLS.filter(function (h) { return h.id === id; })[0] || null; }
  function floorCfg(hall, n) {
    return hall.floors.filter(function (f) { return f.n === n; })[0] || null;
  }
  function floorLabel(n) {
    if (n === 0) { return "Ground floor"; }
    return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th") + " floor";
  }
  function roomId(hallId, floor, num) { return hallId + "-" + floor + "-" + num; }
  function roomInfo(id) {
    var p = String(id).split("-");
    if (p.length !== 3) { return null; }
    var hall = hallById(p[0]);
    var floor = Number(p[1]);
    var num = Number(p[2]);
    if (!hall || !floorCfg(hall, floor) || !(num >= 1 && num <= PER_FLOOR)) { return null; }
    var exec = floor > 0 && EXEC_NUMS.indexOf(num) >= 0;
    var code = (floor === 0 ? "G" : String(floor)) + (num < 10 ? "0" : "") + num;
    return { id: id, hallId: hall.id, hallName: hall.name, floor: floor, num: num,
      wing: num <= PER_FLOOR / 2 ? "LEFT" : "RIGHT", exec: exec, cap: exec ? EXEC_CAP : REG_CAP,
      code: code, label: hall.name + " · Room " + code };
  }
  function roomsOnFloor(hallId, floor) {
    var out = [];
    for (var n = 1; n <= PER_FLOOR; n++) { out.push(roomInfo(roomId(hallId, floor, n))); }
    return out;
  }
  function activeAssignments() {
    return db().assignments.filter(function (a) { return a.status === "ACTIVE"; });
  }
  function currentAssignment(userId) {
    return activeAssignments().filter(function (a) { return a.userId === userId; })[0] || null;
  }
  function occupants(rid) {
    return activeAssignments().filter(function (a) { return a.roomId === rid; })
      .map(function (a) { return userById(a.userId); }).filter(Boolean);
  }
  function isExecUser(u) { return u.role === "SRC_MEMBER" || u.role === "HALL_REP"; }

  // Returns an error string, or null if the user may take this room.
  function roomProblem(user, rid) {
    var r = roomInfo(rid);
    if (!r) { return "Unknown room."; }
    var fl = floorCfg(hallById(r.hallId), r.floor);
    if (fl.vacant) { return "This floor is currently vacant and closed."; }
    if (user.hallId && user.hallId !== r.hallId) { return "This room is not in your hall."; }
    if (fl.g && fl.g !== user.gender) {
      return "This floor is reserved for " + (fl.g === "F" ? "ladies" : "boys") + ".";
    }
    if (r.exec && !isExecUser(user)) { return "Executive rooms are reserved for SRC members and hall representatives."; }
    if (!r.exec && isExecUser(user)) { return "SRC members and hall representatives use the executive wings."; }
    var cur = currentAssignment(user.id);
    if (cur && cur.roomId === rid) { return "You are already in this room."; }
    if (occupants(rid).length >= r.cap) { return "This room is full."; }
    return null;
  }

  // ---- Application and verification ---------------------------------------------------------
  function appFor(userId) { return db().apps[userId] || null; }
  function canSelectRoom(u) {
    if (!u) { return false; }
    if (u.role === "HALL_REP") { return true; }
    var a = appFor(u.id);
    return !!(a && a.status === "APPROVED");
  }

  function submitApplication(user, f) {
    var d = db();
    var isSrc = user.role === "SRC_MEMBER";
    var hallId = isSrc ? user.hallId : f.hallId;
    var hall = hallById(hallId);
    if (!hall) { return { error: "Choose a hall." }; }
    if (hall.type === "MALE_ONLY" && user.gender !== "M") { return { error: hall.name + " is for boys only." }; }
    if (hall.type === "FEMALE_ONLY" && user.gender !== "F") { return { error: hall.name + " is for girls only." }; }
    if (!f.activeStatus) { return { error: "Active student status is required to apply." }; }
    var existing = appFor(user.id);
    if (existing && existing.status !== "REJECTED") { return { error: "You already have an application in progress." }; }
    if (!isSrc) {
      if (!f.payRef || !String(f.payRef).trim()) { return { error: "Enter your payment reference." }; }
      if (!f.slipName) { return { error: "Upload your payment slip or receipt." }; }
    }
    user.hallId = hallId;
    var app = {
      userId: user.id, hallId: hallId, type: isSrc ? "src" : "regular", status: "SUBMITTED",
      avoidNote: String(f.avoidNote || "").trim(), submittedAt: now(), feeId: null,
      verifications: (isSrc ? ["SRC_REPRESENTATIVE"] : FEE_VERIFIERS).map(function (p) {
        return { position: p, status: "PENDING", by: null, at: null, reason: "" };
      })
    };
    if (!isSrc) {
      var fee = { id: nextId(), userId: user.id, amount: HALL_FEE, type: "HALL_FEE", status: "PENDING",
        slipName: f.slipName, ref: String(f.payRef).trim(), note: "Hall fee (non-refundable)", createdAt: now() };
      d.fees.push(fee);
      app.feeId = fee.id;
    }
    d.apps[user.id] = app;
    save();
    return { app: app };
  }

  function canDecide(approver, app, position) {
    if (!approver || approver.hallId !== app.hallId) { return false; }
    if (approver.position === position) { return true; }
    // Hall Master and Deputy share equal clearance.
    return approver.role === "HALL_STAFF" && MASTER_SLOTS.indexOf(position) >= 0;
  }
  function decideVerification(approver, studentId, position, approve, reason) {
    var d = db();
    var app = appFor(studentId);
    if (!app || app.status !== "SUBMITTED") { return { error: "This application is not awaiting verification." }; }
    if (!canDecide(approver, app, position)) { return { error: "You cannot decide this verification." }; }
    var v = app.verifications.filter(function (x) { return x.position === position; })[0];
    if (!v || v.status !== "PENDING") { return { error: "Already decided." }; }
    v.status = approve ? "APPROVED" : "REJECTED";
    v.by = approver.id; v.at = now(); v.reason = reason || "";
    if (!approve) {
      app.status = "REJECTED";
      app.rejectedReason = reason || "Rejected by " + POSITIONS[position];
    } else if (app.verifications.every(function (x) { return x.status === "APPROVED"; })) {
      app.status = "APPROVED"; app.unlockedAt = now();
      if (app.type === "src") {
        d.fees.push({ id: nextId(), userId: studentId, amount: HALL_FEE, type: "HALL_FEE", status: "WAIVED",
          note: "Hall fee waived (SRC member)", createdAt: now() });
      } else {
        d.fees.forEach(function (f) { if (f.id === app.feeId) { f.status = "VERIFIED"; } });
      }
    }
    save();
    return { app: app };
  }
  function pendingVerificationsFor(approver) {
    var d = db();
    var out = [];
    Object.keys(d.apps).forEach(function (uid) {
      var app = d.apps[uid];
      if (app.status !== "SUBMITTED") { return; }
      app.verifications.forEach(function (v) {
        if (v.status === "PENDING" && canDecide(approver, app, v.position)) {
          out.push({ student: userById(uid), app: app, position: v.position });
        }
      });
    });
    return out;
  }

  // ---- Assignment, switching, move-out ---------------------------------------------------------
  function assignRoom(user, rid) {
    if (!canSelectRoom(user)) { return { error: "Room selection is locked until you are verified." }; }
    if (currentAssignment(user.id)) { return { error: "You already have a room. Request a switch instead." }; }
    var p = roomProblem(user, rid);
    if (p) { return { error: p }; }
    db().assignments.push({ id: nextId(), userId: user.id, roomId: rid, dateAssigned: now(), status: "ACTIVE" });
    save();
    return { ok: true };
  }
  function requestSwitch(user, rid, reason) {
    var cur = currentAssignment(user.id);
    if (!cur) { return { error: "You need a room before you can request a switch." }; }
    if (!String(reason || "").trim()) { return { error: "Give a reason for the switch." }; }
    var p = roomProblem(user, rid);
    if (p) { return { error: p }; }
    var dup = db().switches.some(function (s) { return s.userId === user.id && s.status === "PENDING"; });
    if (dup) { return { error: "You already have a pending switch request." }; }
    db().switches.push({ id: nextId(), userId: user.id, hallId: user.hallId, currentRoomId: cur.roomId,
      requestedRoomId: rid, reason: String(reason).trim(), status: "PENDING", reviewedBy: null, createdAt: now() });
    save();
    return { ok: true };
  }
  function decideSwitch(reviewer, switchId, approve) {
    var s = db().switches.filter(function (x) { return x.id === switchId; })[0];
    if (!s || s.status !== "PENDING") { return { error: "Request is not pending." }; }
    if (reviewer.role !== "HALL_REP" || reviewer.hallId !== s.hallId) {
      return { error: "Only this hall's representatives can review switches." };
    }
    if (approve) {
      var student = userById(s.userId);
      var cur = currentAssignment(s.userId);
      var p = roomProblem(student, s.requestedRoomId);
      if (p) { return { error: p }; }
      if (cur) { cur.status = "MOVED_OUT"; }
      db().assignments.push({ id: nextId(), userId: s.userId, roomId: s.requestedRoomId,
        dateAssigned: now(), status: "ACTIVE" });
    }
    s.status = approve ? "APPROVED" : "DENIED";
    s.reviewedBy = reviewer.id;
    save();
    return { ok: true };
  }
  function moveOut(assignmentId) {
    var a = db().assignments.filter(function (x) { return x.id === assignmentId; })[0];
    if (!a || a.status !== "ACTIVE") { return { error: "Not an active assignment." }; }
    a.status = "MOVED_OUT"; a.movedOutAt = now();
    save();
    return { ok: true };
  }

  // ---- Incidents and fees ---------------------------------------------------------------------------
  function reportIncident(reporter, rid, description) {
    var r = roomInfo(rid);
    if (!r) { return { error: "Unknown room." }; }
    if (reporter.role !== "MANAGEMENT" && reporter.hallId !== r.hallId) { return { error: "That room is not in your hall." }; }
    if (!String(description || "").trim()) { return { error: "Describe the incident." }; }
    db().incidents.push({ id: nextId(), roomId: rid, hallId: r.hallId, description: String(description).trim(),
      status: "UNDER_INVESTIGATION", responsibleUserId: null, amount: 0, escalated: false,
      reportedBy: reporter.id, createdAt: now() });
    save();
    return { ok: true };
  }
  function escalateIncident(id) {
    var i = db().incidents.filter(function (x) { return x.id === id; })[0];
    if (!i || i.status !== "UNDER_INVESTIGATION") { return { error: "Incident is not open." }; }
    i.escalated = true; save();
    return { ok: true };
  }
  // responsibleId null => split evenly across current occupants of the room
  function resolveIncident(id, responsibleId, amount) {
    var d = db();
    var i = d.incidents.filter(function (x) { return x.id === id; })[0];
    if (!i || i.status !== "UNDER_INVESTIGATION") { return { error: "Incident is not open." }; }
    var amt = round2(Number(amount));
    if (!(amt >= 0)) { return { error: "Enter a valid amount." }; }
    var targets = responsibleId ? [userById(responsibleId)].filter(Boolean) : occupants(i.roomId);
    if (responsibleId && !targets.length) { return { error: "Student not found." }; }
    if (amt > 0 && !targets.length) { return { error: "Nobody is in that room to bill." }; }
    if (amt > 0) {
      var share = round2(amt / targets.length);
      var used = 0;
      targets.forEach(function (t, idx) {
        var part = idx === targets.length - 1 ? round2(amt - used) : share;
        used = round2(used + part);
        d.fees.push({ id: nextId(), userId: t.id, amount: part, type: "DAMAGE_CHARGE", status: "PENDING",
          incidentId: i.id, note: "Damage charge: " + i.description.slice(0, 60), createdAt: now() });
      });
    }
    i.status = "RESOLVED"; i.responsibleUserId = responsibleId || null; i.amount = amt; i.resolvedAt = now();
    save();
    return { ok: true };
  }
  function addCharge(userId, amount, note) {
    var amt = round2(Number(amount));
    if (!(amt > 0)) { return { error: "Enter an amount above zero." }; }
    if (!userById(userId)) { return { error: "Student not found." }; }
    db().fees.push({ id: nextId(), userId: userId, amount: amt, type: "OTHER", status: "PENDING",
      note: String(note || "Additional charge").trim(), createdAt: now() });
    save();
    return { ok: true };
  }
  function markPaid(feeId) {
    var f = db().fees.filter(function (x) { return x.id === feeId; })[0];
    if (!f || f.status !== "PENDING") { return { error: "Fee is not pending." }; }
    f.status = "PAID"; f.paidAt = now(); save();
    return { ok: true };
  }
  function feesFor(userId) { return db().fees.filter(function (f) { return f.userId === userId; }); }
  function owed(userId) {
    return round2(feesFor(userId).filter(function (f) { return f.status === "PENDING"; })
      .reduce(function (s, f) { return s + f.amount; }, 0));
  }
  function designateSrc(studentNumber, hallId) {
    var u = db().users.filter(function (x) { return x.studentNumber === String(studentNumber).trim(); })[0];
    if (!u) { return { error: "No student with that ID." }; }
    var hall = hallById(hallId);
    if (!hall) { return { error: "Choose a hall." }; }
    if (hall.type === "MALE_ONLY" && u.gender !== "M") { return { error: hall.name + " is for boys only." }; }
    if (hall.type === "FEMALE_ONLY" && u.gender !== "F") { return { error: hall.name + " is for girls only." }; }
    if (currentAssignment(u.id)) { return { error: "That student already has a room." }; }
    u.role = "SRC_MEMBER"; u.hallId = hallId;
    delete db().apps[u.id];
    save();
    return { ok: true, user: u };
  }

  // ---- UI helpers -------------------------------------------------------------------------------------
  function h(tag, attrs) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === "class") { e.className = v; }
      else if (k === "value") { e.value = v; }
      else if (k === "checked") { e.checked = !!v; }
      else if (k.slice(0, 2) === "on") { e.addEventListener(k.slice(2), v); }
      else { e.setAttribute(k, v === true ? "" : v); }
    });
    function add(c) {
      if (c === null || c === undefined || c === false) { return; }
      if (Array.isArray(c)) { c.forEach(add); return; }
      e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    for (var i = 2; i < arguments.length; i++) { add(arguments[i]); }
    return e;
  }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } return node; }
  function money(n) {
    return "GHS " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fdate(iso) { return iso ? new Date(iso).toLocaleDateString("en-GB") : ""; }
  function badge(text, kind) { return h("span", { class: "pill " + (kind || "") }, text); }
  function statusKind(s) {
    if (/APPROVED|VERIFIED|PAID|WAIVED|RESOLVED|ACTIVE/.test(s)) { return "ok"; }
    if (/REJECTED|DENIED/.test(s)) { return "bad"; }
    return "";
  }
  function toast(msg, type) {
    var t = h("div", { class: "toast " + (type || "") , role: "status" }, msg);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 3500);
  }
  function empty(msg) { return h("p", { class: "muted" }, msg); }

  function table(headers, rows) {
    return h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, headers.map(function (x) { return h("th", null, x); }))),
      h("tbody", null, rows.map(function (r) {
        return h("tr", null, r.map(function (c) { return h("td", null, c); }));
      }))));
  }

  function renderNav() {
    var host = document.getElementById("nav");
    if (!host) { return; }
    clear(host);
    var u = me();
    var links = [["index.html", "Home"]];
    if (!u) { links.push(["login.html", "Sign in"]); }
    else if (u.role === "MANAGEMENT") { links.push(["management.html", "Management"]); }
    else if (u.role === "HALL_REP" || u.role === "HALL_STAFF") {
      links.push(["staff.html", "Staff desk"]);
      if (u.role === "HALL_REP") { links.push(["rooms.html", "My room"]); }
    } else {
      links.push(["dashboard.html", "Dashboard"], ["apply.html", "Apply"], ["rooms.html", "Rooms"]);
    }
    var page = location.pathname.split("/").pop() || "index.html";
    var ul = h("div", { class: "nav-links" }, links.map(function (l) {
      return h("a", { href: l[0], class: l[0] === page ? "current" : "" }, l[1]);
    }));
    if (u) {
      ul.appendChild(h("span", { class: "who" }, u.name));
      ul.appendChild(h("a", { href: "#", onclick: function (e) { e.preventDefault(); logout(); location.href = "index.html"; } }, "Sign out"));
    }
    host.appendChild(h("a", { class: "brand", href: "index.html" }, "PentVars"));
    host.appendChild(ul);
  }

  // Guard a page to certain roles. Returns the user, or null after redirecting.
  function guard(roles) {
    var u = me();
    if (!u) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop()); return null; }
    if (roles && roles.indexOf(u.role) < 0) { location.href = homeFor(u); return null; }
    return u;
  }

  function tabs(host, defs) {
    var bar = h("div", { class: "tabs", role: "tablist" });
    var body = h("div", { class: "tab-body" });
    function show(i) {
      Array.prototype.forEach.call(bar.children, function (b, j) { b.classList.toggle("active", i === j); });
      clear(body); defs[i].render(body);
    }
    defs.forEach(function (d, i) {
      bar.appendChild(h("button", { type: "button", role: "tab", onclick: function () { show(i); } }, d.label));
    });
    host.appendChild(bar); host.appendChild(body);
    show(0);
    return { show: show };
  }

  var footer = document.getElementById("resetDemo");
  if (footer) {
    footer.addEventListener("click", function (e) {
      e.preventDefault();
      if (w.confirm("Reset all demo data? This clears every application, room and fee.")) {
        resetDemo(); location.href = "index.html";
      }
    });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", renderNav); }
    else { renderNav(); }
  }

  w.PV = {
    HALLS: HALLS, POSITIONS: POSITIONS, FEE_VERIFIERS: FEE_VERIFIERS, HALL_FEE: HALL_FEE, DEMO_PASSWORD: DEMO_PASSWORD,
    db: db, save: save, resetDemo: resetDemo, userById: userById, login: login, logout: logout, me: me, register: register,
    homeFor: homeFor, hallById: hallById, floorCfg: floorCfg, floorLabel: floorLabel, roomId: roomId, roomInfo: roomInfo,
    roomsOnFloor: roomsOnFloor, currentAssignment: currentAssignment, activeAssignments: activeAssignments,
    occupants: occupants, roomProblem: roomProblem, isExecUser: isExecUser, appFor: appFor, canSelectRoom: canSelectRoom,
    submitApplication: submitApplication, canDecide: canDecide, decideVerification: decideVerification,
    pendingVerificationsFor: pendingVerificationsFor, assignRoom: assignRoom, requestSwitch: requestSwitch,
    decideSwitch: decideSwitch, moveOut: moveOut, reportIncident: reportIncident, escalateIncident: escalateIncident,
    resolveIncident: resolveIncident, addCharge: addCharge, markPaid: markPaid, feesFor: feesFor, owed: owed,
    designateSrc: designateSrc,
    ui: { h: h, clear: clear, money: money, fdate: fdate, badge: badge, statusKind: statusKind, toast: toast,
      empty: empty, table: table, guard: guard, tabs: tabs, renderNav: renderNav }
  };
})(typeof window !== "undefined" ? window : globalThis);
