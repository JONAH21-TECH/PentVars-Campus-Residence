Database Schema (Draft)

users

	•	id
	•	floor_id → floors
	•	room_number
	•	capacity
	•	status (available | occupied)

room_assignments

	•	id
	•	student_id → students
	•	room_id → rooms
	•	date_assigned
	•	status (active | moved_out)

fees

	•	id
	•	student_id → students
	•	amount
	•	type (hall_fee | damage_charge | other)
	•	status (pending | verified | paid)
	•	payment_slip_url

incidents

	•	id
	•	room_id → rooms
	•	description
	•	status (under_investigation | resolved)
	•	responsible_student_id → students (nullable — null means split across room)