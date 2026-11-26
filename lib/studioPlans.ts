export const studioPlans = {
  'creator-pack': { name: 'Creator Pack', cents: 900, credits: 100 },
  'studio-pack': { name: 'Studio Pack', cents: 3900, credits: 500 },
  'cinema-pack': { name: 'Cinema Pack', cents: 9900, credits: 2000 },
  'starter-monthly': { name: 'Starter Creator Monthly', cents: 1900, credits: 300, interval: 'month' },
  'studio-monthly': { name: 'Studio Pro Monthly', cents: 4900, credits: 1200, interval: 'month' },
  'cinema-monthly': { name: 'Cinema Enterprise Monthly', cents: 14900, credits: 5000, interval: 'month' },
  'starter-yearly': { name: 'Starter Creator Annual', cents: 18000, credits: 3600, interval: 'year' },
  'studio-yearly': { name: 'Studio Pro Annual', cents: 46800, credits: 14400, interval: 'year' },
  'cinema-yearly': { name: 'Cinema Enterprise Annual', cents: 142800, credits: 60000, interval: 'year' },
} satisfies Record<string, { name: string; cents: number; credits: number; interval?: 'month' | 'year' }>;

type StudioPlan = { name: string; cents: number; credits: number; interval?: 'month' | 'year' };

export function studioPlan(id: unknown): StudioPlan | undefined {
  return typeof id === 'string' && Object.hasOwn(studioPlans, id)
    ? studioPlans[id as keyof typeof studioPlans]
    : undefined;
}
