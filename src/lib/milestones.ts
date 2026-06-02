import type { Category, Effort, Frequency } from '@/lib/types'

export interface MilestoneTask {
  title: string
  category: Category
  frequency: Frequency
  effort: Effort
}

export interface Milestone {
  id: string
  title: string
  description: string
  date: Date
  icon: string
  suggestedTasks?: MilestoneTask[]
}

// In England, children start Reception in the September of the school year in which they turn 5.
// School year runs Sep–Aug. A child born Jun 2022 turns 5 in Jun 2027 (before Sep) so starts Sep 2026.
// A child born Oct 2022 turns 5 in Oct 2027 (after Sep) so starts Sep 2027.
function primarySchoolStartYear(birthday: string): number | null {
  const birth = new Date(birthday + 'T00:00:00')
  if (isNaN(birth.getTime())) return null
  const fifth = new Date(birthday + 'T00:00:00')
  fifth.setFullYear(fifth.getFullYear() + 5)
  // September is month 8 (0-indexed)
  return fifth.getMonth() >= 8 ? fifth.getFullYear() : fifth.getFullYear() - 1
}

function age(birth: Date, years: number): Date {
  const d = new Date(birth)
  d.setFullYear(d.getFullYear() + years)
  return d
}

function ageMonths(birth: Date, months: number): Date {
  const d = new Date(birth)
  d.setMonth(d.getMonth() + months)
  return d
}

const VAX_TASKS: MilestoneTask[] = [
  { title: 'Book GP vaccination appointment', category: 'admin', frequency: 'one-off', effort: 'low' },
  { title: 'Update Red Book after vaccinations', category: 'admin', frequency: 'one-off', effort: 'low' },
]

const DENTAL_TASKS: MilestoneTask[] = [
  { title: 'Register child with NHS dentist', category: 'admin', frequency: 'one-off', effort: 'low' },
  { title: 'Book first dental check-up', category: 'admin', frequency: 'one-off', effort: 'low' },
]

const ANNUAL_SUPPLIES_TASKS: MilestoneTask[] = [
  { title: 'Check school uniform still fits', category: 'chores', frequency: 'annual', effort: 'low' },
  { title: 'Order replacement uniform items', category: 'errands', frequency: 'annual', effort: 'low' },
  { title: 'Restock stationery and pencil case', category: 'errands', frequency: 'annual', effort: 'low' },
  { title: 'Check PE kit is complete', category: 'chores', frequency: 'annual', effort: 'low' },
]

const HOLIDAY_PLAN_TASKS: MilestoneTask[] = [
  { title: 'Research summer holiday clubs and camps', category: 'planning', frequency: 'annual', effort: 'medium' },
  { title: 'Book summer holiday childcare', category: 'admin', frequency: 'annual', effort: 'medium' },
  { title: 'Arrange family cover for school holidays', category: 'planning', frequency: 'annual', effort: 'low' },
]

