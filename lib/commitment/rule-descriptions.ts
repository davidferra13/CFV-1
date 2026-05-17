import type { CommitmentRule } from './types'

export function describeRule(rule: CommitmentRule): string {
  switch (rule.type) {
    case 'pricing_floor':
      return `Never quote below $${rule.minPerHead} per head`
    case 'margin_floor':
      return `Food cost must stay below ${rule.maxFoodCostPercent}%`
    case 'no_late_discounts':
      return `No discounts within ${rule.freezeDaysBeforeEvent} days of event`
    case 'max_events_per_week':
      return `Maximum ${rule.limit} events per week`
    case 'min_rest_days':
      return `At least ${rule.days} rest days per ${rule.perWeeks} weeks`
    case 'max_consecutive_work_days':
      return `Maximum ${rule.limit} consecutive work days`
    case 'protected_time_lock':
      return `Protected time blocks are locked`
    case 'no_same_day_doubles_after':
      return `No same-day doubles after ${rule.hour}:00`
    case 'allergens_verified_before_confirm':
      return `All allergens must be verified before confirming`
    case 'cross_contamination_check_required':
      return `Cross-contamination check required`
    case 'no_unverified_substitutions':
      return `No unverified ingredient substitutions`
    case 'dietary_summary_sent_before':
      return `Dietary summary sent at least ${rule.days} days before event`
    case 'menu_lock_cooldown':
      return `${rule.hours}-hour cooldown after locking menu`
    case 'max_menu_revisions':
      return `Maximum ${rule.limit} menu revisions per event`
    case 'no_new_dishes_within':
      return `No new dishes within ${rule.days} days of service`
    case 'recipe_required_before_lock':
      return `Recipe required before menu can be locked`
    case 'invoice_within_days':
      return `Invoice within ${rule.days} days of event`
    case 'payment_followup_within_days':
      return `Payment follow-up within ${rule.days} days`
    case 'cost_reconciliation_required':
      return `Cost reconciliation required before closing`
    case 'no_new_events_until_closeout':
      return `No new events while ${rule.maxUnclosed}+ await closeout`
    case 'response_time_sla':
      return `Respond within ${rule.hours} hours`
    case 'cadence_integrity':
      return `Never skip scheduled cadence touchpoints`
    case 'no_radio_silence':
      return `No radio silence beyond ${rule.maxDays} days`
    case 'post_event_followup_within':
      return `Post-event follow-up within ${rule.hours} hours`
    case 'max_guests_without_sous':
      return `Maximum ${rule.limit} guests without a sous chef`
    case 'revenue_concentration_cap':
      return `No single client exceeds ${rule.maxPercent}% of revenue`
    case 'min_prep_time_per_tier':
      return `Minimum prep time enforced per guest count tier`
    case 'min_gap_between_events':
      return `At least ${rule.minutes} minutes between events`
    case 'emergency_contacts_before_confirm':
      return `Emergency contacts required before confirming`
    case 'backup_plan_for_high_value':
      return `Backup plan required for events over $${rule.minEventValue}`
    case 'insurance_current_required':
      return `Insurance must be current`
    case 'equipment_checklist_before_service':
      return `Equipment checklist required before service`
    case 'travel_time_buffer':
      return `${rule.minutes}-minute travel time buffer required`
    case 'travel_plan_before_confirm':
      return `Travel plan required before confirming`
    case 'max_distance_without_overnight':
      return `Maximum ${rule.miles} miles without overnight stay`
    case 'travel_surcharge_required':
      return `Travel surcharge required for distant events`
    case 'weekly_financial_review':
      return `Weekly financial review required`
    case 'quarterly_rate_review':
      return `Quarterly rate review required`
    case 'certification_currency':
      return `All certifications must be current`
    case 'savings_reserve_percent':
      return `${rule.percent}% of revenue to savings reserve`
    case 'no_free_work_tasting_fee':
      return `Minimum $${rule.minFee} tasting fee`
    case 'no_free_work_revision_cap':
      return `${rule.included} revisions included, $${rule.overageFee} each after`
    case 'no_free_work_consultation_fee':
      return `$${rule.minFee} consultation fee after ${rule.afterMinutes} minutes`
    case 'say_no_min_event_value':
      return `Decline events below $${rule.minTotal} total`
    case 'say_no_max_distance':
      return `Decline events beyond ${rule.maxMiles} miles`
    case 'say_no_cancelled_clients_require_prepay':
      return `Previously cancelled clients require prepayment`
    case 'time_of_day_no_responses_after':
      return `No client responses after ${rule.hour}:00`
    case 'time_of_day_no_quotes_after':
      return `No quotes sent after ${rule.hour}:00`
    case 'time_of_day_no_accepts_between':
      return `No event accepts between ${rule.startHour}:00 and ${rule.endHour}:00`
    case 'custom':
      return `Custom: ${rule.description}`
    default:
      return `Unknown commitment rule`
  }
}
