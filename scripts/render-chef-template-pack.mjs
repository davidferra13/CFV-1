#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LIMITS = {
  menuCourses: 4,
  menuComponentsPerCourse: 8,
  dietaryRows: 12,
  groceryStops: 4,
  groceryItemsPerStop: 15,
  groceryOnHand: 10,
  groceryPreSourced: 8,
  prepTasks: 12,
  dayOfTasks: 10,
  arrivalTasks: 8,
  courseFireBlocks: 4,
  courseActionsPerBlock: 5,
  runOfShowRows: 10,
  contingencies: 8,
  packingZoneRows: 10,
  packingEquipmentRows: 10,
  packingChecks: 8,
  closeoutSafetyRows: 8,
  closeoutRows: 8,
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "N/A") {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function assertRequiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required string: ${label}`);
  }
}

function assertRequiredNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Missing required number: ${label}`);
  }
}

function truncate(label, rows, limit, warnings) {
  if (rows.length > limit) {
    warnings.push(`${label}: truncated ${rows.length} -> ${limit}`);
    return rows.slice(0, limit);
  }
  return rows;
}

function checkRows(rows, emptyFallback) {
  if (!rows.length) return [`- [ ] ${emptyFallback}`];
  return rows.map((row) => `- [ ] ${row}`);
}

function bulletRows(rows, emptyFallback) {
  if (!rows.length) return [`- ${emptyFallback}`];
  return rows.map((row) => `- ${row}`);
}

