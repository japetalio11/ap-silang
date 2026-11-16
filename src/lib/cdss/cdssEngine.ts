export interface CdssVitalsInput {
  bp_systolic?: number | null
  bp_diastolic?: number | null
  pulse_rate_bpm?: number | null
  temperature_celsius?: number | string | null
  danger_signs_observed?: string | null
  has_vaginal_bleeding?: boolean
  has_fever?: boolean
  has_pallor?: boolean
  has_edema?: boolean
  visit_id?: string
}

export interface CdssMotherInput {
  age?: number | null
}

export interface CdssPregnancyInput {
  parity?: number | null
  prev_caesarean?: boolean
  previous_delivery_history?: string | null
  pph_history?: boolean
  stillbirth_history?: boolean
  consecutive_miscarriages?: boolean
  has_heart_disease?: boolean
  has_diabetes?: boolean
  has_tb?: boolean
  has_asthma?: boolean
  has_goiter?: boolean
}

export interface CdssBaselineVisitInput {
  visit_id?: string
  bp_systolic?: number | null
  bp_diastolic?: number | null
}

export interface CdssAssessmentResult {
  tews_score: number
  risk_level: "LOW" | "MODERATE" | "HIGH"
  risk_level_label: "Low Risk" | "Moderate Risk" | "High Risk"
  max_vital_score: number
  velocity_multiplier: number
  demographic_weight: number
  triggers: string[]
  protocols: string[]
}

export const scoreSystolic = (sys?: number | null): number => {
  if (sys === null || sys === undefined || Number.isNaN(Number(sys))) return 0
  const n = Number(sys)
  if (n < 90) return 3
  if (n <= 139) return 0
  if (n <= 149) return 1
  if (n <= 159) return 2
  return 3
}

export const scoreDiastolic = (dia?: number | null): number => {
  if (dia === null || dia === undefined || Number.isNaN(Number(dia))) return 0
  const n = Number(dia)
  if (n < 50) return 3
  if (n <= 89) return 0
  if (n <= 99) return 1
  if (n <= 109) return 2
  return 3
}

export const scoreHeartRate = (hr?: number | null): number => {
  if (hr === null || hr === undefined || Number.isNaN(Number(hr))) return 0
  const n = Number(hr)
  if (n < 50) return 3
  if (n <= 99) return 0
  if (n <= 109) return 1
  if (n <= 119) return 2
  return 3
}

export const scoreTemperature = (temp?: number | string | null): number => {
  if (temp === null || temp === undefined || temp === "") return 0
  const n = Number(temp)
  if (Number.isNaN(n)) return 0
  if (n < 36.0) return 3
  if (n <= 37.4) return 0
  if (n <= 37.9) return 1
  return 3
}

export const scoreDangerSigns = (dangerSigns?: string | null, vitals: Partial<CdssVitalsInput> = {}): number => {
  if (vitals.has_vaginal_bleeding) return 3
  let score = 0
  if (vitals.has_fever || vitals.has_pallor || vitals.has_edema) {
    score = 2
  }
  if (!dangerSigns) return score
  const lower = dangerSigns.toLowerCase()
  if (
    lower.includes("bleeding") ||
    lower.includes("severe headache") ||
    lower.includes("convulsion") ||
    lower.includes("vision") ||
    lower.includes("seizure") ||
    lower.includes("unconscious")
  ) {
    return 3
  }
  return Math.max(score, 1)
}

export const calculateDemographicWeights = (mother?: CdssMotherInput | null, pregnancy?: CdssPregnancyInput | null): number => {
  let weight = 0
  if (mother?.age != null) {
    const age = Number(mother.age)
    if (age < 19 || age >= 35) {
      weight += 2
    }
  }
  if (pregnancy) {
    if (pregnancy.parity != null && Number(pregnancy.parity) >= 5) {
      weight += 2
    }
    if (pregnancy.prev_caesarean || (pregnancy.previous_delivery_history && pregnancy.previous_delivery_history.toLowerCase().includes("cesarean"))) {
      weight += 3
    }
    if (pregnancy.pph_history) weight += 3
    if (pregnancy.stillbirth_history) weight += 2
    if (pregnancy.consecutive_miscarriages) weight += 2
    if (pregnancy.has_heart_disease) weight += 3
    if (pregnancy.has_diabetes) weight += 2
    if (pregnancy.has_tb) weight += 2
    if (pregnancy.has_asthma) weight += 1
    if (pregnancy.has_goiter) weight += 1
  }
  return weight
}

