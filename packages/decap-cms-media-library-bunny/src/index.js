/**
 * Decap CMS Media Library Integration for Bunny.net
 * Main entry point that exports the media library interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import BunnyWidget from './components/BunnyWidget';

/**
 * Initialize the Bunny.net media library
 * @param options - Configuration options including storageZoneId, cdnUrlPrefix
 * @param handleInsert - Callback function when user inserts files
 * @returns MediaLibraryInstance with show, hide, and other required methods
 */
async function init({ options = {}, handleInsert = () => {} } = {}) {
  const { config: providedConfig = {} } = options;

  // Validate required configuration
  if (!providedConfig.storage_zone_name) {
    throw new Error('storage_zone_name is required in media_library config');
  }
  if (!providedConfig.cdn_url_prefix) {
    throw new Error('cdn_url_prefix is required in media_library config');
  }

  const { BunnyAuthManager } = await import('./api/authManager');

  function safelyRedirectToReturnUrl(returnUrl) {
    try {
      const safeUrl = new URL(returnUrl, window.location.origin);
      if (safeUrl.origin === window.location.origin) {
        window.location.replace(safeUrl.toString());
      }
    } catch {
      // keep current page when returnUrl is invalid
    }
  }

  async function processAuthCallback(accountApiKey, zoneName) {
    BunnyAuthManager.setStoredAccountApiKey(accountApiKey);
    BunnyAuthManager.setStoredStorageZoneName(zoneName);

    const { BunnyManagementApi } = await import('./api/managementApi');
    const storageZonePassword = await BunnyManagementApi.fetchStorageZonePassword(
      accountApiKey,
      zoneName,
    );
    BunnyAuthManager.setStoredApiKey(storageZonePassword);

    const shouldAutoOpen = BunnyAuthManager.shouldAutoOpen();
    const returnUrl = BunnyAuthManager.resolveReturnUrl();
    BunnyAuthManager.cleanAuthParamsFromUrl();

    if (returnUrl) {
      BunnyAuthManager.clearReturnUrl();
      setTimeout(() => safelyRedirectToReturnUrl(returnUrl), 100);
      return;
    }

    if (shouldAutoOpen) {
      BunnyAuthManager.clearAutoOpenFlag();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('bunny-auth-complete'));
      }, 500);
    }
  }

  const { apiKey: urlApiKey, storageName: urlStorageName } =
    BunnyAuthManager.extractCredentialsFromUrl();

  if (urlApiKey) {
    const storageZoneName = urlStorageName || providedConfig.storage_zone_name;

    try {
      await processAuthCallback(urlApiKey, storageZoneName);
    } catch (error) {
      alert(
        `Failed to fetch storage credentials: ${error.message}\n\nPlease ensure you have access to the storage zone "${storageZoneName}"`,
      );
      return null;
    }
  }

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

  window.addEventListener('bunny-auth-complete', () => {
    setTimeout(() => {
      mediaLibraryInstance.show({});
    }, 100);
  });

  if (BunnyAuthManager.shouldAutoOpen() && BunnyAuthManager.getStoredApiKey()) {
    BunnyAuthManager.clearAutoOpenFlag();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          mediaLibraryInstance.show({});
        }, 500);
      });
    } else {
      setTimeout(() => {
        mediaLibraryInstance.show({});
      }, 500);
    }
  }

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