function renderMenuSheet(input, warnings) {
  const courses = truncate(
    "menu.courses",
    toArray(input.menu?.courses),
    LIMITS.menuCourses,
    warnings
  );
  const dietary = truncate(
    "dietary_matrix",
    toArray(input.dietary_matrix),
    LIMITS.dietaryRows,
    warnings
  );

  const foh = courses
    .map((course) => {
      return `${normalizeText(course.course_label)} - ${normalizeText(course.title)}\n${normalizeText(course.foh_description)}`;
    })
    .join("\n\n");

  const boh = courses
    .map((course) => {
      const components = truncate(
        `menu.components (${normalizeText(course.course_label)})`,
        toArray(course.components),
        LIMITS.menuComponentsPerCourse,
        warnings
      );
      const lines = components.map((component, index) => {
        const note = component.note ? ` (${component.note})` : "";
        return `${index + 1}. ${normalizeText(component.name)} - ${normalizeText(component.method)} - ${normalizeText(component.where_done)}${note}`;
      });
      return `${normalizeText(course.course_label)} - ${normalizeText(course.title)} (${components.length} components)\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const dietaryTable = [
    "| Guest | Hard No | Allergy | Plate Notes |",
    "| --- | --- | --- | --- |",
    ...(
      dietary.length
        ? dietary.map(
            (row) =>
              `| ${normalizeText(row.guest)} | ${normalizeText(row.hard_no)} | ${normalizeText(row.allergy)} | ${normalizeText(row.plate_notes)} |`
          )
        : ["| N/A | None | None | None |"]
    ),
  ].join("\n");

  const totalComponents = courses.reduce((count, course) => {
    const components = truncate(
      `menu.components (${normalizeText(course.course_label)})`,
      toArray(course.components),
      LIMITS.menuComponentsPerCourse,
      warnings
    );
    return count + components.length;
  }, 0);

  const dietaryFlags = dietary.filter((row) => {
    const hardNo = normalizeText(row.hard_no, "none").toLowerCase();
    const allergy = normalizeText(row.allergy, "none").toLowerCase();
    return hardNo !== "none" || allergy !== "none";
  }).length;

  return `# MENU SHEET (FOH + BOH)

${input.event.title} | ${input.event.guest_count} Guests | ${input.event.date_label} | ${input.event.address_label} | Arrive ${input.event.arrive_time} | Serve ${input.event.serve_time}

## FRONT OF HOUSE

${foh || "Course list not provided"}

## BACK OF HOUSE - COMPONENT BREAKDOWN

${boh || "No BOH components provided"}

## DIETARY + ALLERGEN MATRIX

${dietaryTable}

## SERVICE SUMMARY

${totalComponents} total components | ${dietaryFlags} dietary flags | ${normalizeText(input.service_style)}
`;
}

function renderGrocerySheet(input, warnings) {
  const stops = truncate(
    "grocery.stops",
    toArray(input.grocery?.stops),
    LIMITS.groceryStops,
    warnings
  );
  const preSourced = truncate(
    "grocery.presourced_items",
    toArray(input.grocery?.presourced_items),
    LIMITS.groceryPreSourced,
    warnings
  );
  const onHand = truncate(
    "grocery.on_hand",
    toArray(input.grocery?.on_hand),
    LIMITS.groceryOnHand,
    warnings
  );

  const stopBlocks =
    stops.length === 0
      ? "## STOP 1 - No store configured\n\n- [ ] Add store and item rows"
      : stops
          .map((stop, stopIndex) => {
            const items = truncate(
              `grocery.stops[${stopIndex}].items`,
              toArray(stop.items),
              LIMITS.groceryItemsPerStop,
              warnings
            );
            const sectionBuckets = new Map();
            for (const item of items) {
              const section = normalizeText(item.section, "UNSORTED");
              if (!sectionBuckets.has(section)) sectionBuckets.set(section, []);
              sectionBuckets.get(section).push(item);
            }
            const sections = Array.from(sectionBuckets.entries()).map(([section, sectionItems]) => {
              const lines = checkRows(
                sectionItems.map(
                  (row) =>
                    `${normalizeText(row.item)} | ${normalizeText(row.qty)} | ${normalizeText(row.course)} | Alt: ${normalizeText(row.backup)}`
                ),
                "No item rows"
              ).join("\n");
              return `${section}\n${lines}`;
            });
            return `## STOP ${stopIndex + 1} - ${normalizeText(stop.name)}\n\n${sections.join("\n\n")}`;
          })
          .join("\n\n");

  const presourcedBlock = preSourced.length
    ? preSourced
        .map(
          (row) =>
            `- ${normalizeText(row.item)} | ${normalizeText(row.qty)} | ${normalizeText(row.source)}`
        )
        .join("\n")
    : "- None";

  const onHandBlock = bulletRows(onHand, "None listed").join("\n");

  const buyingNotes = input.grocery?.buying_notes ?? {};
  const allergyChecks = normalizeText(buyingNotes.allergy_checks, "Not provided");
  const brandConstraints = normalizeText(buyingNotes.brand_constraints, "Not provided");
  const budgetCeiling = normalizeText(buyingNotes.budget_ceiling, "Not provided");

  const totalItems = stops.reduce((count, stop, stopIndex) => {
    const rows = truncate(
      `grocery.stops[${stopIndex}].items`,
      toArray(stop.items),
      LIMITS.groceryItemsPerStop,
      warnings
    );
    return count + rows.length;
  }, 0);

  return `# GROCERY LIST (SHOPPING)

${input.event.title} | ${input.event.guest_count} Guests | Shop Date ${input.event.shop_date} | Arrive ${input.event.arrive_time}

${stopBlocks}

## PRE-SOURCED / ALREADY SECURED

${presourcedBlock}

## ON HAND / DO NOT BUY

${onHandBlock}

## BUYING NOTES

- Allergy-critical item checks: ${allergyChecks}
- Brand constraints: ${brandConstraints}
- Budget ceiling: ${budgetCeiling}

Footer: ${totalItems} buy items | ${stops.length} stops | Verify substitutions before checkout
`;
}

