// Config-driven data and pure logic for the Legal Aid Cell triage engine.
// Ported from public/legal_aid_cell_prototype.html (see docs/status_report.md §38.1).

export const stepLabels = ['Safety check', 'About you', 'What happened', 'Your situation', 'A few questions', 'Documents', 'Case summary', 'Connect'];

export const profiles = [
  { id: 'agniveer_serving', label: 'Serving Agniveer' },
  { id: 'agniveer_released', label: 'Released Agniveer' },
  { id: 'ex_serviceman', label: 'Ex-serviceman' },
  { id: 'serving', label: 'Serving personnel' },
  { id: 'widow_nok', label: 'Widow / NOK' },
  { id: 'family_member', label: 'Defence family member' },
  { id: 'other', label: 'Other' },
];

export const services = ['Army', 'Navy', 'Air Force', 'Other'];

export const yesNo = ['Yes', 'No', 'Not sure'];

export const profileFieldsConfig = {
  ex_serviceman: [
    { id: 'releaseYear', label: 'Year of release or retirement', type: 'text', placeholder: 'e.g. 2024' },
    { id: 'releaseType', label: 'Type of release', type: 'text', placeholder: 'e.g. Normal, Invalided, Discharge' },
    { id: 'serviceDuration', label: 'Service duration', type: 'text', placeholder: 'e.g. 15 years' },
    { id: 'ppoAvailable', label: 'PPO (Pension Payment Order) available?', type: 'yesno' },
    { id: 'sparshAccess', label: 'SPARSH (pension disbursement portal) access?', type: 'yesno' },
    { id: 'echsBeneficiary', label: 'ECHS (Ex-servicemen health scheme) beneficiary?', type: 'yesno' },
  ],
  agniveer_serving: [
    { id: 'enrolmentDate', label: 'Date of enrolment', type: 'text', placeholder: 'e.g. Jan 2023' },
    { id: 'releaseDate', label: 'Expected release date', type: 'text', placeholder: 'e.g. Dec 2026' },
    { id: 'serviceDuration', label: 'Service duration so far', type: 'text', placeholder: 'e.g. 2 years' },
    { id: 'injuryDuringService', label: 'Injury or disability during service?', type: 'yesno' },
  ],
  agniveer_released: [
    { id: 'enrolmentDate', label: 'Date of enrolment', type: 'text', placeholder: 'e.g. Jan 2023' },
    { id: 'releaseDate', label: 'Date of release', type: 'text', placeholder: 'e.g. Jan 2027' },
    { id: 'releaseStatus', label: 'Current release status', type: 'text', placeholder: 'e.g. Released, pending clearance' },
    { id: 'sevaNidhiReceived', label: 'Seva Nidhi (Agniveer exit corpus) received?', type: 'yesno' },
    { id: 'serviceCertReceived', label: 'Service certificate received?', type: 'yesno' },
    { id: 'injuryDuringService', label: 'Injury or disability during service?', type: 'yesno' },
  ],
  widow_nok: [
    { id: 'relationship', label: 'Relationship to deceased service member', type: 'text', placeholder: 'e.g. Spouse, Son, Daughter' },
    { id: 'deceasedService', label: 'Service of deceased member', type: 'text', placeholder: 'e.g. Army' },
    { id: 'dateOfDeath', label: 'Date of death', type: 'text', placeholder: 'e.g. March 2023' },
    { id: 'ppoAvailable', label: 'PPO / pension information available?', type: 'yesno' },
    { id: 'familyPensionReceived', label: 'Family pension currently received?', type: 'yesno' },
  ],
  serving: [
    { id: 'serviceDuration', label: 'Years of service so far', type: 'text', placeholder: 'e.g. 8 years' },
  ],
  family_member: [
    { id: 'relationship', label: 'Relationship to service member', type: 'text', placeholder: 'e.g. Spouse, Parent, Child' },
  ],
  other: [],
};

export const legalCategories = [
  { id: 'pension', icon: '₹', title: 'Pension & Veteran Benefits', desc: 'Pension, PPO, SPARSH, disability pension, family pension, arrears and veteran benefits.' },
  { id: 'service', icon: '⚑', title: 'Service & Discharge', desc: 'Service records, discharge, disciplinary action, notices and service-related grievances.' },
  { id: 'agniveer', icon: '★', title: 'Agniveer Matters', desc: 'Release, Seva Nidhi, service documents, injury, disability and other Agniveer entitlements.' },
  { id: 'family', icon: '⌂', title: 'Family & Veteran Welfare', desc: 'Family pension, NOK matters, succession, marriage, maintenance and related concerns.' },
  { id: 'police', icon: '⚠', title: 'Police, Criminal & Fraud', desc: 'FIRs, police matters, arrest, threats, cybercrime and financial fraud.' },
  { id: 'property', icon: '⌁', title: 'Property & Civil Disputes', desc: 'Land, property, loans, consumer disputes, contracts and recovery matters.' },
  { id: 'unknown', icon: '?', title: "I Don't Know", desc: "Tell us what happened and we'll help identify the right category." },
];

