export interface PromptTemplatePreset {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  promptText: string;
}

export const PROMPT_PRESETS: PromptTemplatePreset[] = [
  {
    id: 'birmingham',
    title: 'Birmingham City Council',
    subtitle: '£10M contract • 3 years • 10% Social Value',
    category: 'Local Authority',
    promptText:
      'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.'
  },
  {
    id: 'manchester',
    title: 'Greater Manchester Combined Authority',
    subtitle: '£25M contract • 5 years • 15% Social Value',
    category: 'Combined Authority',
    promptText:
      'I need to build a Social Value bid response, for a 5-year contract of £25M with 15% Social Value weighting. The client Greater Manchester Combined Authority in Manchester wants the Social Value offer to address Net Zero & Green Skills, STEM Education and Local Supply Chain spend. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 15% SV, and the impact we can expect to deliver.'
  },
  {
    id: 'nhs',
    title: 'Leeds Teaching Hospitals NHS Trust',
    subtitle: '£5M contract • 2 years • 12% Social Value',
    category: 'Healthcare & NHS',
    promptText:
      'I need to build a Social Value bid response, for a 2-year contract of £5M with 12% Social Value weighting. The client Leeds Teaching Hospitals NHS Trust in Leeds wants the Social Value offer to address Health & Wellbeing, Youth Employment and digital skills in healthcare. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 12% SV, and the impact we can expect to deliver.'
  }
];