export const calculateTewsScore = ({
  vitals,
  mother,
  pregnancy,
  baselineVisit,
}: {
  vitals: CdssVitalsInput
  mother?: CdssMotherInput | null
  pregnancy?: CdssPregnancyInput | null
  baselineVisit?: CdssBaselineVisitInput | null
}): CdssAssessmentResult => {
  const triggers: string[] = []
  const sys = vitals.bp_systolic != null ? Number(vitals.bp_systolic) : null
  const dia = vitals.bp_diastolic != null ? Number(vitals.bp_diastolic) : null
  const hr = vitals.pulse_rate_bpm != null ? Number(vitals.pulse_rate_bpm) : null
  const temp = vitals.temperature_celsius != null && vitals.temperature_celsius !== "" ? Number(vitals.temperature_celsius) : null

  const sysScore = scoreSystolic(sys)
  if (sys !== null && !Number.isNaN(sys)) {
    if (sys < 90) triggers.push(`Hypotension: Systolic ${sys} mmHg (< 90)`)
    else if (sys >= 160) triggers.push(`Critical Hypertensive Spike: Systolic ${sys} mmHg (≥ 160)`)
    else if (sys >= 150) triggers.push(`Stage 2 Systolic Elevation: ${sys} mmHg`)
    else if (sys >= 140) triggers.push(`Stage 1 Systolic Elevation: ${sys} mmHg`)
  }

  const diaScore = scoreDiastolic(dia)
  if (dia !== null && !Number.isNaN(dia)) {
    if (dia < 50) triggers.push(`Severe Diastolic Hypotension: ${dia} mmHg (< 50)`)
    else if (dia >= 110) triggers.push(`Critical Diastolic Spike: ${dia} mmHg (≥ 110)`)
    else if (dia >= 100) triggers.push(`Stage 2 Diastolic Elevation: ${dia} mmHg`)
    else if (dia >= 90) triggers.push(`Stage 1 Diastolic Elevation: ${dia} mmHg`)
  }

  const hrScore = scoreHeartRate(hr)
  if (hr !== null && !Number.isNaN(hr)) {
    if (hr < 50) triggers.push(`Maternal Bradycardia: ${hr} bpm (< 50)`)
    else if (hr >= 120) triggers.push(`Severe Maternal Tachycardia: ${hr} bpm (≥ 120)`)
    else if (hr >= 100) triggers.push(`Maternal Tachycardia: ${hr} bpm`)
  }

  const tempScore = scoreTemperature(temp)
  if (temp !== null && !Number.isNaN(temp)) {
    if (temp < 36.0) triggers.push(`Hypothermia: ${temp} °C (< 36.0)`)
    else if (temp >= 38.0) triggers.push(`Pyrexia / Fever: ${temp} °C (≥ 38.0)`)
    else if (temp >= 37.5) triggers.push(`Subfebrile Temperature: ${temp} °C`)
  }

  const dangerScore = scoreDangerSigns(vitals.danger_signs_observed, vitals)
  if (vitals.has_vaginal_bleeding) triggers.push("Danger Sign: Active Vaginal Bleeding")
  if (vitals.has_fever) triggers.push("Danger Sign: High Fever")
  if (vitals.has_pallor) triggers.push("Danger Sign: Severe Pallor")
  if (vitals.has_edema) triggers.push("Danger Sign: Pre-tibial or Facial Edema")
  if (vitals.danger_signs_observed) {
    const obs = String(vitals.danger_signs_observed).trim()
    if (obs && !triggers.some((t) => t.toLowerCase().includes(obs.toLowerCase()))) {
      triggers.push(`Reported Symptoms: ${obs}`)
    }
  }

  const vitalScores = [sysScore, diaScore, hrScore, tempScore, dangerScore]
  const sumVitalScores = vitalScores.reduce((acc, score) => acc + score, 0)
  const maxVitalScore = Math.max(...vitalScores)

  const demographicWeight = calculateDemographicWeights(mother, pregnancy)
  if (mother?.age != null) {
    const age = Number(mother.age)
    if (age < 19) triggers.push(`Adolescent Pregnancy (Age ${age})`)
    else if (age >= 35) triggers.push(`Advanced Maternal Age (Age ${age})`)
  }
  if (pregnancy) {
    if (pregnancy.parity != null && Number(pregnancy.parity) >= 5) triggers.push(`Grand Multipara (Parity ${pregnancy.parity})`)
    if (pregnancy.prev_caesarean) triggers.push("History of Previous Caesarean Delivery")
    if (pregnancy.pph_history) triggers.push("History of Postpartum Hemorrhage")
    if (pregnancy.stillbirth_history) triggers.push("History of Stillbirth")
    if (pregnancy.consecutive_miscarriages) triggers.push("History of Recurrent Miscarriages")
    if (pregnancy.has_heart_disease) triggers.push("Chronic Condition: Heart Disease")
    if (pregnancy.has_diabetes) triggers.push("Chronic Condition: Diabetes Mellitus")
    if (pregnancy.has_tb) triggers.push("Chronic Condition: Tuberculosis")
    if (pregnancy.has_asthma) triggers.push("Chronic Condition: Bronchial Asthma")
    if (pregnancy.has_goiter) triggers.push("Chronic Condition: Goiter / Thyroid Disorder")
  }

  let velocityMultiplier = 0
  if (baselineVisit && baselineVisit.visit_id && baselineVisit.visit_id !== vitals.visit_id) {
    const deltaSys = (sys || 0) - (Number(baselineVisit.bp_systolic) || 0)
    const deltaDia = (dia || 0) - (Number(baselineVisit.bp_diastolic) || 0)
    if (deltaSys >= 30 || deltaDia >= 15) {
      velocityMultiplier = 2
      triggers.push(`Acute Blood Pressure Surge: +${deltaSys} mmHg systolic / +${deltaDia} mmHg diastolic from baseline`)
    }
  }

  const tews = sumVitalScores + demographicWeight + velocityMultiplier

  let riskLevel: "LOW" | "MODERATE" | "HIGH" = "LOW"
  if (tews >= 6 || maxVitalScore >= 3) {
    riskLevel = "HIGH"
  } else if (tews >= 4 || maxVitalScore === 2) {
    riskLevel = "MODERATE"
  }

  const protocols: string[] = []
  if (riskLevel === "HIGH") {
    protocols.push("Immediate physician or obstetrician clinical evaluation")
    protocols.push("Urgent Preeclampsia screen: Order urine protein dipstick and CBC with platelets")
    protocols.push("Prepare referral ticket and transfer checklist for higher-level facility (CEmONC)")
    protocols.push("Schedule close maternal-fetal re-evaluation within 24 to 48 hours")
  } else if (riskLevel === "MODERATE") {
    protocols.push("Shorten visit interval: Re-evaluate blood pressure and clinical vitals within 7 days")
    protocols.push("Verify hemoglobin / hematocrit levels and rule out gestational anemia")
    protocols.push("Review warning signs (severe headache, epigastric pain, blurring of vision)")
    protocols.push("Reinforce adherence to prescribed Iron + Folic Acid and Calcium supplementation")
  } else {
    protocols.push("Continue routine antenatal care schedule (every 4 weeks until 28 weeks)")
    protocols.push("Ensure daily Iron + Folic Acid supplementation adherence")
    protocols.push("Counsel on balanced maternal nutrition and routine fetal movement tracking")
  }

  const risk_level_label: "Low Risk" | "Moderate Risk" | "High Risk" =
    riskLevel === "HIGH" ? "High Risk" : riskLevel === "MODERATE" ? "Moderate Risk" : "Low Risk"

  return {
    tews_score: tews,
    risk_level: riskLevel,
    risk_level_label,
    max_vital_score: maxVitalScore,
    velocity_multiplier: velocityMultiplier,
    demographic_weight: demographicWeight,
    triggers,
    protocols,
  }
}

