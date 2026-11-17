// Plain-English names for the Open Access TOM measures, so a bid writer can read a line without the TOM handbook.

export interface PlainMeasure {
  name: string;
  explain: string;
  unit: string;
}

const PLAIN: Record<string, PlainMeasure> = {
  NT1: { name: 'Hiring local people', explain: 'People from the local area employed to work on the contract.', unit: 'full-time years' },
  NT3: { name: 'Hiring people out of work for a year or more', explain: 'Counts each person’s first year in the job.', unit: 'people' },
  NT4: { name: 'Hiring young people not in work or education', explain: '16 to 24 year olds who were not in education, employment or training.', unit: 'people' },
  NT76: { name: 'Hiring people who are unemployed', explain: 'Counts each person’s first year in the job.', unit: 'people' },
  NT5: { name: 'Hiring ex-offenders', explain: 'Unemployed people aged 18 or over with a conviction.', unit: 'people' },
  NT6: { name: 'Hiring disabled people', explain: 'Disabled people who were out of work when recruited.', unit: 'people' },
  NT9: { name: 'Accredited training for new staff', explain: 'Recognised qualifications for people newly hired onto the contract.', unit: 'weeks of training' },
  NT10: { name: 'Apprenticeships', explain: 'New apprentices on a recognised scheme, with structured training and a mentor. Counted for each week they are employed.', unit: 'apprentice weeks' },
  NT80: { name: 'Upskilling existing staff', explain: 'Accredited training that gives current employees a recognised qualification.', unit: 'weeks of training' },
  NT11: { name: 'Job support for unemployed people', explain: 'Coaching, CV and interview help that moves people towards work.', unit: 'hours of support' },
  NT12: { name: 'Unpaid work placements', explain: 'Meaningful placements for young people not in work or education.', unit: 'placement weeks' },
  NT13: { name: 'Paid work placements', explain: 'Paid placements of at least six weeks.', unit: 'placement weeks' },
  NT8: { name: 'Volunteering in schools and colleges', explain: 'Staff time spent on careers talks, mentoring and lessons.', unit: 'volunteer hours' },
  NT99: { name: 'Hosting school and community visits', explain: 'Staff time spent showing pupils or residents around workplaces.', unit: 'volunteer hours' },
  NT14: { name: 'Buying from charities and social enterprises', explain: 'Contract spend placed with voluntary and community organisations.', unit: '£ spent' },
  NT18: { name: 'Buying from local businesses', explain: 'Contract spend placed with suppliers in the region.', unit: '£ spent' },
  NT19: { name: 'Buying from local small businesses', explain: 'Contract spend placed with small and medium firms in the region.', unit: '£ spent' },
  NT15: { name: 'Expert advice for charities and small firms', explain: 'Pro bono professional help, such as IT, cyber or data advice.', unit: 'expert hours' },
  NT16: { name: 'Donations to charities', explain: 'Money or equipment given to voluntary and community organisations.', unit: '£ donated' },
  NT17: { name: 'Volunteering for charities', explain: 'Staff time given to voluntary and community organisations.', unit: 'volunteer hours' },
  NT28: { name: 'Donations to local community projects', explain: 'Money given to projects in the local area.', unit: '£ donated' },
  NT29: { name: 'Volunteering on local community projects', explain: 'Staff time given to projects in the local area.', unit: 'volunteer hours' },
  NT26: { name: 'Funding community health and wellbeing', explain: 'Money, time or materials put into local health and wellbeing work.', unit: '£ invested' },
  NT27: { name: 'Funding projects that bring people together', explain: 'Money, time or materials that strengthen local community networks, such as digital inclusion.', unit: '£ invested' },
  NT31: { name: 'Cutting our own carbon emissions', explain: 'Scope 1 and 2 emissions saved on the contract.', unit: 'tonnes CO2e' },
  NT31a: { name: 'Cutting supply-chain carbon emissions', explain: 'Scope 3 emissions saved on the contract.', unit: 'tonnes CO2e' },
  NT32: { name: 'Fewer car miles', explain: 'Miles saved through a green travel programme.', unit: 'miles saved' },
  NT116: { name: 'Helping small suppliers cut carbon', explain: 'Expert support on carbon reduction for SMEs in the supply chain.', unit: '£ invested' },
  NT119: { name: 'Supporting green spaces and nature', explain: 'Money or time put into green spaces, biodiversity or ecosystems.', unit: '£ invested' },
  NT87: { name: 'Using less plastic', explain: 'Plastic removed from delivery of the contract.', unit: 'kg' }
};

export function plainMeasure(code: string, fallbackName: string, fallbackUnit: string): PlainMeasure {
  return PLAIN[code] ?? { name: fallbackName, explain: '', unit: fallbackUnit.replace(/^no\.\s*/i, '') };
}
