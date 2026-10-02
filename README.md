# PentVars-Campus-Residence
Pentecost University Campus Residence Management System

Overview

A school management system for campus residency at Pentecost University, built to let students and residence staff manage hall accommodation digitally — from eligibility and fee verification through room assignment, billing, and incident handling.

Halls

Anan Hall — Mixed hall, 5 floors, 30 rooms per floor (150 rooms total).

	•	Ground floor & 1st floor: Ladies
	•	2nd floor & 3rd floor: Boys
	•	4th floor (fifth floor): Currently vacant

Sappho Hall — Boys only, 3 floors (ground, 1st, 2nd).

Yeboah Hall — Girls only, 3 floors (ground, 1st, 2nd).

On every floor except the ground floor, each wing (left and right side) includes rooms reserved for executives — SRC members and hall representatives.

Roles

	•	Student — Regular resident applying for a room.
	•	SRC Member — Student Representative Council member; gets free accommodation. Already has a hall assigned from admission. Approved internally by the hall's SRC representative.
	•	Hall Representatives — Hall President, Deputy, Financial Controller, and others (role is extensible). Have their own designated space in the executive wings.
	•	Hall Master & Deputy — Non-resident staff responsible for a hall's day-to-day operations. Both share equal clearance/permissions.
	•	School Management / Executives — Sit above hall masters. Full visibility across all halls, can approve escalations and issue or approve additional charges.

Eligibility & Fee Verification Flow

	1.	Student must have active/valid student status.
	2.	Student must pay the hall fee (GHS 2,000 — non-refundable, shown as a banner at payment).
	3.	Student uploads payment slip/receipt as proof.
	4.	Verification required from: Hall Master & Deputy, and Hall President & Deputy.
	5.	Once verified, student unlocks room selection.

SRC members follow a parallel path: approved by their hall's SRC representative instead of the fee-verification chain, resulting in a waived fee rather than a payment record.

Room Assignment

	•	Students self-select from available rooms once eligible/verified.
	•	Students may submit a note flagging a person they don't want to room with (soft flag for staff awareness, not a system-enforced block). If a conflict arises, both parties are expected to follow school and hall rules, or the newer student can opt for a different room.
	•	SRC members and hall representatives choose their wing, and may request to room with a hall representative if space allows.
	•	Executive-style rooms (SRC/reps) cap at 3 occupants, though 2 is typical.

Room Switches: Once assigned, a student may request to switch rooms (e.g. due to a roommate conflict). The request is reviewed and approved or denied by the hall representatives — no re-verification of eligibility is needed, since being in a room already confirms it.

Billing & Incidents

	•	Students can view their room, roommates, and any fees/debts owed.
	•	Damage/incident process:
	•	Incident reported and investigated.
	•	If a specific student is found responsible, the charge is billed to that individual.
	•	If no individual is identified, the cost is split evenly across all occupants of the room.

Management Dashboard

	•	Executives/school management have visibility into everything across all three halls: fee verifications, room assignments, incidents.
	•	Dashboard surfaces items needing their action (escalations), rather than requiring them to monitor routine activity handled at the hall level.

Tech Direction (proposed)

	•	Frontend/Backend: Next.js (TypeScript) — single codebase for both.
	•	Database: PostgreSQL (relational — reflects the halls/floors/rooms/students/fees structure well).
	•	ORM: Prisma.

Open Items / Next Steps

	•	Move-out / mid-year room switch process (who approves, what triggers it).
	•	Full role/permission table design (beyond the five roles above).
	•	Database schema and migrations.
	•	API route structure by role.