export const evaluateLocalVisitRisk = (params: {
  vitals: CdssVitalsInput
  mother?: CdssMotherInput | null
  pregnancy?: CdssPregnancyInput | null
  baselineVisit?: CdssBaselineVisitInput | null
  overrideRiskLevel?: string | null
}): CdssAssessmentResult => {
  const result = calculateTewsScore(params)
  if (params.overrideRiskLevel) {
    const norm = params.overrideRiskLevel.toLowerCase()
    if (norm.includes("high") || norm.includes("critical")) {
      return { ...result, risk_level: "HIGH", risk_level_label: "High Risk" }
    }
    if (norm.includes("mod") || norm.includes("med")) {
      return { ...result, risk_level: "MODERATE", risk_level_label: "Moderate Risk" }
    }
    if (norm.includes("low")) {
      return { ...result, risk_level: "LOW", risk_level_label: "Low Risk" }
    }
  }
  return result
}

export interface ClinicalVitalsValidationInput {
  trimester?: number | string | null
  visit_number?: number | string | null
  age_of_gestation_weeks?: number | string | null
  weight_kg?: number | string | null
  temperature_celsius?: number | string | null
  pulse_rate_bpm?: number | string | null
  bp_systolic?: number | string | null
  bp_diastolic?: number | string | null
  fundic_height_cm?: number | string | null
  fetal_heart_tone_bpm?: number | string | null
}