function renderPrepServiceSheet(input, warnings) {
  const prepTasks = truncate(
    "prep_service.prep_tasks",
    toArray(input.prep_service?.prep_tasks),
    LIMITS.prepTasks,
    warnings
  );
  const dayOfTasks = truncate(
    "prep_service.day_of_tasks",
    toArray(input.prep_service?.day_of_tasks),
    LIMITS.dayOfTasks,
    warnings
  );
  const arrival = truncate(
    "prep_service.arrival_tasks",
    toArray(input.prep_service?.arrival_tasks),
    LIMITS.arrivalTasks,
    warnings
  );
  const fireBlocks = truncate(
    "prep_service.course_fire_actions",
    toArray(input.prep_service?.course_fire_actions),
    LIMITS.courseFireBlocks,
    warnings
  );
  const runRows = truncate(
    "prep_service.run_of_show",
    toArray(input.prep_service?.run_of_show),
    LIMITS.runOfShowRows,
    warnings
  );
  const contingencies = truncate(
    "prep_service.contingencies",
    toArray(input.prep_service?.contingencies),
    LIMITS.contingencies,
    warnings
  );

  const prepLines = checkRows(
    prepTasks.map((row) => `${normalizeText(row.task)} - ${normalizeText(row.target_finish)}`),
    "No prep tasks listed"
  ).join("\n");

  const dayOfLines = checkRows(
    dayOfTasks.map((row) => `${normalizeText(row.task)} - ${normalizeText(row.target_finish)}`),
    "No day-of tasks listed"
  ).join("\n");

  const arrivalLines = checkRows(arrival, "No arrival tasks listed").join("\n");

  const fireSections =
    fireBlocks.length === 0
      ? "Course Fire\n- [ ] No course fire actions listed"
      : fireBlocks
          .map((block) => {
            const actions = truncate(
              `prep_service.course_fire_actions.actions (${normalizeText(block.course_label)})`,
              toArray(block.actions),
              LIMITS.courseActionsPerBlock,
              warnings
            );
            return `${normalizeText(block.course_label)}\n${checkRows(actions, "No actions listed").join("\n")}`;
          })
          .join("\n\n");

  const runTable = [
    "| Time | Action | Owner | Done |",
    "| --- | --- | --- | --- |",
    ...(
      runRows.length
        ? runRows.map(
            (row) =>
              `| ${normalizeText(row.time)} | ${normalizeText(row.action)} | ${normalizeText(row.owner)} | [ ] |`
          )
        : ["| N/A | No run-of-show rows | N/A | [ ] |"]
    ),
  ].join("\n");

  return `# PREP + SERVICE SHEET

${input.event.title} | ${input.event.guest_count} Guests | Leave ${input.event.leave_time} | Arrive ${input.event.arrive_time} | Serve ${input.event.serve_time}

## AT HOME PREP

D-2 / D-1
${prepLines}

DAY OF (BEFORE DEPART)
${dayOfLines}
- [ ] Label and verify all containers
- [ ] Transfer by zone: cold / frozen / room temp / fragile

## ON ARRIVAL - START IMMEDIATELY

${arrivalLines}

## COURSE FIRE PLAN

${fireSections}

## RUN OF SHOW

${runTable}

## CONTINGENCIES

${bulletRows(contingencies, "No contingencies listed").join("\n")}
`;
}

function renderPackingSheet(input, warnings) {
  const cold = truncate("packing.cold", toArray(input.packing?.cold), LIMITS.packingZoneRows, warnings);
  const frozen = truncate(
    "packing.frozen",
    toArray(input.packing?.frozen),
    LIMITS.packingZoneRows,
    warnings
  );
  const roomTemp = truncate(
    "packing.room_temp",
    toArray(input.packing?.room_temp),
    LIMITS.packingZoneRows,
    warnings
  );
  const fragile = truncate(
    "packing.fragile",
    toArray(input.packing?.fragile),
    LIMITS.packingZoneRows,
    warnings
  );
  const equipmentBring = truncate(
    "packing.equipment_bring",
    toArray(input.packing?.equipment_bring),
    LIMITS.packingEquipmentRows,
    warnings
  );
  const equipmentVenue = truncate(
    "packing.equipment_venue",
    toArray(input.packing?.equipment_venue),
    LIMITS.packingEquipmentRows,
    warnings
  );
  const checks = truncate(
    "packing.final_car_check",
    toArray(input.packing?.final_car_check),
    LIMITS.packingChecks,
    warnings
  );

  return `# PACKING LIST (TRANSPORT)

${input.event.title} | Depart ${input.event.leave_time} | Destination ${input.event.address_label}

## COOLER - COLD

${checkRows(cold, "No cold items listed").join("\n")}

## COOLER - FROZEN (PACK LAST)

${checkRows(frozen, "No frozen items listed").join("\n")}

## DRY BAG - ROOM TEMP

${checkRows(roomTemp, "No room-temp items listed").join("\n")}

## FRAGILE - UPRIGHT / NO STACK

${checkRows(fragile, "No fragile items listed").join("\n")}

## EQUIPMENT + SMALLWARES

Bring
${checkRows(equipmentBring, "No bring items listed").join("\n")}

Venue has
${bulletRows(equipmentVenue, "No venue equipment listed").join("\n")}

## LOAD ORDER + ACCESS

Load order: ${toArray(input.packing?.load_order).map((x) => normalizeText(x)).join(" -> ")}
Route: ${toArray(input.packing?.route).map((x) => normalizeText(x)).join(" -> ")}
Parking / access: ${normalizeText(input.packing?.parking_access, "Not provided")}

## FINAL CAR CHECK

${checkRows(checks, "No final checks listed").join("\n")}
`;
}