export function getMilestonesForChild(birthday: string): Milestone[] {
  const birth = new Date(birthday + 'T00:00:00')
  if (isNaN(birth.getTime())) return []

  const primaryYear = primarySchoolStartYear(birthday)
  if (primaryYear === null) return []

  const secondaryYear = primaryYear + 7

  const milestones: Milestone[] = [
    // ── Vaccinations ───────────────────────────────────────────
    {
      id: 'vax-8w',
      title: '8-week vaccinations',
      description: 'Book GP appointment for 6-in-1, rotavirus, and MenB vaccines.',
      date: ageMonths(birth, 2),
      icon: '💉',
      suggestedTasks: VAX_TASKS,
    },
    {
      id: 'vax-12w',
      title: '12-week vaccinations',
      description: '6-in-1 2nd dose, rotavirus 2nd dose, and PCV.',
      date: ageMonths(birth, 3),
      icon: '💉',
      suggestedTasks: VAX_TASKS,
    },
    {
      id: 'vax-16w',
      title: '16-week vaccinations',
      description: '6-in-1 3rd dose and MenB 2nd dose.',
      date: ageMonths(birth, 4),
      icon: '💉',
      suggestedTasks: VAX_TASKS,
    },
    {
      id: 'vax-1yr',
      title: '1-year vaccinations',
      description: 'Hib/MenC booster, MMR, PCV booster, and MenB booster. Check your Red Book for due dates.',
      date: age(birth, 1),
      icon: '💉',
      suggestedTasks: VAX_TASKS,
    },

    // ── Health ─────────────────────────────────────────────────
    {
      id: 'check-1yr',
      title: '1-year health review',
      description: 'Health visitor check at 12 months covering development, growth, and vision.',
      date: age(birth, 1),
      icon: '👶',
      suggestedTasks: [
        { title: 'Book 1-year health visitor review', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'dental-first',
      title: 'First dental check-up',
      description: 'Register with an NHS dentist and book the first check-up. NHS dental care is free for children under 18 — no excuse to delay.',
      date: ageMonths(birth, 12),
      icon: '🦷',
      suggestedTasks: DENTAL_TASKS,
    },
    {
      id: 'check-2yr',
      title: '2-year development review',
      description: 'Health visitor developmental check — language, movement, and social skills.',
      date: age(birth, 2),
      icon: '🩺',
      suggestedTasks: [
        { title: 'Book 2-year health visitor review', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'vax-3yr4mo',
      title: '3-year 4-month vaccinations',
      description: 'MMR 2nd dose and 4-in-1 pre-school booster (diphtheria, tetanus, whooping cough, polio).',
      date: ageMonths(birth, 40),
      icon: '💉',
      suggestedTasks: VAX_TASKS,
    },
    {
      id: 'eye-test',
      title: 'Pre-school eye test',
      description: 'Book a free NHS eye test before school starts. Undetected vision problems affect reading — much easier to catch and fix early.',
      date: new Date(primaryYear - 1, 3, 1), // April before starting school
      icon: '👁️',
      suggestedTasks: [
        { title: 'Book pre-school NHS eye test', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },

    // ── Primary school ─────────────────────────────────────────
    {
      id: 'pri-catchment',
      title: 'Check primary school catchment areas',
      description: "Research which schools you fall within based on your address — catchment boundaries change and aren't always obvious from maps. Check your council's admissions pages directly.",
      date: new Date(primaryYear - 1, 7, 1), // Aug of year before
      icon: '📍',
      suggestedTasks: [
        { title: 'Check catchment areas on council admissions website', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Measure walking distance to preferred schools', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'pri-research',
      title: 'Start researching primary schools',
      description: 'Visit open days and check Ofsted ratings. Applications open around October — this is the time to visit and ask questions.',
      date: new Date(primaryYear - 1, 8, 1), // Sep of year before
      icon: '🏫',
      suggestedTasks: [
        { title: 'Check Ofsted reports for local primary schools', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Attend primary school open days', category: 'planning', frequency: 'one-off', effort: 'medium' },
        { title: 'Ask parents in the area for school recommendations', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'pri-apply',
      title: 'Apply for primary school place',
      description: 'England deadline: 15 January. Apply through your local council — late applications risk missing your preferred schools.',
      date: new Date(primaryYear, 0, 15), // 15 Jan of start year
      icon: '📝',
      suggestedTasks: [
        { title: 'Submit primary school application on council portal', category: 'admin', frequency: 'one-off', effort: 'medium' },
        { title: 'Confirm primary school application received', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'pri-offer',
      title: 'Primary school offer day',
      description: "National Offer Day is 16 April — you'll find out which school your child has been allocated.",
      date: new Date(primaryYear, 3, 16), // 16 Apr
      icon: '📬',
      suggestedTasks: [
        { title: 'Accept primary school place', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'pri-uniform',
      title: 'Buy school uniform & supplies',
      description: 'Order uniform, book bag, PE kit, and stationery. Some items sell out — order early.',
      date: new Date(primaryYear, 6, 1), // 1 Jul (2 months before)
      icon: '🎒',
      suggestedTasks: [
        { title: 'Measure child and order school uniform', category: 'errands', frequency: 'one-off', effort: 'medium' },
        { title: 'Buy PE kit and school shoes', category: 'errands', frequency: 'one-off', effort: 'medium' },
        { title: 'Get school bag and stationery', category: 'errands', frequency: 'one-off', effort: 'low' },
        { title: 'Order iron-on name labels', category: 'errands', frequency: 'one-off', effort: 'low' },
        { title: 'Label all uniform and kit', category: 'chores', frequency: 'one-off', effort: 'medium' },
      ],
    },
    {
      id: 'pri-start',
      title: 'First day at primary school',
      description: 'Reception year begins. Many schools do a staggered start in the first week.',
      date: new Date(primaryYear, 8, 1), // 1 Sep
      icon: '🎉',
      suggestedTasks: [
        { title: 'Pack school bag for first day', category: 'chores', frequency: 'one-off', effort: 'low' },
        { title: 'Agree school run plan with household', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Save school office number and email', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },

    // ── Passport ───────────────────────────────────────────────
    {
      id: 'passport-5',
      title: "Renew child's passport",
      description: "UK children's passports are valid for 5 years. Apply 6 weeks before any planned travel.",
      date: age(birth, 5),
      icon: '🛂',
      suggestedTasks: [
        { title: 'Book child passport photos', category: 'errands', frequency: 'one-off', effort: 'low' },
        { title: 'Gather documents for passport renewal', category: 'admin', frequency: 'one-off', effort: 'low' },
        { title: 'Submit child passport renewal application', category: 'admin', frequency: 'one-off', effort: 'medium' },
      ],
    },

    // ── Secondary school ───────────────────────────────────────
    {
      id: 'sec-catchment',
      title: 'Check secondary school catchment areas',
      description: "Secondary catchment distances are often much smaller than primary. Check your council's admissions criteria — some schools use proximity, others use criteria like siblings or faith.",
      date: new Date(secondaryYear - 1, 7, 1), // Aug of year before
      icon: '📍',
      suggestedTasks: [
        { title: 'Check secondary school catchment distances on council site', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Check sibling and faith admissions criteria', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'sec-research',
      title: 'Start researching secondary schools',
      description: 'Attend open evenings — most schools hold them in September and October of Year 6.',
      date: new Date(secondaryYear - 1, 8, 1), // Sep of year before
      icon: '🏫',
      suggestedTasks: [
        { title: 'Check Ofsted reports for local secondary schools', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Attend secondary school open evenings', category: 'planning', frequency: 'one-off', effort: 'medium' },
        { title: 'Ask Year 7 parents for recommendations', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'sec-apply',
      title: 'Apply for secondary school place',
      description: 'England deadline: 31 October. Apply through your local council.',
      date: new Date(secondaryYear - 1, 9, 31), // 31 Oct of year before
      icon: '📝',
      suggestedTasks: [
        { title: 'Submit secondary school application on council portal', category: 'admin', frequency: 'one-off', effort: 'medium' },
        { title: 'Confirm secondary school application received', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'sec-offer',
      title: 'Secondary school offer day',
      description: "National Offer Day for Year 7 is 1 March — you'll receive your allocation.",
      date: new Date(secondaryYear, 2, 1), // 1 Mar
      icon: '📬',
      suggestedTasks: [
        { title: 'Accept secondary school place', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'sec-uniform',
      title: 'Buy secondary school uniform & supplies',
      description: 'Secondary uniform often differs significantly from primary — check the school list carefully.',
      date: new Date(secondaryYear, 6, 1), // 1 Jul
      icon: '🎒',
      suggestedTasks: [
        { title: 'Get secondary school uniform list from school', category: 'admin', frequency: 'one-off', effort: 'low' },
        { title: 'Order secondary school uniform', category: 'errands', frequency: 'one-off', effort: 'medium' },
        { title: 'Buy secondary school bag and stationery', category: 'errands', frequency: 'one-off', effort: 'medium' },
        { title: 'Label all secondary uniform and kit', category: 'chores', frequency: 'one-off', effort: 'medium' },
      ],
    },
    {
      id: 'sec-start',
      title: 'First day at secondary school',
      description: 'Year 7 begins — a big transition. Many schools run induction days beforehand.',
      date: new Date(secondaryYear, 8, 1), // 1 Sep
      icon: '🎓',
      suggestedTasks: [
        { title: 'Agree travel plan to secondary school', category: 'planning', frequency: 'one-off', effort: 'low' },
        { title: 'Save secondary school office contact details', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },

    // ── Vaccinations (school age) ──────────────────────────────
    {
      id: 'vax-hpv',
      title: 'HPV vaccination (Year 8)',
      description: 'HPV vaccine offered in school in Year 8 (age ~12-13). Two doses over 6 months. Protects against cervical and other cancers — check the school has your consent form.',
      date: new Date(secondaryYear + 1, 8, 1), // Sep of Year 8
      icon: '💉',
      suggestedTasks: [
        { title: 'Return HPV vaccine consent form to school', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'vax-teen',
      title: 'Teenage booster vaccinations (Year 9)',
      description: '3-in-1 teenage booster (tetanus, diphtheria, polio) and MenACWY meningitis vaccine, offered in school in Year 9.',
      date: new Date(secondaryYear + 2, 8, 1), // Sep of Year 9
      icon: '💉',
      suggestedTasks: [
        { title: 'Return teenage booster consent form to school', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },

    // ── GCSEs ──────────────────────────────────────────────────
    {
      id: 'gcse-options',
      title: 'GCSE subject choices (Year 9)',
      description: 'GCSE options are chosen in Year 9. Research which subjects align with future career interests — some A-level and degree routes require specific GCSEs.',
      date: new Date(secondaryYear + 2, 1, 1), // Feb of Year 9
      icon: '📋',
      suggestedTasks: [
        { title: 'Research GCSE subject requirements for career interests', category: 'planning', frequency: 'one-off', effort: 'medium' },
        { title: 'Book GCSE options meeting at school', category: 'admin', frequency: 'one-off', effort: 'low' },
      ],
    },
    {
      id: 'gcse-exams',
      title: 'GCSE exams (Year 11)',
      description: 'Main GCSE exams in Year 11, May-June. These results shape sixth form, college, and apprenticeship options.',
      date: new Date(secondaryYear + 4, 4, 1), // May of Year 11
      icon: '📝',
      suggestedTasks: [
        { title: 'Set up a quiet study space at home', category: 'planning', frequency: 'one-off', effort: 'medium' },
        { title: 'Check GCSE exam timetable', category: 'admin', frequency: 'one-off', effort: 'low' },
        { title: 'Arrange exam day logistics', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },

    // ── Later milestones ───────────────────────────────────────
    {
      id: 'passport-10',
      title: "Renew child's passport (adult passport)",
      description: "At 16 they'll need an adult passport valid for 10 years.",
      date: age(birth, 16),
      icon: '🛂',
      suggestedTasks: [
        { title: 'Book passport photos', category: 'errands', frequency: 'one-off', effort: 'low' },
        { title: 'Submit adult passport application', category: 'admin', frequency: 'one-off', effort: 'medium' },
      ],
    },
    {
      id: 'post-16',
      title: 'Post-16 education planning',
      description: "Sixth form, college, and apprenticeship applications open in autumn of Year 11. Research open days and application deadlines from October — some popular sixth forms fill up fast.",
      date: new Date(secondaryYear + 4, 9, 1), // Oct of Year 11
      icon: '🎓',
      suggestedTasks: [
        { title: 'Research sixth form and college options', category: 'planning', frequency: 'one-off', effort: 'medium' },
        { title: 'Attend post-16 open evenings', category: 'planning', frequency: 'one-off', effort: 'medium' },
      ],
    },
    {
      id: 'provisional',
      title: 'Apply for provisional driving licence',
      description: 'Eligible to apply 3 months before their 17th birthday. Required before starting lessons.',
      date: (() => { const d = age(birth, 17); d.setMonth(d.getMonth() - 3); return d })(),
      icon: '🚗',
      suggestedTasks: [
        { title: 'Submit provisional driving licence application', category: 'admin', frequency: 'one-off', effort: 'low' },
        { title: 'Research local driving instructors', category: 'planning', frequency: 'one-off', effort: 'low' },
      ],
    },
  ]

  // Annual school supplies check (Years 2–last year of secondary)
  for (let year = primaryYear + 1; year <= secondaryYear + 5; year++) {
    milestones.push({
      id: `supplies-${year}`,
      title: 'Annual school supplies check',
      description: 'Check uniform still fits and restock stationery, PE kit, and any new-year requirements before the new term.',
      date: new Date(year, 6, 15), // mid-July each year
      icon: '📚',
      suggestedTasks: ANNUAL_SUPPLIES_TASKS,
    })
  }

  // Summer holiday childcare planning (every school year)
  for (let year = primaryYear; year <= secondaryYear + 4; year++) {
    milestones.push({
      id: `holiday-plan-${year}`,
      title: 'Plan summer holiday childcare',
      description: 'Book holiday clubs, activity camps, or family cover for the six-week break before spaces fill up. Many popular clubs open bookings in January.',
      date: new Date(year, 2, 1), // March each year (before Easter rush)
      icon: '☀️',
      suggestedTasks: HOLIDAY_PLAN_TASKS,
    })
  }

  return milestones
    .filter(m => !isNaN(m.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function upcomingMilestones(milestones: Milestone[]): Milestone[] {
  const now = new Date()
  return milestones.filter(m => m.date >= now)
}

export function timeUntil(date: Date): string {
  const diffDays = Math.floor((date.getTime() - Date.now()) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays < 14) return `${diffDays}d`
  if (diffDays < 60) return `${Math.round(diffDays / 7)}w`
  if (diffDays < 365) return `${Math.round(diffDays / 30)}mo`
  const years = Math.floor(diffDays / 365)
  const months = Math.round((diffDays % 365) / 30)
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

export function milestoneUrgency(date: Date): 'soon' | 'upcoming' | 'ahead' {
  const diffDays = Math.floor((date.getTime() - Date.now()) / 86_400_000)
  if (diffDays < 60) return 'soon'
  if (diffDays < 365) return 'upcoming'
  return 'ahead'
}