export const validateClinicalVitalsData = (data: ClinicalVitalsValidationInput): string[] => {
  const errors: string[] = []
  const tri = data.trimester !== undefined && data.trimester !== null && data.trimester !== "" ? Number(data.trimester) : undefined
  const vn = data.visit_number !== undefined && data.visit_number !== null && data.visit_number !== "" ? Number(data.visit_number) : undefined
  const aog = data.age_of_gestation_weeks !== undefined && data.age_of_gestation_weeks !== null && data.age_of_gestation_weeks !== "" ? Number(data.age_of_gestation_weeks) : undefined
  const wt = data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== "" ? Number(data.weight_kg) : undefined
  const temp = data.temperature_celsius !== undefined && data.temperature_celsius !== null && data.temperature_celsius !== "" ? Number(data.temperature_celsius) : undefined
  const pulse = data.pulse_rate_bpm !== undefined && data.pulse_rate_bpm !== null && data.pulse_rate_bpm !== "" ? Number(data.pulse_rate_bpm) : undefined
  const sys = data.bp_systolic !== undefined && data.bp_systolic !== null && data.bp_systolic !== "" ? Number(data.bp_systolic) : undefined
  const dia = data.bp_diastolic !== undefined && data.bp_diastolic !== null && data.bp_diastolic !== "" ? Number(data.bp_diastolic) : undefined
  const fh = data.fundic_height_cm !== undefined && data.fundic_height_cm !== null && data.fundic_height_cm !== "" ? Number(data.fundic_height_cm) : undefined
  const fht = data.fetal_heart_tone_bpm !== undefined && data.fetal_heart_tone_bpm !== null && data.fetal_heart_tone_bpm !== "" ? Number(data.fetal_heart_tone_bpm) : undefined

  if (tri !== undefined && (tri < 1 || tri > 3)) {
    errors.push("Trimester must be between 1 and 3.")
  }
  if (vn !== undefined && (vn < 1 || vn > 20)) {
    errors.push("Visit number must be a positive integer (1-20).")
  }
  if (aog !== undefined && (aog < 1 || aog > 45)) {
    errors.push("Age of gestation must be between 1 and 45 weeks.")
  }
  if (wt !== undefined && (wt < 30 || wt > 250)) {
    errors.push("Weight (kg) must be between 30 and 250 kg.")
  }
  if (temp !== undefined && (temp < 30.0 || temp > 45.0)) {
    errors.push("Temperature (°C) must be between 30.0°C and 45.0°C.")
  }
  if (pulse !== undefined && (pulse < 30 || pulse > 250)) {
    errors.push("Pulse rate (BPM) must be between 30 and 250 BPM.")
  }
  if (sys !== undefined && (sys < 50 || sys > 300)) {
    errors.push("Systolic blood pressure must be between 50 and 300 mmHg.")
  }
  if (dia !== undefined && (dia < 30 || dia > 200)) {
    errors.push("Diastolic blood pressure must be between 30 and 200 mmHg.")
  }
  if (sys !== undefined && dia !== undefined && dia >= sys) {
    errors.push("Diastolic BP cannot be equal to or higher than Systolic BP.")
  }
  if (fh !== undefined && (fh < 5 || fh > 60)) {
    errors.push("Fundic height must be between 5 and 60 cm.")
  }
  if (fht !== undefined && (fht < 50 || fht > 220)) {
    errors.push("Fetal heart tone must be between 50 and 220 BPM.")
  }

  return errors
}