function renderCloseoutSheet(input, warnings) {
  const closeout = input.closeout ?? {};
  const safety = truncate(
    "closeout.food_safety_rows",
    toArray(closeout.food_safety_rows),
    LIMITS.closeoutSafetyRows,
    warnings
  );
  const leftovers = truncate(
    "closeout.leftover_actions",
    toArray(closeout.leftover_actions),
    LIMITS.closeoutRows,
    warnings
  );
  const leftWithClient = truncate(
    "closeout.left_with_client",
    toArray(closeout.left_with_client),
    LIMITS.closeoutRows,
    warnings
  );
  const reset = truncate(
    "closeout.reset_and_admin",
    toArray(closeout.reset_and_admin),
    LIMITS.closeoutRows,
    warnings
  );

  const safetyRows = [
    "| Checkpoint | Target | Actual | Time | Initial |",
    "| --- | --- | --- | --- | --- |",
    ...(
      safety.length
        ? safety.map(
            (row) => `| ${normalizeText(row.checkpoint)} | ${normalizeText(row.target)} | [ ] | [ ] | [ ] |`
          )
        : ["| N/A | N/A | [ ] | [ ] | [ ] |"]
    ),
  ].join("\n");

  const leftRows = leftWithClient.length
    ? leftWithClient
        .map(
          (row) =>
            `- ${normalizeText(row.item)} | ${normalizeText(row.storage)} | ${normalizeText(row.reheat)}`
        )
        .join("\n")
    : "- None listed";

  return `# CLOSEOUT SHEET (OPTIONAL EXTENSION)

${normalizeText(input.event.title)} | ${normalizeText(input.event.date_label)} | Service End ${normalizeText(input.event.service_end_time, "N/A")} | Closeout Complete ${normalizeText(input.event.closeout_complete_time, "N/A")}

## FOOD SAFETY LOG

${safetyRows}

## LEFTOVERS + LABELING

${checkRows(leftovers, "No leftover actions listed").join("\n")}

Left with client:
${leftRows}

## KITCHEN RESET + ADMIN

${checkRows(reset, "No reset/admin tasks listed").join("\n")}
`;
}

function validateInput(input) {
  assertRequiredString(input?.event?.title, "event.title");
  assertRequiredNumber(input?.event?.guest_count, "event.guest_count");
  assertRequiredString(input?.event?.date_label, "event.date_label");
  assertRequiredString(input?.event?.address_label, "event.address_label");
  assertRequiredString(input?.event?.arrive_time, "event.arrive_time");
  assertRequiredString(input?.event?.serve_time, "event.serve_time");
  assertRequiredString(input?.event?.leave_time, "event.leave_time");
  assertRequiredString(input?.event?.shop_date, "event.shop_date");
  assertRequiredString(input?.service_style, "service_style");
}

export function renderTemplatePack(input, options = {}) {
  validateInput(input);
  const includeCloseout = Boolean(options.includeCloseout);
  const warnings = [];
  const files = [
    { name: "01-menu-sheet.md", content: renderMenuSheet(input, warnings) },
    { name: "02-grocery-list.md", content: renderGrocerySheet(input, warnings) },
    { name: "03-prep-service-sheet.md", content: renderPrepServiceSheet(input, warnings) },
    { name: "04-packing-list.md", content: renderPackingSheet(input, warnings) },
  ];

  if (includeCloseout) {
    files.push({ name: "05-closeout-sheet.md", content: renderCloseoutSheet(input, warnings) });
  }

  return { files, warnings };
}

export function writeTemplatePack(inputPath, outputDir, options = {}) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const input = JSON.parse(raw);
  const { files, warnings } = renderTemplatePack(input, options);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(outputDir, file.name), file.content, "utf8");
  }
  return { files, warnings };
}

function parseArgs(argv) {
  const args = {
    input: "",
    out: "",
    includeCloseout: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[i + 1] ?? "";
    if (arg === "--out") args.out = argv[i + 1] ?? "";
    if (arg === "--include-closeout") {
      const raw = (argv[i + 1] ?? "").toLowerCase();
      args.includeCloseout = raw === "true" || raw === "1" || raw === "yes";
    }
  }
  return args;
}

function runCli() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.out) {
    throw new Error(
      "Usage: node scripts/render-chef-template-pack.mjs --input <json> --out <folder> [--include-closeout true|false]"
    );
  }

  const inputPath = path.resolve(args.input);
  const outPath = path.resolve(args.out);
  const { files, warnings } = writeTemplatePack(inputPath, outPath, {
    includeCloseout: args.includeCloseout,
  });

  console.log(`Generated ${files.length} files in ${outPath}`);
  if (warnings.length) {
    console.warn("One-page guardrail warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
