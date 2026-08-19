import { login, newPost } from '../utils/steps';

describe('Test Backend S3 Media Library', () => {
  const edgeBaseUrl = 'https://example.supabase.co/functions/v1/integrations/s3';
  const siteId = 'test-site-id';
  const accessToken = 'test-access-token';

  const s3ListResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Name>cmt-docs</Name>
  <Prefix></Prefix>
  <Delimiter>/</Delimiter>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>kitten.jpg</Key>
    <LastModified>2024-01-01T00:00:00.000Z</LastModified>
    <ETag>"abc123"</ETag>
    <Size>1024</Size>
  </Contents>
</ListBucketResult>`;

  after(() => {
    cy.task('teardownBackend', { backend: 'test' });
  });

  before(() => {
    Cypress.config('defaultCommandTimeout', 4000);
    cy.task('setupBackend', {
      backend: 'test',
      options: {
        backend: {
          base_url: 'https://example.supabase.co',
          site_id: siteId,
        },
        media_library: {
          name: 's3',
          config: {
            public_url_prefix: 'https://cmt-docs.example-cdn.com',
            root_path: '/',
          },
        },
      },
    });
  });

  beforeEach(() => {
    login();
  });

  it('shows an auth error when session token is missing', () => {
    cy.window().then(win => {
      win.localStorage.setItem('decap-cms-user', JSON.stringify({}));
    });

    newPost();
    cy.contains('button', 'Choose an image').click();

    cy.contains('h2', 'S3 Media Library').should('be.visible');
    cy.contains('Session token not found. Please log in again.').should('be.visible');
  });

  it('lists and inserts S3 files through edge proxy when session exists', () => {
    cy.window().then(win => {
      win.localStorage.setItem('decap-cms-user', JSON.stringify({ access_token: accessToken }));
    });

    cy.intercept('GET', '**/functions/v1/integrations/s3*', req => {
      req.reply({
        statusCode: 200,
        body: s3ListResponseXml,
        headers: {
          'content-type': 'application/xml',
        },
      });
    }).as('s3ListFiles');

    newPost();
    cy.contains('button', 'Choose an image').click();

    cy.wait('@s3ListFiles', { timeout: 10000 }).then(interception => {
      expect(interception.request.url).to.include(edgeBaseUrl);
      expect(interception.request.headers.authorization).to.equal(`Bearer ${accessToken}`);
      expect(interception.request.headers['x-site-id']).to.equal(siteId);
    });
    cy.contains('kitten.jpg').click();
    cy.contains('button', 'Insert (1)').should('be.visible').click({ force: true });
    cy.contains('Session token not found. Please log in again.').should('not.exist');
  });
});