export const situationsByCategory = {
  pension: [
    { id: 'pension_stopped', label: 'My pension has stopped', flow: 'pension_stopped_delayed' },
    { id: 'pension_delayed', label: 'My pension is delayed', flow: 'pension_stopped_delayed' },
    { id: 'pension_amount_wrong', label: 'My pension amount is incorrect', flow: 'pension_amount_arrears' },
    { id: 'pension_arrears', label: 'I have not received pension arrears', flow: 'pension_amount_arrears' },
    { id: 'disability_rejected', label: 'My disability pension was rejected', flow: 'disability_pension' },
    { id: 'disability_disputed', label: 'My disability percentage is disputed', flow: 'disability_pension' },
    { id: 'family_pension_problem', label: 'I have a family pension problem', flow: 'family_pension' },
    { id: 'ppo_problem', label: 'I have a PPO problem', flow: 'pension_other' },
    { id: 'sparsh_problem', label: 'I have a SPARSH problem', flow: 'sparsh' },
    { id: 'echs_issue', label: 'I have an ECHS-related issue', flow: 'echs' },
    { id: 'refund_recovery', label: 'I was asked to refund/recover pension money', flow: 'pension_other' },
    { id: 'pension_other', label: 'Other pension or benefit issue', flow: 'pension_other' },
  ],
  service: [
    { id: 'discharge_release', label: 'Discharge / release problem', flow: 'service_disciplinary' },
    { id: 'show_cause', label: 'Show-cause notice', flow: 'service_disciplinary' },
    { id: 'disciplinary_action', label: 'Disciplinary action', flow: 'service_disciplinary' },
    { id: 'court_of_inquiry', label: 'Court of Inquiry', flow: 'service_disciplinary' },
    { id: 'summary_proceedings', label: 'Summary proceedings', flow: 'service_disciplinary' },
    { id: 'service_record_problem', label: 'Service record problem', flow: 'service_disciplinary' },
    { id: 'medical_category_issue', label: 'Medical category issue', flow: 'service_disciplinary' },
    { id: 'pay_recovery_dispute', label: 'Pay / recovery dispute', flow: 'service_disciplinary' },
    { id: 'character_cert_problem', label: 'Character / service certificate problem', flow: 'service_disciplinary' },
    { id: 'service_other', label: 'Other service matter', flow: 'service_disciplinary' },
  ],
  agniveer: [
    { id: 'agniveer_release_problem', label: 'Release problem', flow: 'agniveer_release' },
    { id: 'seva_nidhi_issue', label: 'Seva Nidhi issue', flow: 'agniveer_release' },
    { id: 'agniveer_document_issue', label: 'Service certificate / document issue', flow: 'agniveer_release' },
    { id: 'agniveer_injury', label: 'Injury during service', flow: 'agniveer_injury' },
    { id: 'agniveer_disability', label: 'Disability after injury', flow: 'agniveer_injury' },
    { id: 'agniveer_death', label: 'Death during service / family benefits', flow: 'agniveer_injury' },
    { id: 're_enrolment_issue', label: 'Re-enrolment / continuation issue', flow: 'agniveer_release' },
    { id: 'agniveer_other', label: 'Other Agniveer entitlement', flow: 'agniveer_release' },
  ],
  family: [
    { id: 'family_pension_fw', label: 'Family pension', flow: 'family_pension' },
    { id: 'succession', label: 'Succession / inheritance', flow: 'family_welfare' },
    { id: 'property_family', label: 'Property between family members', flow: 'family_welfare' },
    { id: 'marriage_divorce', label: 'Marriage / divorce', flow: 'family_welfare' },
    { id: 'maintenance', label: 'Maintenance', flow: 'family_welfare' },
    { id: 'childrens_entitlement', label: "Children's entitlement", flow: 'family_welfare' },
    { id: 'death_benefits', label: 'Death benefits', flow: 'family_welfare' },
    { id: 'consumer_dispute_family', label: 'Consumer dispute', flow: 'family_welfare' },
    { id: 'family_other', label: 'Other family matter', flow: 'family_welfare' },
  ],
  police: [
    { id: 'fir', label: 'FIR', flow: 'police_fraud' },
    { id: 'police_complaint', label: 'Police complaint', flow: 'police_fraud' },
    { id: 'arrest_detention', label: 'Arrest / detention', flow: 'police_fraud' },
    { id: 'court_summons', label: 'Court summons', flow: 'police_fraud' },
    { id: 'threat_harassment', label: 'Threat / harassment', flow: 'police_fraud' },
    { id: 'cyber_fraud', label: 'Cyber fraud', flow: 'police_fraud' },
    { id: 'financial_fraud', label: 'Financial fraud', flow: 'police_fraud' },
    { id: 'impersonation_fraud', label: 'Veteran impersonation / fraud', flow: 'police_fraud' },
    { id: 'police_other', label: 'Other', flow: 'police_fraud' },
  ],
  property: [
    { id: 'land_dispute', label: 'Land dispute', flow: 'property_civil' },
    { id: 'encroachment', label: 'Encroachment', flow: 'property_civil' },
    { id: 'possession', label: 'Possession', flow: 'property_civil' },
    { id: 'housing_dispute', label: 'Housing dispute', flow: 'property_civil' },
    { id: 'loan_bank_dispute', label: 'Loan / bank dispute', flow: 'property_civil' },
    { id: 'consumer_dispute', label: 'Consumer dispute', flow: 'property_civil' },
    { id: 'contract_dispute', label: 'Contract dispute', flow: 'property_civil' },
    { id: 'money_recovery', label: 'Money recovery', flow: 'property_civil' },
    { id: 'neighbour_dispute', label: 'Neighbour dispute', flow: 'property_civil' },
    { id: 'property_other', label: 'Other', flow: 'property_civil' },
  ],
};

