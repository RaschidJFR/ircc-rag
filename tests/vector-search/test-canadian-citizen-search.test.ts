import { it, expect, describe } from 'vitest';
import { vectorSearch } from 'lib/vector-search.mjs';

describe('Vector Search Tests', () => {
  it('should find relevant content for PR card renewal with Canadian spouse abroad', async () => {
    const query = `Hi, I was out of the country for 4years, this whole time I was with my Canadian Husband, now we are back in Canada and I want to renew my PR card.

I know in the website it says, any time spent outside canada with a Canadian husband counts toward residency obligation, —— or does my husband need to be working for a Canadian company? Can someone pls clarify..

Anyone going through the same situation?

What documents should I submit for the application, like proofs of the same residency while out of the country? We stayed in my parents so we don't have leases or anything, we only have mails from banks or we bank statements showing we have the same address during our time in the US.

Should i get lawyer to help with this? (Any recommendations here Toronto Area)`;

    const results = await vectorSearch(query);
    const i = results.findIndex(({ text }) =>
      text.includes('Situation B.')
    );

    expect(i).to.toBeGreaterThan(-1);
  });
});
