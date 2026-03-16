import { login, newPost } from '../utils/steps';

describe('Test Backend Bunny Media Library', () => {
  const edgeBaseUrl = 'https://example.supabase.co/functions/v1/bunny';
  const siteId = 'test-site-id';
  const accessToken = 'test-access-token';

  const bunnyListResponse = [
    {
      Guid: '1',
      StorageZoneName: 'cmt-docs',
      Path: '/',
      ObjectName: 'kitten.jpg',
      Length: 1024,
      LastChanged: '2024-01-01T00:00:00Z',
      IsDirectory: false,
      DateCreated: '2024-01-01T00:00:00Z',
      StorageZoneId: 1,
    },
  ];

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
          name: 'bunny',
          config: {
            cdn_url_prefix: 'https://cmt-docs-cdn.b-cdn.net',
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

    cy.contains('h2', 'Bunny.net Media Library').should('be.visible');
    cy.contains('Session token not found. Please log in again.').should('be.visible');
  });

  it('lists and inserts Bunny files through edge proxy when session exists', () => {
    cy.window().then(win => {
      win.localStorage.setItem('decap-cms-user', JSON.stringify({ access_token: accessToken }));
    });

    cy.intercept('GET', '**/functions/v1/bunny*', req => {
      req.reply({
        statusCode: 200,
        body: bunnyListResponse,
        headers: {
          'content-type': 'application/json',
        },
      });
    }).as('bunnyListFiles');

    newPost();
    cy.contains('button', 'Choose an image').click();

    cy.wait('@bunnyListFiles', { timeout: 10000 }).then(interception => {
      expect(interception.request.url).to.include(edgeBaseUrl);
      expect(interception.request.headers.authorization).to.equal(`Bearer ${accessToken}`);
      expect(interception.request.headers['x-site-id']).to.equal(siteId);
    });
    cy.contains('kitten.jpg').click();
    cy.contains('button', 'Insert (1)').should('be.visible').click({ force: true });
    cy.contains('Session token not found. Please log in again.').should('not.exist');
  });
});