export const timeframeOptions = ['Within the last month', '1–3 months ago', '3–6 months ago', 'More than 6 months ago', "I'm not sure"];

export const legalFlows = {
  pension_stopped_delayed: {
    questions: [
      { id: 'onsetTime', prompt: 'When did you first notice the problem?', type: 'single', options: timeframeOptions },
      { id: 'wasNormalBefore', prompt: 'Were you receiving the pension normally before this?', type: 'single', options: yesNo },
      { id: 'contacted', prompt: 'Have you contacted anyone about the problem?', type: 'multi', options: ['Bank', 'SPARSH', 'Pension office / department', 'Ex-servicemen welfare office', 'No', 'Other'] },
      { id: 'grievanceRef', prompt: 'Do you have a complaint or grievance reference number?', type: 'single', options: yesNo, showIf: (ctx) => !(ctx.qa.contacted && ctx.qa.contacted.length === 1 && ctx.qa.contacted[0] === 'No') },
    ],
    documents: [
      { id: 'ppo', label: 'PPO / e-PPO' },
      { id: 'pensionStatement', label: 'Recent pension statement' },
      { id: 'bankStatement', label: 'Bank statement showing pension credits' },
      { id: 'sparshComm', label: 'SPARSH communication', showIf: (ctx) => (ctx.qa.contacted || []).includes('SPARSH') },
      { id: 'grievanceRef', label: 'Grievance / reference number', showIf: (ctx) => ctx.qa.grievanceRef === 'Yes' },
      { id: 'correspondence', label: 'Relevant correspondence', defaultChecked: false },
    ],
  },
  pension_amount_arrears: {
    questions: [
      { id: 'whatIncorrect', prompt: 'What appears to be incorrect?', type: 'single', options: ['Pension amount', 'Arrears not paid', 'Rate/revision not applied', 'Recovery/deduction made', 'Other'] },
      { id: 'onsetTime', prompt: 'When did you first notice the difference?', type: 'single', options: timeframeOptions },
      { id: 'previouslyDifferent', prompt: 'Was the amount previously different?', type: 'single', options: yesNo },
      { id: 'writtenExplanation', prompt: 'Have you received any written explanation?', type: 'single', options: ['Yes', 'No'] },
      { id: 'grievanceRaised', prompt: 'Have you raised a grievance?', type: 'single', options: yesNo },
      { id: 'arrearsInvolved', prompt: 'Are arrears involved?', type: 'single', options: yesNo },
      { id: 'recoveryMade', prompt: 'Has any recovery/deduction been made?', type: 'single', options: ['Yes', 'No'] },
    ],
    documents: [
      { id: 'ppo', label: 'PPO / e-PPO' },
      { id: 'pensionStatement', label: 'Pension statement' },
      { id: 'bankStatement', label: 'Bank statement' },
      { id: 'revisionComm', label: 'Pension revision communication', showIf: (ctx) => ctx.qa.writtenExplanation === 'Yes' },
      { id: 'recoveryNotice', label: 'Recovery / deduction notice', showIf: (ctx) => ctx.qa.recoveryMade === 'Yes' },
      { id: 'grievanceCorrespondence', label: 'Grievance correspondence', showIf: (ctx) => ctx.qa.grievanceRaised === 'Yes' },
    ],
  },
  disability_pension: {
    questions: [
      { id: 'problemType', prompt: 'What is the problem with your disability pension?', type: 'single', options: ['My claim was rejected', 'My disability percentage was disputed', 'My pension was partly approved', 'My pension has not started', 'My pension has stopped', 'I was asked to refund money', "I don't understand the decision", 'Other'] },
      { id: 'injuryTiming', prompt: 'When did the disability or injury occur?', type: 'single', options: ['During service', 'At release', 'After release', "I'm not sure"] },
      { id: 'medicalBoard', prompt: 'Was a medical board conducted?', help: 'A medical board formally assesses a service-related injury or disability.', type: 'single', options: yesNo },
      { id: 'medicalBoardOutcome', prompt: 'What was the outcome?', type: 'single', options: ['Disability accepted', 'Disability partly accepted', 'Disability rejected', "I don't understand the finding"], showIf: (ctx) => ctx.qa.medicalBoard === 'Yes' },
      { id: 'hasMedicalBoardDocs', prompt: 'Do you have the medical board documents?', type: 'single', options: ['Yes', 'No'], showIf: (ctx) => ctx.qa.medicalBoard === 'Not sure' },
      { id: 'challenged', prompt: 'Have you challenged the decision?', type: 'single', options: ['No', 'Representation submitted', 'First appeal submitted', 'Second appeal submitted', 'Tribunal/court proceedings', "I'm not sure"] },
    ],
    documents: [
      { id: 'medicalBoard', label: 'Release Medical Board proceedings', showIf: (ctx) => ctx.qa.medicalBoard === 'Yes' || ctx.qa.hasMedicalBoardDocs === 'Yes' },
      { id: 'ppo', label: 'PPO / e-PPO' },
      { id: 'rejectionOrder', label: 'Disability claim / rejection order' },
      { id: 'appeal', label: 'Appeal or representation', showIf: (ctx) => ctx.qa.challenged && ctx.qa.challenged !== 'No' },
      { id: 'medicalDocs', label: 'Relevant medical-board documentation', showIf: (ctx) => ctx.qa.medicalBoard === 'Yes' },
    ],
  },
  sparsh: {
    questions: [
      { id: 'sparshProblem', prompt: 'What is the problem?', type: 'single', options: ['Cannot access account', 'Pension not credited', 'Pension amount incorrect', 'Personal details incorrect', 'Life certificate problem', 'Bank details problem', 'Pension stopped', 'Grievance not resolved', 'Other'] },
      { id: 'onsetTime', prompt: 'When did the problem start?', type: 'single', options: timeframeOptions },
      { id: 'grievanceRaised', prompt: 'Have you raised a SPARSH grievance?', type: 'single', options: yesNo },
      { id: 'grievanceNumber', prompt: 'Do you have the grievance number?', type: 'single', options: ['Yes', 'No'], showIf: (ctx) => ctx.qa.grievanceRaised === 'Yes' },
      { id: 'contactedBank', prompt: 'Have you contacted your bank?', type: 'single', options: ['Yes', 'No'] },
      { id: 'writtenResponse', prompt: 'Have you received any written response?', type: 'single', options: ['Yes', 'No'] },
    ],
    documents: [
      { id: 'ppo', label: 'PPO / e-PPO' },
      { id: 'sparshComm', label: 'SPARSH communication' },
      { id: 'grievanceRef', label: 'Grievance reference', showIf: (ctx) => ctx.qa.grievanceNumber === 'Yes' },
      { id: 'bankStatement', label: 'Bank statement', showIf: (ctx) => ctx.qa.contactedBank === 'Yes' },
      { id: 'correspondence', label: 'Relevant correspondence', showIf: (ctx) => ctx.qa.writtenResponse === 'Yes' },
    ],
  },
  family_pension: {
    questions: [
      { id: 'currentlyReceiving', prompt: 'Are you currently receiving family pension?', type: 'single', options: yesNo },
      { id: 'delayedStopped', prompt: 'Is the pension delayed or stopped?', type: 'single', options: ['Yes', 'No'] },
      { id: 'rejected', prompt: 'Has the pension claim been rejected?', type: 'single', options: yesNo },
      { id: 'eligibilityDifficulty', prompt: 'Are you having difficulty establishing eligibility?', type: 'single', options: ['Yes', 'No'] },
      { id: 'ppoExists', prompt: 'Is there a PPO (Pension Payment Order)?', type: 'single', options: yesNo },
      { id: 'applicationSubmitted', prompt: 'Has any application already been submitted?', type: 'single', options: ['Yes', 'No'] },
      { id: 'writtenResponse', prompt: 'Have you received a written response?', type: 'single', options: ['Yes', 'No'], showIf: (ctx) => ctx.qa.applicationSubmitted === 'Yes' },
    ],
    documents: [
      { id: 'ppo', label: 'PPO / e-PPO', showIf: (ctx) => ctx.qa.ppoExists !== 'No' },
      { id: 'deathCertificate', label: 'Death certificate', showIf: (ctx) => ctx.profile === 'widow_nok' },
      { id: 'correspondence', label: 'Family pension correspondence' },
      { id: 'proofOfRelationship', label: 'Proof of relationship', showIf: (ctx) => ctx.profile === 'widow_nok' },
      { id: 'previousApplications', label: 'Previous applications or rejections', showIf: (ctx) => ctx.qa.applicationSubmitted === 'Yes' },
    ],
  },
  echs: {
    questions: [
      { id: 'echsProblem', prompt: 'What happened?', type: 'single', options: ['Treatment denied', 'Hospital/provider issue', 'Reimbursement problem', 'Card/membership issue', 'Emergency treatment issue', 'Other'] },
      { id: 'onsetTime', prompt: 'When did it happen?', type: 'single', options: timeframeOptions },
      { id: 'facility', prompt: 'Which facility was involved?', type: 'text', placeholder: 'e.g. Polyclinic name or hospital' },
      { id: 'writtenRefusal', prompt: 'Was a written refusal or communication provided?', type: 'single', options: ['Yes', 'No'] },
      { id: 'reimbursementFiled', prompt: 'Was a reimbursement claim filed?', type: 'single', options: ['Yes', 'No', 'Not applicable'] },
    ],
    documents: [
      { id: 'echsCard', label: 'ECHS card / details' },
      { id: 'referral', label: 'Referral', showIf: (ctx) => ['Treatment denied', 'Hospital/provider issue'].includes(ctx.qa.echsProblem) },
      { id: 'bills', label: 'Bills', showIf: (ctx) => ctx.qa.echsProblem === 'Reimbursement problem' || ctx.qa.reimbursementFiled === 'Yes' },
      { id: 'reimbursementApplication', label: 'Reimbursement application', showIf: (ctx) => ctx.qa.reimbursementFiled === 'Yes' },
      { id: 'writtenRefusal', label: 'Written refusal / communication', showIf: (ctx) => ctx.qa.writtenRefusal === 'Yes' },
    ],
  },
  pension_other: {
    questions: [
      { id: 'whatHappened', prompt: 'What happened?', type: 'text', placeholder: 'Briefly describe the problem in your own words' },
      { id: 'onsetTime', prompt: 'When did this happen?', type: 'single', options: timeframeOptions },
      { id: 'writtenNotice', prompt: 'Did you receive anything in writing?', type: 'single', options: yesNo },
      { id: 'actionTaken', prompt: 'Have you already taken any action?', type: 'single', options: ['No', 'Complaint', 'Representation', 'Appeal', 'Other'] },
      { id: 'deadlineHearing', prompt: 'Is there a deadline or hearing?', type: 'single', options: yesNo },
    ],
    documents: [
      { id: 'ppo', label: 'PPO / e-PPO' },
      { id: 'pensionStatement', label: 'Pension statement' },
      { id: 'correspondence', label: 'Relevant correspondence', showIf: (ctx) => ctx.qa.writtenNotice === 'Yes' },
      { id: 'actionRecord', label: 'Record of complaint / representation / appeal', showIf: (ctx) => ctx.qa.actionTaken && ctx.qa.actionTaken !== 'No' },
    ],
  },
  service_disciplinary: {
    questions: [
      { id: 'received', prompt: 'What have you received?', type: 'single', options: ['Notice', 'Show-cause notice', 'Charge sheet', 'Punishment order', 'Inquiry report', 'Discharge order', 'Other', 'Nothing in writing'] },
      { id: 'dateReceived', prompt: 'When did you receive it?', type: 'text', placeholder: 'Approximate date', showIf: (ctx) => ctx.qa.received && ctx.qa.received !== 'Nothing in writing' },
      { id: 'responded', prompt: 'Have you responded or appealed?', type: 'single', options: ['No', 'Yes', "I'm not sure"] },
      { id: 'deadlineHearing', prompt: 'Is there a hearing or deadline coming up?', type: 'single', options: ['Yes', 'No', "I'm not sure"] },
    ],
    documents: [
      { id: 'notice', label: 'Notice', showIf: (ctx) => ctx.qa.received && ctx.qa.received !== 'Nothing in writing' },
      { id: 'chargeSheet', label: 'Charge sheet', showIf: (ctx) => ctx.qa.received === 'Charge sheet' },
      { id: 'order', label: 'Order (punishment / discharge)', showIf: (ctx) => ctx.qa.received === 'Punishment order' || ctx.qa.received === 'Discharge order' },
      { id: 'inquiryDocs', label: 'Inquiry documentation', showIf: (ctx) => ctx.qa.received === 'Inquiry report' },
      { id: 'appeal', label: 'Appeal or representation', showIf: (ctx) => ctx.qa.responded === 'Yes' },
      { id: 'serviceRecords', label: 'Relevant service records', defaultChecked: false },
    ],
  },
  agniveer_release: {
    questions: [
      { id: 'released', prompt: 'Have you already been released?', type: 'single', options: ['Yes', 'No, still serving', "I'm not sure"] },
      { id: 'releaseDate', prompt: 'What was the expected/relevant release date?', type: 'text', placeholder: 'e.g. Jan 2026' },
      { id: 'problem', prompt: 'What is the problem?', type: 'text', placeholder: 'Briefly describe the problem in your own words' },
      { id: 'docsReceived', prompt: 'Have you received your service documents?', type: 'single', options: ['Yes', 'No', 'Partly'] },
      { id: 'settlementReceived', prompt: 'Have you received the relevant financial settlement (Seva Nidhi etc.)?', type: 'single', options: ['Yes', 'No', 'Partly'] },
      { id: 'contactedUnit', prompt: 'Have you contacted your unit/department?', type: 'single', options: ['Yes', 'No'] },
      { id: 'writtenResponse', prompt: 'Have you received a written response?', type: 'single', options: ['Yes', 'No'], showIf: (ctx) => ctx.qa.contactedUnit === 'Yes' },
    ],
    documents: [
      { id: 'releaseDocs', label: 'Release / discharge documentation' },
      { id: 'serviceCert', label: 'Service certificate', showIf: (ctx) => ctx.qa.docsReceived !== 'Yes' },
      { id: 'settlementRecords', label: 'Financial settlement records (Seva Nidhi etc.)', showIf: (ctx) => ctx.qa.settlementReceived !== 'Yes' },
      { id: 'correspondence', label: 'Correspondence with unit / department', showIf: (ctx) => ctx.qa.contactedUnit === 'Yes' },
      { id: 'medicalDocs', label: 'Medical documents', showIf: (ctx) => ctx.profileData && ctx.profileData.injuryDuringService === 'Yes' },
    ],
  },
  agniveer_injury: {
    questions: [
      { id: 'duringService', prompt: 'Did the injury occur during service?', type: 'single', options: yesNo },
      { id: 'when', prompt: 'When did it occur?', type: 'text', placeholder: 'Approximate date' },
      { id: 'treatedMilitary', prompt: 'Was treatment provided through military medical facilities?', type: 'single', options: ['Yes', 'No', 'Partly'] },
      { id: 'medicalBoard', prompt: 'Was a medical board conducted?', type: 'single', options: yesNo },
      { id: 'disabilityAssessed', prompt: 'Was a disability assessment made?', type: 'single', options: yesNo, showIf: (ctx) => ctx.qa.medicalBoard === 'Yes' },
      { id: 'releasedDueToInjury', prompt: 'Were you released because of the injury?', type: 'single', options: ['Yes', 'No', 'Not yet released'] },
      { id: 'benefitsExplained', prompt: 'Were benefits/compensation explained to you?', type: 'single', options: ['Yes', 'No'] },
      { id: 'writtenRecord', prompt: 'Have you received anything in writing?', type: 'single', options: ['Yes', 'No'] },
    ],
    documents: [
      { id: 'medicalBoardDocs', label: 'Medical board documentation', showIf: (ctx) => ctx.qa.medicalBoard === 'Yes' },
      { id: 'treatmentRecords', label: 'Treatment records' },
      { id: 'releaseDocs', label: 'Release documentation', showIf: (ctx) => ctx.qa.releasedDueToInjury === 'Yes' },
      { id: 'injuryReport', label: 'Injury report' },
      { id: 'correspondence', label: 'Correspondence', showIf: (ctx) => ctx.qa.writtenRecord === 'Yes' },
      { id: 'benefitDecision', label: 'Benefit / claim decision', showIf: (ctx) => ctx.qa.benefitsExplained === 'Yes' },
    ],
  },
  family_welfare: {
    questions: [
      { id: 'whatHappened', prompt: 'What happened?', type: 'text', placeholder: 'Briefly describe the situation' },
      { id: 'whoInvolved', prompt: 'Who is involved?', type: 'text', placeholder: 'e.g. Spouse, sibling, other family member' },
      { id: 'when', prompt: 'When did it happen?', type: 'single', options: timeframeOptions },
      { id: 'writtenNotice', prompt: 'Is there a written notice/order?', type: 'single', options: yesNo },
      { id: 'filed', prompt: 'Has anything already been filed?', type: 'single', options: yesNo },
      { id: 'deadlineHearing', prompt: 'Is there an upcoming deadline/hearing?', type: 'single', options: yesNo },
    ],
    documents: [
      { id: 'noticeOrder', label: 'Notice or order', showIf: (ctx) => ctx.qa.writtenNotice === 'Yes' },
      { id: 'filingPapers', label: 'Filing papers', showIf: (ctx) => ctx.qa.filed === 'Yes' },
      { id: 'correspondence', label: 'Relevant correspondence', defaultChecked: false },
      { id: 'proofOfRelationship', label: 'Proof of relationship', showIf: (ctx) => ctx.profile === 'widow_nok' || ctx.profile === 'family_member' },
    ],
  },
  police_fraud: {
    questions: [
      { id: 'firRegistered', prompt: 'Has an FIR been registered?', type: 'single', options: yesNo },
      { id: 'contactedByPolice', prompt: 'Have you been contacted by police?', type: 'single', options: ['Yes', 'No'] },
      { id: 'arrested', prompt: 'Has anyone been arrested?', type: 'single', options: yesNo },
      { id: 'noticeSummons', prompt: 'Have you received a notice/summons?', type: 'single', options: ['Yes', 'No'] },
      { id: 'deadlineHearing', prompt: 'Is there an upcoming court date?', type: 'single', options: ['Yes', 'No', "I'm not sure"] },
      { id: 'moneyLeft', prompt: 'Did money leave your account?', type: 'single', options: ['Yes', 'No', 'Not applicable'], showIf: (ctx) => ['cyber_fraud', 'financial_fraud', 'impersonation_fraud'].includes(ctx.situation) },
      { id: 'reportedFraud', prompt: 'Have you reported the cyber/financial fraud (1930 / cybercrime.gov.in)?', type: 'single', options: ['Yes', 'No'], showIf: (ctx) => ctx.qa.moneyLeft === 'Yes' },
    ],
    documents: [
      { id: 'firCopy', label: 'FIR copy', showIf: (ctx) => ctx.qa.firRegistered === 'Yes' },
      { id: 'noticeSummons', label: 'Notice / summons', showIf: (ctx) => ctx.qa.noticeSummons === 'Yes' },
      { id: 'transactionProof', label: 'Bank / transaction proof', showIf: (ctx) => ctx.qa.moneyLeft === 'Yes' },
      { id: 'fraudReportAck', label: 'Cyber/financial fraud report acknowledgement', showIf: (ctx) => ctx.qa.reportedFraud === 'Yes' },
      { id: 'correspondence', label: 'Relevant correspondence', defaultChecked: false },
    ],
  },
  property_civil: {
    questions: [
      { id: 'disputeAbout', prompt: 'What is the dispute about?', type: 'text', placeholder: 'Briefly describe the dispute' },
      { id: 'otherParty', prompt: 'Who is the other party?', type: 'text', placeholder: 'e.g. Neighbour, bank, builder' },
      { id: 'hasDocuments', prompt: 'Do you have documents related to this?', type: 'single', options: ['Yes', 'No', 'Some'] },
      { id: 'noticeReceived', prompt: 'Have you received a notice?', type: 'single', options: ['Yes', 'No'] },
      { id: 'caseFiled', prompt: 'Has a case already been filed?', type: 'single', options: yesNo },
      { id: 'deadlineHearing', prompt: 'Is there a hearing/deadline?', type: 'single', options: yesNo },
      { id: 'immediateThreat', prompt: 'Is there an immediate threat to property or possession?', type: 'single', options: ['Yes', 'No'] },
    ],
    documents: [
      { id: 'propertyDocs', label: 'Property / title documents', showIf: (ctx) => ctx.qa.hasDocuments !== 'No' },
      { id: 'notice', label: 'Notice received', showIf: (ctx) => ctx.qa.noticeReceived === 'Yes' },
      { id: 'caseFilingPapers', label: 'Case filing papers', showIf: (ctx) => ctx.qa.caseFiled === 'Yes' },
      { id: 'correspondence', label: 'Relevant correspondence', defaultChecked: false },
    ],
  },
  unknown_freeform: {
    questions: [
      { id: 'whoAbout', prompt: 'Who is this about?', type: 'single', options: ['Me', 'My spouse', 'My parent', 'Another family member', 'Other'] },
      { id: 'when', prompt: 'When did it happen?', type: 'single', options: timeframeOptions },
      { id: 'writtenNotice', prompt: 'Did you receive any notice/order/document?', type: 'single', options: yesNo },
      { id: 'actionTaken', prompt: 'Have you already complained or appealed?', type: 'single', options: ['Yes', 'No'] },
      { id: 'deadlineHearing', prompt: 'Is there a deadline/hearing?', type: 'single', options: yesNo },
    ],
    documents: [
      { id: 'correspondence', label: 'Relevant correspondence / notice', showIf: (ctx) => ctx.qa.writtenNotice === 'Yes' },
      { id: 'actionRecord', label: 'Record of complaint or appeal', showIf: (ctx) => ctx.qa.actionTaken === 'Yes' },
      { id: 'relatedPapers', label: 'Any related papers you have', defaultChecked: false },
    ],
  },
};

