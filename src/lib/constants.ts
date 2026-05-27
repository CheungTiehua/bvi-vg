export const SITE_TITLE = 'BVI.vg';
export const SITE_DESCRIPTION = 'BVI 英属维尔京群岛离岸工具全方位中文指南 —— 家族办公室策略平台';
export const SITE_URL = 'https://bvi.vg';

export const TOPICS = ['spc', 'bc', 'vista', 'ptc'] as const;
export type TopicSlug = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<TopicSlug, string> = {
  spc: '独立投资组合公司（SPC）',
  bc: 'BVI 商业公司（BC）',
  vista: 'VISTA 信托',
  ptc: '私人信托公司（PTC）',
};

export const TOPIC_SHORT: Record<TopicSlug, string> = {
  spc: 'SPC',
  bc: 'BC',
  vista: 'VISTA',
  ptc: 'PTC',
};

export const PHASE2_TOPICS = [
  'bvi-2-0',
  'economic',
  'trust',
  'ipo',
  'regulatory',
  'arbitration',
  'litigation',
  'virc',
  'phoenix',
] as const;

export const PHASE2_LABELS: Record<string, string> = {
  'bvi-2-0': 'BVI 2.0',
  economic: '经济实质法合规',
  trust: '信托综合指南',
  ipo: 'BVI 架构与境外上市',
  regulatory: '监管动态追踪',
  arbitration: 'BVI 国际仲裁',
  litigation: 'BVI 诉讼与争议解决',
  virc: 'VIRRGIN 在线系统',
  phoenix: '凤凰信托',
};