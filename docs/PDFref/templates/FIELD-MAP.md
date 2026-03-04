# Core Packet Field Map

This map aligns each manual template section to JSON keys used by the auto-generator.

## Sheet 1: Menu (FOH + BOH)

- Header line:
  - `event.title`
  - `event.guest_count`
  - `event.date_label`
  - `event.address_label`
  - `event.arrive_time`
  - `event.serve_time`
- Front of house:
  - `menu.courses[].course_label`
  - `menu.courses[].title`
  - `menu.courses[].foh_description`
- Back of house:
  - `menu.courses[].components[].name`
  - `menu.courses[].components[].method`
  - `menu.courses[].components[].where_done`
  - `menu.courses[].components[].note` (optional)
- Dietary matrix:
  - `dietary_matrix[].guest`
  - `dietary_matrix[].hard_no`
  - `dietary_matrix[].allergy`
  - `dietary_matrix[].plate_notes`
- Service summary:
  - Calculated component count from `menu.courses[].components[]`
  - Dietary flag count from `dietary_matrix[]`
  - `service_style`

## Sheet 2: Grocery List

- Header line:
  - `event.title`
  - `event.guest_count`
  - `event.shop_date`
  - `event.arrive_time`
- Stops and items:
  - `grocery.stops[].name`
  - `grocery.stops[].items[].section`
  - `grocery.stops[].items[].item`
  - `grocery.stops[].items[].qty`
  - `grocery.stops[].items[].course`
  - `grocery.stops[].items[].backup`
- Pre-sourced:
  - `grocery.presourced_items[].item`
  - `grocery.presourced_items[].qty`
  - `grocery.presourced_items[].source`
- On hand:
  - `grocery.on_hand[]`
- Buying notes:
  - `grocery.buying_notes.allergy_checks`
  - `grocery.buying_notes.brand_constraints`
  - `grocery.buying_notes.budget_ceiling`

## Sheet 3: Prep + Service

- Header line:
  - `event.title`
  - `event.guest_count`
  - `event.leave_time`
  - `event.arrive_time`
  - `event.serve_time`
- At-home prep:
  - `prep_service.prep_tasks[].task`
  - `prep_service.prep_tasks[].target_finish`
- Day-of:
  - `prep_service.day_of_tasks[].task`
  - `prep_service.day_of_tasks[].target_finish`
- On-arrival tasks:
  - `prep_service.arrival_tasks[]`
- Course fire:
  - `prep_service.course_fire_actions[].course_label`
  - `prep_service.course_fire_actions[].actions[]`
- Run of show:
  - `prep_service.run_of_show[].time`
  - `prep_service.run_of_show[].action`
  - `prep_service.run_of_show[].owner`
- Contingencies:
  - `prep_service.contingencies[]`

## Sheet 4: Packing List

- Header line:
  - `event.title`
  - `event.leave_time`
  - `event.address_label`
- Zones:
  - `packing.cold[]`
  - `packing.frozen[]`
  - `packing.room_temp[]`
  - `packing.fragile[]`
- Equipment:
  - `packing.equipment_bring[]`
  - `packing.equipment_venue[]`
- Transport:
  - `packing.load_order[]`
  - `packing.route[]`
  - `packing.parking_access`
- Final checks:
  - `packing.final_car_check[]`

## Optional Sheet 5: Closeout

- Header line:
  - `event.title`
  - `event.date_label`
  - `event.service_end_time`
  - `event.closeout_complete_time`
- Food safety:
  - `closeout.food_safety_rows[].checkpoint`
  - `closeout.food_safety_rows[].target`
- Leftovers:
  - `closeout.leftover_actions[]`
  - `closeout.left_with_client[].item`
  - `closeout.left_with_client[].storage`
  - `closeout.left_with_client[].reheat`
- Reset/admin checklist:
  - `closeout.reset_and_admin[]`
