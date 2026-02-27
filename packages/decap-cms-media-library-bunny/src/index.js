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

  // Import auth manager at module level
  const { BunnyAuthManager } = await import('./api/authManager');

  // Check for auth params in URL immediately on init
  // This handles the case where Bunny redirects back with credentials
  console.log('[Bunny Init] Checking for auth parameters in URL...');
  const { apiKey: urlApiKey, storageName: urlStorageName } =
    BunnyAuthManager.extractCredentialsFromUrl();
  if (urlApiKey && urlStorageName) {
    console.log('[Bunny Init] Found auth credentials (Account API Key), fetching Storage Zone Password');
    // Store the Account API Key (from OAuth)
    BunnyAuthManager.setStoredAccountApiKey(urlApiKey);
    BunnyAuthManager.setStoredStorageZoneName(urlStorageName);
    
    // Fetch the Storage Zone Password using the Account API Key
    const { BunnyManagementApi } = await import('./api/managementApi');
    try {
      const storageZonePassword = await BunnyManagementApi.fetchStorageZonePassword(
        urlApiKey,
        urlStorageName
      );
      // Store the Storage Zone Password for Storage API
      BunnyAuthManager.setStoredApiKey(storageZonePassword);
      console.log('[Bunny Init] Successfully fetched and stored Storage Zone Password');
    } catch (error) {
      console.error('[Bunny Init] Failed to fetch Storage Zone Password:', error);
      alert(`Failed to fetch storage credentials: ${error.message}\n\nPlease ensure you have access to the storage zone "${urlStorageName}"`);
      return null;
    }

    // Check if we should auto-open the media library
    const shouldAutoOpen = BunnyAuthManager.shouldAutoOpen();
    console.log('[Bunny Init] Should auto-open media library:', shouldAutoOpen);

    // Redirect back to the original page that initiated the auth flow
    const returnUrl = BunnyAuthManager.resolveReturnUrl();
    BunnyAuthManager.cleanAuthParamsFromUrl();
    if (returnUrl) {
      console.log('[Bunny Init] Redirecting to original page:', returnUrl);
      BunnyAuthManager.clearReturnUrl();
      // Use setTimeout to avoid potential race conditions
      setTimeout(() => {
        try {
          const safeUrl = new URL(returnUrl, window.location.origin);
          if (safeUrl.origin === window.location.origin) {
            window.location.replace(safeUrl.toString());
          } else {
            console.warn('[Bunny Init] Return URL origin mismatch, staying on current page');
          }
        } catch (e) {
          console.warn('[Bunny Init] Invalid return URL, staying on current page');
        }
      }, 100);
    } else {
      console.log('[Bunny Init] No return URL found, staying on current page');
      // If there's no return URL but we should auto-open, trigger after delay
      if (shouldAutoOpen) {
        console.log('[Bunny Init] No redirect needed, auto-opening media library');
        BunnyAuthManager.clearAutoOpenFlag();
        setTimeout(() => {
          // Trigger a custom event that the CMS can listen to
          window.dispatchEvent(new CustomEvent('bunny-auth-complete'));
        }, 500);
      }
    }
  }

  if (urlApiKey && !urlStorageName) {
    console.log('[Bunny Init] Account API Key found without storage name, using config zone name');
    // Store the Account API Key (from OAuth)
    BunnyAuthManager.setStoredAccountApiKey(urlApiKey);
    BunnyAuthManager.setStoredStorageZoneName(providedConfig.storage_zone_name);
    
    // Fetch the Storage Zone Password using the Account API Key
    const { BunnyManagementApi } = await import('./api/managementApi');
    try {
      const storageZonePassword = await BunnyManagementApi.fetchStorageZonePassword(
        urlApiKey,
        providedConfig.storage_zone_name
      );
      // Store the Storage Zone Password for Storage API
      BunnyAuthManager.setStoredApiKey(storageZonePassword);
      console.log('[Bunny Init] Successfully fetched and stored Storage Zone Password');
    } catch (error) {
      console.error('[Bunny Init] Failed to fetch Storage Zone Password:', error);
      alert(`Failed to fetch storage credentials: ${error.message}\n\nPlease ensure you have access to the storage zone "${providedConfig.storage_zone_name}"`);
      return null;
    }

    // Check if we should auto-open the media library
    const shouldAutoOpen = BunnyAuthManager.shouldAutoOpen();
    console.log('[Bunny Init] Should auto-open media library:', shouldAutoOpen);

    const returnUrl = BunnyAuthManager.resolveReturnUrl();
    BunnyAuthManager.cleanAuthParamsFromUrl();
    if (returnUrl) {
      console.log('[Bunny Init] Redirecting to original page:', returnUrl);
      BunnyAuthManager.clearReturnUrl();
      setTimeout(() => {
        try {
          const safeUrl = new URL(returnUrl, window.location.origin);
          if (safeUrl.origin === window.location.origin) {
            window.location.replace(safeUrl.toString());
          } else {
            console.warn('[Bunny Init] Return URL origin mismatch, staying on current page');
          }
        } catch (e) {
          console.warn('[Bunny Init] Invalid return URL, staying on current page');
        }
      }, 100);
    } else {
      console.log('[Bunny Init] No return URL found, staying on current page');
      // If there's no return URL but we should auto-open, trigger after delay
      if (shouldAutoOpen) {
        console.log('[Bunny Init] No redirect needed, auto-opening media library');
        BunnyAuthManager.clearAutoOpenFlag();
        setTimeout(() => {
          // Trigger a custom event that the CMS can listen to
          window.dispatchEvent(new CustomEvent('bunny-auth-complete'));
        }, 500);
      }
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

  // Listen for auth completion event to auto-open media library
  window.addEventListener('bunny-auth-complete', () => {
    console.log('[Bunny Init] Auth complete event received, auto-opening media library');
    setTimeout(() => {
      mediaLibraryInstance.show({});
    }, 100);
  });

  // Check if we just completed auth and should auto-open
  // This handles the case where we redirected back to the same page
  if (BunnyAuthManager.shouldAutoOpen() && BunnyAuthManager.getStoredApiKey()) {
    console.log('[Bunny Init] Auto-open flag detected after page load, opening media library');
    BunnyAuthManager.clearAutoOpenFlag();
    // Wait for DOM to be ready
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
