
import { describe, it, expect } from 'vitest';
import { runRedaction } from '../src/services/redactionEngine';
import { RedactionCategory } from '../src/types';

// The text provided by the CTO for the stress test
const CONTRACT_TEXT = `PROFESSIONAL SERVICES AGREEMENT

[CONTRACT_NUMBER_1]
Effective Date: [DATE_1]

This Professional Services Agreement ("Agreement") is entered into by and between:

CLIENT:
TechVenture Solutions Inc.
A Delaware Corporation
EIN: 12-3456789
Address: 2847 Innovation Drive, Suite 500, San Francisco, CA 94107
Michael J. Richardson, Chief Executive Officer

AND

CONSULTANT:
DataPro Analytics LLC
A California Limited Liability Company
EIN: 98-7654321
Address: 1250 Market Street, Floor 12, San Francisco, CA 94102
Sarah E. Thompson, Managing Partner

Collectively referred to as the "Parties."

RECITALS

WHEREAS, Client desires to engage Consultant to provide professional consulting services
in the areas of data analytics, business intelligence, and digital transformation; and

WHEREAS, Consultant possesses the expertise and resources necessary to perform such services;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree:

1. SCOPE OF SERVICES

1.1 Consultant shall provide the following services:
    (a) Comprehensive audit of Client's existing data infrastructure
    (b) Development of custom analytics dashboards and reporting tools
    (c) Implementation of predictive analytics models for sales forecasting
    (d) Training sessions for Client's analytics team (up to 15 employees)
    (e) Ongoing support and maintenance for 90 days post-implementation

1.2 Jennifer M. Williams, Senior Data Scientist
    Email: jennifer.williams@dataproanalytics.com
    Phone: (555) 123-4567
    Mobile: (555) 987-6543

1.3 Client Project David A. Chen, VP of Operations
    Email: david.chen@techventuresolutions.com
    Phone: (415) 555-0101
    Mobile: (415) 555-0102

2. COMPENSATION AND PAYMENT TERMS

2.1 Total Contract Value: $175,000.00 (One Hundred Seventy-Five Thousand US Dollars)

2.2 Payment Schedule:
    - Initial Deposit: $52,500.00 (30%) due upon execution of this Agreement
    - Milestone 1 Payment: $43,750.00 (25%) due upon completion of Phase 1
    - Milestone 2 Payment: $43,750.00 (25%) due upon completion of Phase 2
    - Final Payment: $35,000.00 (20%) due upon project acceptance

2.3 Wire Transfer Instructions:
    Bank: Silicon Valley Bank
    Account Name: DataPro Analytics LLC
    Account Number: 1234567890
    Routing Number: 121000358
    SWIFT Code: SVBKUS6S

2.4 Credit Card payments accepted via:
    Card on file: VISA ending in 4829
    Cardholder: Sarah E. Thompson
    Billing Address: 1250 Market Street, Floor 12, San Francisco, CA 94102

3. PROJECT TIMELINE

3.1 Project Duration: January 20, 2026 through June 30, 2026

3.2 Key Milestones:
    - Phase 1 (Discovery & Audit): January 20 - February 15, 2026
    - Phase 2 (Development): March 1 - April 30, 2026
    - Phase 3 (Implementation): May 1 - May 31, 2026
    - Phase 4 (Training & Handover): June 1 - June 30, 2026

4. CONFIDENTIALITY

4.1 Both Parties acknowledge that during the performance of this Agreement, they may
have access to confidential information including but not limited to:
    - Customer databases and personal information
    - Financial records and projections
    - Proprietary algorithms and source code
    - Employee records including SSN: XXX-XX-XXXX format data
    - Trade secrets and business strategies

4.2 The receiving Party shall maintain the confidentiality of such information for a
period of five (5) years following termination of this Agreement.

5. KEY PERSONNEL

Client Team:
- Michael J. Richardson, CEO (DOB: 1980-05-15)
  SSN: 123-45-6789 (for background check purposes only)
  Email: m.richardson@techventuresolutions.com

- David A. Chen, VP Operations
  Employee ID: TVC-2019-0234
  Email: david.chen@techventuresolutions.com

- Lisa Marie Anderson, Data Analytics Manager
  Employee ID: TVC-2021-0892
  Phone: (415) 555-0199
  Email: l.anderson@techventuresolutions.com

Consultant Team:
- Sarah E. Thompson, Managing Partner
  CA Driver License: B1234567
  Email: sarah.thompson@dataproanalytics.com

- Jennifer M. Williams, Senior Data Scientist
  Email: jennifer.williams@dataproanalytics.com
  LinkedIn: linkedin.com/in/jenniferwilliamsdata

- Robert James Martinez, Technical Lead
  Phone: (555) 123-9999
  Email: r.martinez@dataproanalytics.com

6. INSURANCE AND LIABILITY

6.1 Consultant maintains the following insurance coverage:
    - Professional Liability: $2,000,000 per occurrence
    - General Liability: $1,000,000 per occurrence
    - Cyber Liability: $5,000,000 aggregate
    Policy Number: POL-9988776655
    Carrier: Travelers Insurance

7. GOVERNING LAW AND DISPUTE RESOLUTION

7.1 This Agreement shall be governed by the laws of the State of California.

7.2 Any disputes shall be resolved through binding arbitration in San Francisco, CA,
in accordance with the rules of the American Arbitration Association.

8. CONTACT INFORMATION

CLIENT:
TechVenture Solutions Inc.
2847 Innovation Drive, Suite 500
San Francisco, CA 94107
Phone: (415) 555-0100
Fax: (415) 555-0101
Email: info@techventuresolutions.com
Website: www.techventuresolutions.com

Primary Contact: Michael J. Richardson
Direct Line: (415) 555-0105
Mobile: (415) 555-0106
Personal Email: mjr_sf@gmail.com

CONSULTANT:
DataPro Analytics LLC
1250 Market Street, Floor 12
San Francisco, CA 94102
Phone: (555) 123-4000
Fax: (555) 123-4001
Email: contact@dataproanalytics.com
Website: www.dataproanalytics.com

Primary Contact: Sarah E. Thompson
Direct Line: (555) 123-4005
Mobile: (555) 123-4006
Personal Email: sarah.thompson85@yahoo.com

9. SIGNATURES

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first
written above.


CLIENT: TechVenture Solutions Inc.


By: _________________________________
    Michael Jonathan Richardson
    Chief Executive Officer
    Date: _____________________________


CONSULTANT: DataPro Analytics LLC


By: _________________________________
    Sarah Elizabeth Thompson
    Managing Partner
    Date: _____________________________


WITNESSED BY:

_________________________________
Jessica Lee Parker: Corporate Secretary, TechVenture Solutions Inc.
Date: _____________________________
`;

