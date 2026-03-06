import { login, newPost } from '../utils/steps';

describe('Test Backend Bunny Media Library', () => {
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
    cy.task('setupBackend', { backend: 'test' });
  });

  beforeEach(() => {
    login();
  });

  it('shows Bunny login prompt when credentials are missing', () => {
    newPost();
    cy.contains('button', 'Choose an image').click();

    cy.contains('h2', 'Bunny.net Media Library').should('be.visible');
    cy.contains('button', 'Login with Bunny').should('be.visible');
  });

  it('lists and inserts Bunny files when credentials exist', () => {
    cy.window().then(win => {
      win.localStorage.setItem('bunny_auth_key', 'storage-zone-password');
      win.localStorage.setItem('bunny_storage_zone_name', 'cmt-docs');
    });

    cy.intercept('GET', 'https://storage.bunnycdn.com/**', {
      statusCode: 200,
      body: bunnyListResponse,
      headers: {
        'content-type': 'application/json',
      },
    }).as('bunnyListFiles');

    newPost();
    cy.contains('button', 'Choose an image').click();

    cy.wait('@bunnyListFiles');
    cy.contains('div', 'kitten.jpg').click();
    cy.contains('button', 'Insert (1)').click();

    cy.get('[id^="image-field"]').should('have.value', 'https://cmt-docs-cdn.b-cdn.net/kitten.jpg');
  });
});
