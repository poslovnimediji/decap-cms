/**
 * Decap CMS Media Library Integration for Bunny.net
 * Main entry point that exports the media library interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import BunnyWidget from './components/BunnyWidget';

function readStoredAuthUser() {
  try {
    const stored = window.localStorage.getItem('decap-cms-user');
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    return null;
  }
}

function getBackendConfigFromWindow() {
  if (window.CMS_CONFIG && window.CMS_CONFIG.backend) {
    return window.CMS_CONFIG.backend;
  }
  return null;
}

function buildEdgeBaseUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/functions/v1/bunny`;
}

function createContextResolver(providedConfig, getMediaLibraryContext) {
  return async () => {
    const context = getMediaLibraryContext ? await getMediaLibraryContext() : {};
    const storedAuthUser = readStoredAuthUser() || {};
    const backendConfig = context.backendConfig || getBackendConfigFromWindow() || {};
    const authUser = context.authUser || storedAuthUser;

    const accessToken =
      context.token ||
      authUser.access_token ||
      authUser.token ||
      storedAuthUser.access_token ||
      null;
    const activeSiteId = context.activeSiteId || backendConfig.site_id || null;
    const baseUrl = backendConfig.base_url;

    return {
      accessToken,
      activeSiteId,
      edgeBaseUrl: baseUrl ? buildEdgeBaseUrl(baseUrl) : null,
    };
  };
}

/**
 * Initialize the Bunny.net media library
 * @param options - Configuration options including storageZoneId, cdnUrlPrefix
 * @param handleInsert - Callback function when user inserts files
 * @returns MediaLibraryInstance with show, hide, and other required methods
 */
async function init({ options = {}, handleInsert = () => {}, getMediaLibraryContext } = {}) {
  const { config: providedConfig = {} } = options;

  // Validate required configuration
  if (!providedConfig.cdn_url_prefix) {
    throw new Error('cdn_url_prefix is required in media_library config');
  }

  const resolveRequestContext = createContextResolver(providedConfig, getMediaLibraryContext);

  const config = providedConfig;
  let widgetContainer = null;
  let widgetRoot = null;
  let isOpen = false;

  const mediaLibraryInstance = {
    /**
     * Show the media library widget
     */
    show: ({ allowMultiple = false, imagesOnly = false } = {}) => {
      if (isOpen) return;

      // Create container if it doesn't exist
      if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        document.body.appendChild(widgetContainer);
      }

      isOpen = true;

      // Create React root
      widgetRoot = createRoot(widgetContainer);

      // Render the widget
      widgetRoot.render(
        React.createElement(BunnyWidget, {
          config,
          resolveRequestContext,
          onInsert: insertedValue => {
            handleInsert(insertedValue);
            mediaLibraryInstance.hide();
          },
          onClose: () => {
            mediaLibraryInstance.hide();
          },
          allowMultiple,
          imagesOnly,
        }),
      );
    },

    /**
     * Hide the media library widget
     */
    hide: () => {
      if (!isOpen || !widgetRoot) return;

      isOpen = false;

      // Unmount React component
      widgetRoot.unmount();

      // Remove container from DOM
      if (widgetContainer && widgetContainer.parentNode) {
        widgetContainer.parentNode.removeChild(widgetContainer);
        widgetContainer = null;
        widgetRoot = null;
      }
    },

    /**
     * Handle field clear - currently no-op
     */
    onClearControl: () => {
      // No-op for this implementation
    },

    /**
     * Handle field removal - currently no-op
     */
    onRemoveControl: () => {
      // No-op for this implementation
    },

    /**
     * Enable standalone mode - allows widget to appear in toolbar and field buttons
     */
    enableStandalone: () => true,
  };

  return mediaLibraryInstance;
}

/**
 * Export the media library instance for Decap CMS
 */
const bunnyMediaLibrary = {
  name: 'bunny',
  init,
};

export const DecapCmsMediaLibraryBunny = bunnyMediaLibrary;
export default bunnyMediaLibrary;