describe('Stress Test: Professional Services Agreement', () => {
  it('should detect and redact consistent PII across the document', async () => {
    const matches = await runRedaction(CONTRACT_TEXT, []);

    // Sort matches by start index for easier reading of what was caught
    const sortedMatches = matches.sort((a, b) => a.start - b.start);

    // Helper to check if a specific string is redacted
    const isRedacted = (text: string) => {
      // It is redacted if there is a match that covers this text's position
      const index = CONTRACT_TEXT.indexOf(text);
      if (index === -1) return true; // Text not found (maybe already replaced if we were operating on string)

      // Look for a match that overlaps with this text
      return sortedMatches.some(m =>
        m.start <= index && m.end >= index + text.length
      );
    };

    // 1. Check Emails (Should be easy)
    expect(isRedacted('jennifer.williams@dataproanalytics.com')).toBe(true);
    expect(isRedacted('mjr_sf@gmail.com')).toBe(true);

    // 2. Check Phones (Should be easy)
    expect(isRedacted('(415) 555-0100')).toBe(true);

    // 3. Check Consistency - NAMES (The hard part)
    // "Sarah E. Thompson" appears multiple times.
    // It might be caught in header (Context: "Managing Partner")
    // But missed in signatures or footer?
    const sarahInstances = [...CONTRACT_TEXT.matchAll(/Sarah E\. Thompson/g)];
    const sarahRedactions = matches.filter(m => m.text.includes('Sarah E. Thompson'));

    // We want to see if ALL instances are covered.
    console.log(`Sarah E. Thompson instances: ${sarahInstances.length}`);
    console.log(`Sarah E. Thompson redactions: ${sarahRedactions.length}`);

    // Expect at least one direct detection to trigger the consistency loop
    // And expect ALL instances to be covered effectively
    expect(isRedacted('Sarah E. Thompson')).toBe(true);

    // Check specific instances
    // 1. Header
    expect(isRedacted('Michael J. Richardson')).toBe(true);
    // 2. Signature
    expect(isRedacted('Sarah Elizabeth Thompson')).toBe(true);

    // 4. Check Consistency - COMPANIES
    expect(isRedacted('TechVenture Solutions Inc.')).toBe(true);

    // 5. Check URLs (Likely missing)
    expect(isRedacted('www.techventuresolutions.com')).toBe(true);
    // FAIL CASE: Raw domain
    expect(isRedacted('linkedin.com/in/jenniferwilliamsdata')).toBe(true);

    // 6. Check Employee IDs
    expect(isRedacted('TVC-2019-0234')).toBe(true);

    // 7. Check Complex Titles (FAIL CASES)
    // Lisa Marie Anderson, Data Analytics Manager
    expect(isRedacted('Lisa Marie Anderson')).toBe(true);
    // Robert James Martinez, Technical Lead
    expect(isRedacted('Robert James Martinez')).toBe(true);

    // 8. Check Block Addresses (FAIL CASES)
    // 2847 Innovation Drive
    expect(isRedacted('2847 Innovation Drive')).toBe(true);
  });

  it('should assign the same ID to the same person even with different prefixes', async () => {
    const text = `
      Represented by: John Doe
      And later simply John Doe appears.
    `;
    const matches = await runRedaction(text, []);

    console.log('DEBUG MATCHES:', matches.map(m => ({ text: m.text, cleanText: m.cleanText, category: m.category })));

    const redactedText = matches.reduce((acc, m) => {
      // Simple replacement simulation
      return acc.replace(m.text, m.replacementTag || '');
    }, text);

    const johnMatches = matches.filter(m => m.text.includes('John Doe'));
    expect(johnMatches.length).toBe(2);

    // Check if they have the same replacement tag
    const tag1 = johnMatches[0].replacementTag;
    const tag2 = johnMatches[1].replacementTag;
    expect(tag1).toBe(tag2);
  });

  it('should NOT redact generic words like Analytics or Insurance individually', async () => {
    const text = `
      DataPro Analytics LLC is a great company.
      We provide advanced analytics and insurance solutions.
      Chubb Insurance Company is also here.
    `;
    const matches = await runRedaction(text, []);

    // "DataPro Analytics LLC" should be redacted
    const companyMatches = matches.filter(m => m.category === RedactionCategory.COMPANY);
    expect(companyMatches.length).toBeGreaterThanOrEqual(2);

    // "analytics" (lowercase) or "insurance" (lowercase) in the sentence should NOT be redacted
    const genericAnalytics = matches.find(m => m.start === text.indexOf('analytics'));
    expect(genericAnalytics).toBeUndefined();

    const genericInsurance = matches.find(m => m.start === text.indexOf('insurance'));
    expect(genericInsurance).toBeUndefined();
  });
});