export function genCaseRef() {
  return 'VNXT LS ' + Date.now().toString(36).toUpperCase().slice(-6);
}

export function classifyFreeform(text) {
  const t = (text || '').toLowerCase();
  const rules = [
    [/pension|ppo|sparsh|echs|disability/, 'Pension & Veteran Benefits'],
    [/discharge|show.cause|charge sheet|punishment|inquiry|disciplinary/, 'Service & Discharge'],
    [/agniveer|seva nidhi/, 'Agniveer Matters'],
    [/fir|police|arrest|fraud|cyber|threat|summons/, 'Police, Criminal & Fraud'],
    [/land|property|loan|encroachment|possession|neighbour|consumer|contract/, 'Property & Civil Disputes'],
    [/marriage|divorce|maintenance|succession|inheritance|family/, 'Family & Veteran Welfare'],
  ];
  for (const [re, label] of rules) {
    if (re.test(t)) return label;
  }
  return null;
}

export function computeUrgency(state) {
  if (state.urgent) return 'Urgent';
  const qa = state.qa;
  if (qa.deadlineHearing === 'Yes' || qa.moneyLeft === 'Yes') return 'Priority review';
  return 'Standard review';
}

export function recommendRoute(state) {
  if (state.urgent) return 'Urgent assistance';
  const qa = state.qa, cat = state.category;
  if (cat === 'police') {
    if (qa.firRegistered === 'Yes' || qa.arrested === 'Yes' || qa.noticeSummons === 'Yes') return 'Legal professional review';
    return 'Case coordinator review';
  }
  if (cat === 'pension') {
    if (qa.challenged && qa.challenged !== 'No') return 'Legal professional review';
    if (qa.problemType && ['My claim was rejected', 'My disability percentage was disputed'].includes(qa.problemType)) return 'Legal professional review';
    return 'Administrative grievance support';
  }
  if (cat === 'service') {
    if (['Punishment order', 'Discharge order', 'Inquiry report'].includes(qa.received)) return 'Legal professional review';
    return 'Case coordinator review';
  }
  if (cat === 'agniveer') {
    if (qa.medicalBoard === 'Yes' || qa.disabilityAssessed) return 'Case coordinator review';
    return 'Administrative grievance support';
  }
  if (cat === 'property') {
    if (qa.caseFiled === 'Yes' || qa.immediateThreat === 'Yes') return 'Legal professional review';
    return 'Case coordinator review';
  }
  return 'Case coordinator review';
}

export function composeProfileLine(state) {
  const profileLabel = (profiles.find((p) => p.id === state.profile) || {}).label || 'Applicant';
  const pd = state.profileData;
  let extra = '';
  if (state.profile === 'ex_serviceman' && pd.releaseYear) extra = ' · Released ' + pd.releaseYear;
  else if (state.profile === 'agniveer_released' && pd.releaseDate) extra = ' · Released ' + pd.releaseDate;
  else if (state.profile === 'agniveer_serving' && pd.enrolmentDate) extra = ' · Enrolled ' + pd.enrolmentDate;
  else if (state.profile === 'widow_nok' && pd.dateOfDeath) extra = ' · ' + pd.dateOfDeath;
  return `${profileLabel} · ${state.service}${extra}`;
}
